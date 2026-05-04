import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get owner balances BY PROPERTY
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

    // Get all properties with owner info
    const properties = await prisma.property.findMany({
      where: {
        owner: {
          role: 'PROPIETARIO',
          ...(effectiveOwnerId ? { id: effectiveOwnerId } : {})
        }
      },
      select: {
        id: true,
        title: true,
        address: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    const propertyIds = properties.map(p => p.id)

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

    // Get all owner payments
    const ownerPayments = await prisma.ownerPayment.findMany({
      where: effectiveOwnerId ? { ownerId: effectiveOwnerId } : {},
      orderBy: { paymentDate: 'desc' }
    })

    // Build balance for each PROPERTY
    const propertiesData = properties.map(property => {
      // Pending expenses for this property
      const propertyPendingExpenses = pendingExpenses
        .filter(e => e.propertyId === property.id)
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

      // Owner payments for this property
      const propertyOwnerPayments = ownerPayments
        .filter(p => p.propertyId === property.id || (!p.propertyId && p.ownerId === property.owner.id))
        .map(p => ({
          id: p.id,
          amount: p.amount,
          date: p.paymentDate.toISOString(),
          method: p.paymentMethod,
          reference: p.referenceNumber,
          notes: p.notes
        }))

      // Calculate totals for this property
      const pending = propertyPendingExpenses.reduce((sum, e) => sum + e.amount, 0)
      const payments = propertyOwnerPayments.reduce((sum, p) => sum + p.amount, 0)

      return {
        property: {
          id: property.id,
          title: property.title,
          address: property.address
        },
        owner: property.owner,
        pendingExpenses: propertyPendingExpenses,
        ownerPayments: propertyOwnerPayments,
        totals: {
          pending,
          payments,
          balance: payments - pending
        }
      }
    }).filter(pData => pData.pendingExpenses.length > 0 || pData.ownerPayments.length > 0)

    // Calculate overall totals (sin duplicar pagos)
    const uniquePayments = new Map<string, typeof ownerPayments[0]>()
    ownerPayments.forEach(p => {
      if (!uniquePayments.has(p.id)) {
        uniquePayments.set(p.id, p)
      }
    })

    const totals = {
      totalPending: propertiesData.reduce((sum, p) => sum + p.totals.pending, 0),
      totalPayments: Array.from(uniquePayments.values()).reduce((sum, p) => sum + p.amount, 0),
    }
    totals.totalBalance = totals.totalPayments - totals.totalPending

    return NextResponse.json({
      success: true,
      data: {
        properties: propertiesData,
        totals
      }
    })
  } catch (error) {
    console.error('Error fetching owner balances:', error)
    return NextResponse.json({ error: 'Error al obtener balances' }, { status: 500 })
  }
}
