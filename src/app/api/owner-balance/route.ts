import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get owner balances
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('ownerId')
    
    // Si es propietario, solo puede ver sus propios datos
    const effectiveOwnerId = session.user.role === 'PROPIETARIO' 
      ? session.user.id 
      : ownerId

    // Get all owners with their properties
    const owners = await prisma.user.findMany({
      where: {
        role: 'PROPIETARIO',
        ...(effectiveOwnerId ? { id: effectiveOwnerId } : {})
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

    // Get pending expenses (paid by admin, not reimbursed)
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
      where: effectiveOwnerId ? { ownerId: effectiveOwnerId } : {},
      orderBy: { paymentDate: 'desc' }
    })

    // Build balance for each owner
    const ownersData = owners.map(owner => {
      const ownerPropertyIds = owner.propertiesAsOwner.map(p => p.id)

      // Pending expenses for this owner
      const ownerPendingExpenses = pendingExpenses
        .filter(e => ownerPropertyIds.includes(e.propertyId))
        .map(e => ({
          id: e.id,
          description: e.description || e.title,
          amount: e.amount,
          date: e.expenseDate.toISOString(),
          category: e.category,
          property: {
            id: e.propertyId,
            title: e.property?.title || 'N/A'
          }
        }))

      // Reimbursed expenses for this owner
      const ownerReimbursedExpenses = reimbursedExpenses
        .filter(e => ownerPropertyIds.includes(e.propertyId))
        .map(e => ({
          id: e.id,
          description: e.description || e.title,
          amount: e.amount,
          date: e.expenseDate.toISOString(),
          category: e.category,
          property: {
            id: e.propertyId,
            title: e.property?.title || 'N/A'
          },
          reimbursedAt: e.reimbursedAt?.toISOString() || null
        }))

      // Owner payments
      const ownerPaymentsList = ownerPayments
        .filter(p => p.ownerId === owner.id)
        .map(p => ({
          id: p.id,
          amount: p.amount,
          date: p.paymentDate.toISOString(),
          method: p.paymentMethod,
          reference: p.referenceNumber,
          notes: p.notes
        }))

      // Calculate totals
      const pending = ownerPendingExpenses.reduce((sum, e) => sum + e.amount, 0)
      const reimbursed = ownerReimbursedExpenses.reduce((sum, e) => sum + e.amount, 0)
      const payments = ownerPaymentsList.reduce((sum, p) => sum + p.amount, 0)

      // Balance = payments - pending (positive = owner has credit, negative = owner owes)
      const balance = payments - pending

      return {
        owner: {
          id: owner.id,
          name: owner.name || 'Sin nombre',
          email: owner.email,
          phone: owner.phone,
          propertiesCount: owner.propertiesAsOwner.length
        },
        pendingExpenses: ownerPendingExpenses,
        reimbursedExpenses: ownerReimbursedExpenses,
        ownerPayments: ownerPaymentsList,
        totals: {
          pending,
          reimbursed,
          payments,
          balance
        }
      }
    }).filter(ob => ob.pendingExpenses.length > 0 || ob.ownerPayments.length > 0 || ob.totals.reimbursed > 0)

    // Calculate overall totals
    const totals = {
      totalPending: ownersData.reduce((sum, o) => sum + o.totals.pending, 0),
      totalReimbursed: ownersData.reduce((sum, o) => sum + o.totals.reimbursed, 0),
      totalPayments: ownersData.reduce((sum, o) => sum + o.totals.payments, 0),
      totalBalance: ownersData.reduce((sum, o) => sum + o.totals.balance, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        owners: ownersData,
        totals
      }
    })
  } catch (error) {
    console.error('Error fetching owner balances:', error)
    return NextResponse.json({ error: 'Error al obtener balances' }, { status: 500 })
  }
}
