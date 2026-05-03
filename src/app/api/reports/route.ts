import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns'

const months = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

// GET /api/reports - Generar reportes financieros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado', success: false }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly'
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1
    const ownerId = searchParams.get('ownerId')
    const propertyId = searchParams.get('propertyId')

    // Si es propietario, solo puede ver sus propios datos
    const effectiveOwnerId = session.user.role === 'PROPIETARIO' 
      ? session.user.id 
      : (ownerId && ownerId !== 'all' ? ownerId : null)

    // Determinar rango de fechas
    let startDate: Date
    let endDate: Date

    if (period === 'monthly') {
      startDate = startOfMonth(new Date(year, month - 1, 1))
      endDate = endOfMonth(new Date(year, month - 1, 1))
    } else {
      startDate = startOfYear(new Date(year, 0, 1))
      endDate = endOfYear(new Date(year, 0, 1))
    }

    // Construir filtros de propiedad
    const propertyWhere: any = {}
    if (effectiveOwnerId) {
      propertyWhere.ownerId = effectiveOwnerId
    }
    if (propertyId && propertyId !== 'all') {
      propertyWhere.id = propertyId
    }

    // Obtener propiedades
    const properties = await prisma.property.findMany({
      where: propertyWhere,
      include: {
        owner: {
          select: { id: true, name: true }
        },
        contracts: {
          where: { status: 'VIGENTE' },
          include: {
            tenant: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (properties.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          period: {
            type: period,
            month: period === 'monthly' ? month : undefined,
            year,
            monthName: period === 'monthly' ? months.find(m => m.value === month)?.label : undefined
          },
          properties: [],
          totals: {
            grossIncome: 0,
            fixedExpenses: 0,
            variableExpenses: 0,
            totalExpenses: 0,
            netIncome: 0,
            itbmsCollected: 0,
            itbmsPaid: 0,
            propertiesCount: 0
          },
          generated: true,
          tickets: []
        }
      })
    }

    const propertyIds = properties.map(p => p.id)

    // Obtener gastos del período
    const expenses = await prisma.expense.findMany({
      where: {
        propertyId: { in: propertyIds },
        expenseDate: { gte: startDate, lte: endDate }
      },
      include: {
        property: { select: { id: true, title: true } }
      },
      orderBy: { expenseDate: 'desc' }
    })

    // Obtener pagos del período (usando modelo Payment, no Invoice)
    const payments = await prisma.payment.findMany({
      where: {
        status: 'PAGADO',
        paidAt: { gte: startDate, lte: endDate },
        propertyId: { in: propertyIds }
      },
      include: {
        property: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { paidAt: 'desc' }
    })

    // Obtener tickets del período (usando modelo SupportTicket)
    const tickets = await prisma.supportTicket.findMany({
      where: {
        propertyId: { in: propertyIds },
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        property: { select: { id: true, title: true, address: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Procesar datos por propiedad
    const propertiesData = properties.map(property => {
      const propertyExpenses = expenses.filter(e => e.propertyId === property.id)
      const propertyPayments = payments.filter(p => p.propertyId === property.id)
      
      // Clasificar gastos por tipo
      const fixedExpensesList = propertyExpenses.filter(e => e.expenseType === 'FIJO')
      const variableExpensesList = propertyExpenses.filter(e => e.expenseType === 'VARIABLE')

      const fixedExpenses = fixedExpensesList.reduce((sum, e) => sum + e.totalAmount, 0)
      const variableExpenses = variableExpensesList.reduce((sum, e) => sum + e.totalAmount, 0)
      const grossIncome = propertyPayments.reduce((sum, p) => sum + p.totalAmount, 0)
      const monthlyRent = property.contracts[0]?.monthlyAmount || 0

      // Obtener contrato vigente con todos los datos
      const activeContract = property.contracts[0]
      
      return {
        propertyId: property.id,
        propertyTitle: property.title,
        address: property.address,
        province: property.province || '',
        monthlyRent,
        grossIncome,
        fixedExpenses,
        variableExpenses,
        totalExpenses: fixedExpenses + variableExpenses,
        netIncome: grossIncome - fixedExpenses - variableExpenses,
        itbmsCollected: propertyPayments.reduce((sum, p) => sum + (p.itbmsAmount || 0), 0),
        itbmsPaid: propertyExpenses.reduce((sum, e) => sum + (e.itbmsAmount || 0), 0),
        occupancyRate: property.contracts.length > 0 ? 100 : 0,
        paymentsCount: propertyPayments.length,
        expensesCount: propertyExpenses.length,
        owner: property.owner,
        // Datos del inquilino
        tenant: activeContract?.tenant ? {
          id: activeContract.tenant.id,
          name: activeContract.tenant.name
        } : null,
        // Datos del contrato de arrendamiento
        contract: activeContract ? {
          id: activeContract.id,
          startDate: activeContract.startDate.toISOString(),
          endDate: activeContract.endDate.toISOString(),
          monthlyAmount: activeContract.monthlyAmount,
          deposit: activeContract.deposit,
          status: activeContract.status
        } : null,
        expensesDetails: {
          fixed: fixedExpensesList.map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate.toISOString(),
            category: e.category
          })),
          variable: variableExpensesList.map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate.toISOString(),
            category: e.category
          }))
        },
        paymentsDetails: propertyPayments.map(p => ({
          id: p.id,
          amount: p.totalAmount,
          date: p.paidAt?.toISOString() || '',
          type: p.paymentType,
          tenant: p.user?.name
        }))
      }
    })

    // Calcular totales
    const totals = {
      grossIncome: propertiesData.reduce((sum, p) => sum + p.grossIncome, 0),
      fixedExpenses: propertiesData.reduce((sum, p) => sum + p.fixedExpenses, 0),
      variableExpenses: propertiesData.reduce((sum, p) => sum + p.variableExpenses, 0),
      totalExpenses: propertiesData.reduce((sum, p) => sum + p.totalExpenses, 0),
      netIncome: propertiesData.reduce((sum, p) => sum + p.netIncome, 0),
      itbmsCollected: propertiesData.reduce((sum, p) => sum + p.itbmsCollected, 0),
      itbmsPaid: propertiesData.reduce((sum, p) => sum + p.itbmsPaid, 0),
      propertiesCount: properties.length,
      avgOccupancy: propertiesData.reduce((sum, p) => sum + p.occupancyRate, 0) / properties.length,
      avgMonthlyIncome: propertiesData.reduce((sum, p) => sum + p.monthlyRent, 0) / properties.length
    }

    // Datos mensuales (para reporte anual)
    let monthlyData = undefined
    if (period === 'yearly') {
      monthlyData = []
      for (let m = 1; m <= 12; m++) {
        const monthStart = startOfMonth(new Date(year, m - 1, 1))
        const monthEnd = endOfMonth(new Date(year, m - 1, 1))
        
        const monthExpenses = await prisma.expense.aggregate({
          where: {
            propertyId: { in: propertyIds },
            expenseDate: { gte: monthStart, lte: monthEnd }
          },
          _sum: { totalAmount: true }
        })
        
        const monthPayments = await prisma.payment.aggregate({
          where: {
            status: 'PAGADO',
            paidAt: { gte: monthStart, lte: monthEnd },
            propertyId: { in: propertyIds }
          },
          _sum: { totalAmount: true }
        })

        const monthGross = monthPayments._sum.totalAmount || 0
        const monthExpensesTotal = monthExpenses._sum.totalAmount || 0

        monthlyData.push({
          month: m,
          monthName: months.find(mo => mo.value === m)?.label || '',
          grossIncome: monthGross,
          fixedExpenses: monthExpensesTotal * 0.4,
          variableExpenses: monthExpensesTotal * 0.6,
          totalExpenses: monthExpensesTotal,
          netIncome: monthGross - monthExpensesTotal
        })
      }
    }

    // Comparación con período anterior
    let comparison = undefined
    let previousStart: Date
    let previousEnd: Date

    if (period === 'monthly') {
      previousStart = startOfMonth(subMonths(startDate, 1))
      previousEnd = endOfMonth(subMonths(startDate, 1))
    } else {
      previousStart = startOfYear(subYears(startDate, 1))
      previousEnd = endOfYear(subYears(startDate, 1))
    }

    const prevExpenses = await prisma.expense.aggregate({
      where: {
        propertyId: { in: propertyIds },
        expenseDate: { gte: previousStart, lte: previousEnd }
      },
      _sum: { totalAmount: true }
    })

    const prevPayments = await prisma.payment.aggregate({
      where: {
        status: 'PAGADO',
        paidAt: { gte: previousStart, lte: previousEnd },
        propertyId: { in: propertyIds }
      },
      _sum: { totalAmount: true }
    })

    const prevGross = prevPayments._sum.totalAmount || 0
    const prevExpensesTotal = prevExpenses._sum.totalAmount || 0
    const prevNet = prevGross - prevExpensesTotal

    comparison = {
      previousPeriod: {
        month: period === 'monthly' ? month - 1 : undefined,
        year: period === 'monthly' ? (month === 1 ? year - 1 : year) : year - 1,
        totals: {
          grossIncome: prevGross,
          netIncome: prevNet,
          totalExpenses: prevExpensesTotal
        }
      },
      variations: {
        grossIncome: prevGross > 0 ? Math.round(((totals.grossIncome - prevGross) / prevGross) * 100) : 0,
        netIncome: prevNet !== 0 ? Math.round(((totals.netIncome - prevNet) / Math.abs(prevNet)) * 100) : 0,
        totalExpenses: prevExpensesTotal > 0 ? Math.round(((totals.totalExpenses - prevExpensesTotal) / prevExpensesTotal) * 100) : 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        period: {
          type: period,
          month: period === 'monthly' ? month : undefined,
          year,
          monthName: period === 'monthly' ? months.find(m => m.value === month)?.label : undefined
        },
        properties: propertiesData,
        totals,
        monthlyData,
        comparison,
        generated: true,
        tickets: tickets.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt.toISOString(),
          property: {
            id: t.property.id,
            title: t.property.title,
            address: t.property.address
          }
        }))
      }
    })

  } catch (error) {
    console.error('Error en reportes:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte', success: false },
      { status: 500 }
    )
  }
}
