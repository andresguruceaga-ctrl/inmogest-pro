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

    // Build date filter for expenses
    const expenseDateFilter: any = {}
    if (startDate && endDate) {
      expenseDateFilter.gte = new Date(startDate)
      expenseDateFilter.lte = new Date(endDate)
    }

    // Fetch all data in parallel
    const [properties, expenses, tickets, ownerBalances] = await Promise.all([
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
        orderBy: { title: 'asc' }
      }),

      // Expenses
      prisma.expense.findMany({
        where: startDate && endDate ? { expenseDate: expenseDateFilter } : {},
        include: {
          property: {
            select: { id: true, title: true }
          }
        },
        orderBy: { expenseDate: 'desc' }
      }),

      // Tickets
      prisma.supportTicket.findMany({
        include: {
          property: {
            select: { id: true, title: true }
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
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const openTickets = tickets.filter(t => t.status === 'ABIERTO' || t.status === 'EN_PROCESO').length

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
        name: p.title,
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
      expenses: expenses.map(e => ({
        id: e.id,
        description: e.description || e.title,
        amount: e.amount,
        date: e.expenseDate.toISOString(),
        category: e.category,
        property: e.property ? { name: e.property.title } : undefined,
        paidByAdmin: e.paidByAdmin || false,
        reimbursedByOwner: e.reimbursedByOwner || false,
        reimbursedAt: e.reimbursedAt?.toISOString()
      })),
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.id.slice(-6).toUpperCase(),
        subject: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        property: t.property ? { name: t.property.title } : undefined,
        user: t.user ? { name: t.user.name, email: t.user.email } : undefined
      })),
      ownerBalances: ownerBalances,
      summary: {
        totalProperties: properties.length,
        totalIncome: 0,
        totalExpenses,
        netIncome: -totalExpenses,
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
      propertiesAsOwner: {
        select: {
          id: true,
          title: true
        }
      }
    }
  })

  const propertyIds = owners.flatMap(o => o.propertiesAsOwner.map(p => p.id))

  // Get pending expenses (paid by admin, not reimbursed) for all properties
  const pendingExpenses = await prisma.expense.findMany({
    where: {
      propertyId: { in: propertyIds },
      paidByAdmin: true,
      reimbursedByOwner: false
    },
    include: {
      property: {
        select: {
          id: true,
          title: true
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
        select: {
          id: true,
          title: true
        }
      }
    }
  })

  // Get all owner payments
  const ownerPayments = await prisma.ownerPayment.findMany({
    orderBy: { paymentDate: 'desc' }
  })

  // Build balance for each owner
  return owners.map(owner => {
    const ownerPropertyIds = owner.propertiesAsOwner.map(p => p.id)

    const ownerPendingExpenses = pendingExpenses
      .filter(e => ownerPropertyIds.includes(e.propertyId))
      .map(e => ({
        id: e.id,
        description: e.description || e.title,
        amount: e.amount,
        date: e.expenseDate.toISOString(),
        category: e.category,
        paidByAdmin: true,
        reimbursedByOwner: false,
        property: e.property ? { name: e.property.title } : undefined
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
        owner: { name: owner.name || 'Sin nombre', email: owner.email }
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
