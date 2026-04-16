import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths } from 'date-fns'

// GET /api/reports - Obtener datos para reportes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const ownerId = searchParams.get('ownerId')

    // Si es propietario, solo puede ver sus propios datos
    const effectiveOwnerId = session.user.role === 'PROPIETARIO' 
      ? session.user.id 
      : ownerId

    switch (type) {
      case 'summary':
        return await getSummaryReport(startDate, endDate)
      case 'occupancy':
        return await getOccupancyReport(startDate, endDate)
      case 'income':
        return await getIncomeReport(startDate, endDate, effectiveOwnerId)
      case 'expenses':
        return await getExpensesReport(startDate, endDate, effectiveOwnerId)
      case 'owner-balances':
        return await getOwnerBalances(effectiveOwnerId)
      case 'collections':
        return await getCollectionsReport(startDate, endDate, effectiveOwnerId)
      default:
        return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error en reportes:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    )
  }
}

async function getSummaryReport(startDate?: string | null, endDate?: string | null) {
  const start = startDate ? new Date(startDate) : startOfMonth(new Date())
  const end = endDate ? new Date(endDate) : endOfMonth(new Date())

  const [
    totalProperties,
    activeContracts,
    totalTenants,
    totalOwners,
    monthlyIncome,
    monthlyExpenses,
    pendingInvoices
  ] = await Promise.all([
    prisma.property.count(),
    prisma.contract.count({ where: { status: 'ACTIVE' } }),
    prisma.tenant.count(),
    prisma.owner.count(),
    prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paidDate: { gte: start, lte: end }
      },
      _sum: { total: true }
    }),
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: start, lte: end }
      },
      _sum: { amount: true }
    }),
    prisma.invoice.count({
      where: { status: { in: ['PENDING', 'OVERDUE'] } }
    })
  ])

  return NextResponse.json({
    totalProperties,
    activeContracts,
    totalTenants,
    totalOwners,
    monthlyIncome: monthlyIncome._sum.total || 0,
    monthlyExpenses: monthlyExpenses._sum.amount || 0,
    pendingInvoices,
    netIncome: (monthlyIncome._sum.total || 0) - (monthlyExpenses._sum.amount || 0)
  })
}

async function getOccupancyReport(startDate?: string | null, endDate?: string | null) {
  const properties = await prisma.property.findMany({
    include: {
      contracts: {
        where: { status: 'ACTIVE' }
      }
    }
  })

  const totalUnits = properties.length
  const occupiedUnits = properties.filter(p => p.contracts.length > 0).length
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

  return NextResponse.json({
    totalUnits,
    occupiedUnits,
    vacantUnits: totalUnits - occupiedUnits,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
    properties: properties.map(p => ({
      id: p.id,
      title: p.title,
      address: p.address,
      isOccupied: p.contracts.length > 0,
      tenant: p.contracts[0]?.tenantId || null
    }))
  })
}

async function getIncomeReport(
  startDate?: string | null, 
  endDate?: string | null,
  ownerId?: string | null
) {
  const start = startDate ? new Date(startDate) : startOfYear(new Date())
  const end = endDate ? new Date(endDate) : endOfYear(new Date())

  const whereClause: any = {
    status: 'PAID',
    paidDate: { gte: start, lte: end }
  }

  if (ownerId) {
    whereClause.contract = {
      property: {
        ownerId: ownerId
      }
    }
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      contract: {
        include: {
          property: true,
          tenant: true
        }
      }
    },
    orderBy: { paidDate: 'asc' }
  })

  // Agrupar por mes
  const monthlyData: Record<string, { month: string; total: number; count: number }> = {}
  
  invoices.forEach(invoice => {
    if (invoice.paidDate) {
      const monthKey = format(invoice.paidDate, 'yyyy-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, total: 0, count: 0 }
      }
      monthlyData[monthKey].total += invoice.total.toNumber()
      monthlyData[monthKey].count++
    }
  })

  return NextResponse.json({
    totalIncome: invoices.reduce((sum, inv) => sum + inv.total.toNumber(), 0),
    invoicesPaid: invoices.length,
    monthlyBreakdown: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
    invoices: invoices.map(inv => ({
      id: inv.id,
      amount: inv.total,
      date: inv.paidDate,
      property: inv.contract?.property?.title || 'N/A',
      tenant: inv.contract?.tenant?.name || 'N/A'
    }))
  })
}

