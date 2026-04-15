import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateReportPDF } from '@/lib/pdf-utils'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format_type = searchParams.get('format') || 'json'

    // Build date filter
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate)
      dateFilter.lte = new Date(endDate)
    }

    // Fetch all data in parallel
    const [properties, incomes, expenses, tickets, ownerBalances] = await Promise.all([
      // Properties
      prisma.property.findMany({
        include: {
          owner: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          tenant: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      
      // Incomes
      prisma.income.findMany({
        where: startDate && endDate ? { date: dateFilter } : {},
        include: {
          property: {
            select: { name: true }
          }
        },
        orderBy: { date: 'desc' }
      }),
      
      // Expenses
      prisma.expense.findMany({
        where: startDate && endDate ? { date: dateFilter } : {},
        include: {
          property: {
            select: { name: true }
          }
        },
        orderBy: { date: 'desc' }
      }),
      
      // Tickets
      prisma.ticket.findMany({
        include: {
          property: {
            select: { name: true }
          },
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Owner balances data
      getOwnerBalances()
    ])

    // Calculate summary
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0)
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length
    
    // Calculate owner balance summary
    const totalPendingExpenses = ownerBalances.reduce((sum, ob) => sum + ob.totalPending, 0)
    const totalOwnerPayments = ownerBalances.reduce((sum, ob) => sum + ob.totalPayments, 0)
    const totalOwnerBalance = ownerBalances.reduce((sum, ob) => sum + ob.balance, 0)

    const reportData = {
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.name || session.user.email || 'Sistema',
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      properties: properties.map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        propertyType: p.propertyType,
        status: p.status,
        owner: p.owner ? {
          name: p.owner.name,
          email: p.owner.email,
          phone: p.owner.phone || undefined
        } : undefined,
        tenant: p.tenant ? {
          name: p.tenant.name,
          email: p.tenant.email,
          phone: p.tenant.phone || undefined
        } : undefined
      })),
      incomes: incomes.map(i => ({
        id: i.id,
        description: i.description,
        amount: i.amount,
        date: i.date.toISOString(),
        category: i.category,
        property: i.property ? { name: i.property.name } : undefined
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date.toISOString(),
        category: e.category,
        property: e.property ? { name: e.property.name } : undefined,
        paidByAdmin: e.paidByAdmin || false,
        reimbursedByOwner: e.reimbursedByOwner || false,
        reimbursedAt: e.reimbursedAt?.toISOString()
      })),
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        property: t.property ? { name: t.property.name } : undefined,
        user: t.user ? { name: t.user.name, email: t.user.email } : undefined
      })),
      ownerBalances: ownerBalances,
      summary: {
        totalProperties: properties.length,
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        totalTickets: tickets.length,
        openTickets,
        totalPendingExpenses,
        totalOwnerPayments,
        totalOwnerBalance
      }
    }

    if (format_type === 'pdf') {
      const pdfBuffer = await generateReportPDF(reportData)
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="reporte-inmogest-${format(new Date(), 'yyyy-MM-dd')}.pdf"`
        }
      })
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Error al generar el reporte' }, { status: 500 })
  }
}

// Helper function to get owner balances
async function getOwnerBalances() {
  // Get all owners with their properties
  const owners = await prisma.user.findMany({
    where: {
      role: 'PROPIETARIO'
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      properties: {
        select: {
          id: true
        }
      }
    }
  })

  const propertyIds = owners.flatMap(o => o.properties.map(p => p.id))

  // Get pending expenses (paid by admin, not reimbursed) for all properties
  const pendingExpenses = await prisma.expense.findMany({
    where: {
      propertyId: { in: propertyIds },
      paidByAdmin: true,
      reimbursedByOwner: false
    },
    include: {
      property: {
        include: {
          owner: {
            select: { id: true }
          }
        }
      }
    }
  })

  // Get reimbursed expenses
  const reimbursedExpenses = await prisma.expense.findMany({
    where: {
      propertyId: { in: propertyIds },
      paidByAdmin: true,
      reimbursedByOwner: true
    },
    include: {
      property: {
        include: {
          owner: {
            select: { id: true }
          }
        }
      }
    }
  })

  // Get all owner payments
  const ownerPayments = await prisma.ownerPayment.findMany({
    include: {
      owner: {
        select: { id: true }
      }
    },
    orderBy: { paymentDate: 'desc' }
  })

  // Build balance for each owner
  return owners.map(owner => {
    const ownerPropertyIds = owner.properties.map(p => p.id)
    
    const ownerPendingExpenses = pendingExpenses
      .filter(e => ownerPropertyIds.includes(e.propertyId))
      .map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date.toISOString(),
        category: e.category,
        paidByAdmin: true,
        reimbursedByOwner: false,
        property: e.property ? { name: e.property.name } : undefined
      }))
    
    const totalPending = ownerPendingExpenses.reduce((sum, e) => sum + e.amount, 0)
    
    const ownerReimbursed = reimbursedExpenses.filter(e => ownerPropertyIds.includes(e.propertyId))
    const totalReimbursed = ownerReimbursed.reduce((sum, e) => sum + e.amount, 0)
    
    const ownerPaymentsList = ownerPayments
      .filter(p => p.ownerId === owner.id)
      .map(p => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate.toISOString(),
        paymentMethod: p.paymentMethod || undefined,
        referenceNumber: p.referenceNumber || undefined,
        notes: p.notes || undefined,
        owner: { name: owner.name, email: owner.email }
      }))
    
    const totalPayments = ownerPaymentsList.reduce((sum, p) => sum + p.amount, 0)
    
    // Balance = payments - pending (positive = owner has credit, negative = owner owes)
    const balance = totalPayments - totalPending

    return {
      ownerId: owner.id,
      ownerName: owner.name || 'Sin nombre',
      ownerEmail: owner.email,
      ownerPhone: owner.phone || undefined,
      pendingExpenses: ownerPendingExpenses,
      totalPending,
      totalReimbursed,
      ownerPayments: ownerPaymentsList,
      totalPayments,
      balance
    }
  }).filter(ob => ob.pendingExpenses.length > 0 || ob.ownerPayments.length > 0 || ob.totalReimbursed > 0)
}