async function getExpensesReport(
  startDate?: string | null, 
  endDate?: string | null,
  ownerId?: string | null
) {
  const start = startDate ? new Date(startDate) : startOfYear(new Date())
  const end = endDate ? new Date(endDate) : endOfYear(new Date())

  const whereClause: any = {
    expenseDate: { gte: start, lte: end }
  }

  if (ownerId) {
    whereClause.property = {
      ownerId: ownerId
    }
  }

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    include: {
      property: true,
      category: true
    },
    orderBy: { expenseDate: 'asc' }
  })

  // Agrupar por categoría
  const categoryData: Record<string, { category: string; total: number; count: number }> = {}
  
  expenses.forEach(expense => {
    const categoryKey = expense.category?.name || 'Sin categoría'
    if (!categoryData[categoryKey]) {
      categoryData[categoryKey] = { category: categoryKey, total: 0, count: 0 }
    }
    categoryData[categoryKey].total += expense.amount.toNumber()
    categoryData[categoryKey].count++
  })

  // Agrupar por mes
  const monthlyData: Record<string, { month: string; total: number }> = {}
  
  expenses.forEach(expense => {
    if (expense.expenseDate) {
      const monthKey = format(expense.expenseDate, 'yyyy-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, total: 0 }
      }
      monthlyData[monthKey].total += expense.amount.toNumber()
    }
  })

  return NextResponse.json({
    totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount.toNumber(), 0),
    expenseCount: expenses.length,
    categoryBreakdown: Object.values(categoryData),
    monthlyBreakdown: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
    expenses: expenses.map(exp => ({
      id: exp.id,
      description: exp.description,
      amount: exp.amount,
      date: exp.expenseDate,
      category: exp.category?.name || 'Sin categoría',
      property: exp.property?.title || 'General',
      paidByAdmin: exp.paidByAdmin,
      reimbursedByOwner: exp.reimbursedByOwner
    }))
  })
}

async function getOwnerBalances(ownerId?: string | null) {
  // Obtener propietarios con sus propiedades y gastos
  const whereClause = ownerId ? { id: ownerId } : {}
  
  const owners = await prisma.owner.findMany({
    where: whereClause,
    include: {
      propertiesAsOwner: {
        select: {
          id: true,
          title: true
        }
      },
      ownerPayments: {
        orderBy: { paymentDate: 'desc' },
        take: 10
      }
    }
  })

  const ownerBalances = await Promise.all(
    owners.map(async (owner) => {
      // Obtener propiedades del propietario
      const properties = await prisma.property.findMany({
        where: { ownerId: owner.id },
        select: { id: true }
      })
      const propertyIds = properties.map(p => p.id)

      // Calcular gastos pendientes de reembolso
      const pendingExpenses = await prisma.expense.aggregate({
        where: {
          propertyId: { in: propertyIds },
          paidByAdmin: true,
          reimbursedByOwner: false
        },
        _sum: { amount: true }
      })

      // Calcular total pagado por el propietario
      const totalPaid = await prisma.ownerPayment.aggregate({
        where: { ownerId: owner.id },
        _sum: { amount: true }
      })

      // Ingresos por alquiler (contratos activos)
      const activeContracts = await prisma.contract.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: 'ACTIVE'
        },
        select: { monthlyRent: true }
      })

      const monthlyIncome = activeContracts.reduce(
        (sum, c) => sum + c.monthlyRent.toNumber(),
        0
      )

      return {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        properties: owner.propertiesAsOwner,
        pendingBalance: pendingExpenses._sum.amount || 0,
        totalPaid: totalPaid._sum.amount || 0,
        monthlyIncome,
        netBalance: monthlyIncome - (pendingExpenses._sum.amount?.toNumber() || 0) - (totalPaid._sum.amount?.toNumber() || 0),
        recentPayments: owner.ownerPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          date: p.paymentDate,
          method: p.paymentMethod,
          reference: p.reference
        }))
      }
    })
  )

  return NextResponse.json({
    owners: ownerBalances,
    summary: {
      totalOwners: ownerBalances.length,
      totalPending: ownerBalances.reduce((sum, o) => sum + o.pendingBalance.toNumber(), 0),
      totalMonthlyIncome: ownerBalances.reduce((sum, o) => sum + o.monthlyIncome, 0)
    }
  })
}

async function getCollectionsReport(
  startDate?: string | null, 
  endDate?: string | null,
  ownerId?: string | null
) {
  const start = startDate ? new Date(startDate) : startOfMonth(new Date())
  const end = endDate ? new Date(endDate) : endOfMonth(new Date())

  const whereClause: any = {
    paymentDate: { gte: start, lte: end }
  }

  // Filtrar por propietario si se especifica
  if (ownerId) {
    whereClause.ownerId = ownerId
  }

  const payments = await prisma.ownerPayment.findMany({
    where: whereClause,
    include: {
      owner: {
        include: {
          propertiesAsOwner: {
            select: { id: true, title: true }
          }
        }
      }
    },
    orderBy: { paymentDate: 'desc' }
  })

  const totalCollected = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0)

  return NextResponse.json({
    totalCollected,
    paymentCount: payments.length,
    payments: payments.map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.paymentDate,
      method: p.paymentMethod,
      reference: p.reference,
      owner: {
        id: p.owner.id,
        name: p.owner.name,
        properties: p.owner.propertiesAsOwner
      }
    }))
  })
}
