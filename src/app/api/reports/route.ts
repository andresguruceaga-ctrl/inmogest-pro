import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db';

// GET - Generar reporte financiero mensual o anual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const ownerId = searchParams.get('ownerId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const period = searchParams.get('period') || 'monthly';
    const generate = searchParams.get('generate') === 'true';

    // Validar parámetros requeridos
    if (!year) {
      return NextResponse.json(
        { success: false, error: 'El parámetro year es requerido' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);

    // Para reporte mensual, el mes es requerido
    if (period === 'monthly' && !month) {
      return NextResponse.json(
        { success: false, error: 'El parámetro month es requerido para reportes mensuales' },
        { status: 400 }
      );
    }

    const monthNum = period === 'monthly' ? parseInt(month!) : null;

    // Validar rango de mes
    if (monthNum !== null && (monthNum < 1 || monthNum > 12)) {
      return NextResponse.json(
        { success: false, error: 'El mes debe estar entre 1 y 12' },
        { status: 400 }
      );
    }

    // Construir filtro de propiedad
    const propertyFilter: Record<string, unknown> = { isActive: true };
    if (propertyId) {
      propertyFilter.id = propertyId;
    }
    if (ownerId) {
      propertyFilter.ownerId = ownerId;
    }

    if (period === 'yearly') {
      return await generateYearlyReport(propertyFilter, yearNum);
    } else {
      return await generateMonthlyReport(propertyFilter, monthNum!, yearNum);
    }
  } catch (error) {
    console.error('Error al generar reporte:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar el reporte financiero', message: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// Generar reporte mensual
async function generateMonthlyReport(
  propertyFilter: Record<string, unknown>,
  monthNum: number,
  yearNum: number
) {
  // Obtener propiedades con datos
  const properties = await db.property.findMany({
    where: propertyFilter,
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      tenant: { select: { id: true, name: true, email: true, phone: true } },
      expenses: {
        where: {
          expenseDate: {
            gte: new Date(yearNum, monthNum - 1, 1),
            lte: new Date(yearNum, monthNum, 0, 23, 59, 59),
          },
        },
      },
      payments: {
        where: {
          paidAt: {
            gte: new Date(yearNum, monthNum - 1, 1),
            lte: new Date(yearNum, monthNum, 0, 23, 59, 59),
          },
          status: 'PAGADO',
        },
        include: {
          user: { select: { id: true, name: true } }
        }
      },
      contracts: {
        where: {
          status: 'VIGENTE',
          startDate: { lte: new Date(yearNum, monthNum, 0) },
          endDate: { gte: new Date(yearNum, monthNum - 1, 1) },
        },
        include: {
          tenant: { select: { id: true, name: true, email: true, phone: true } }
        }
      },
    },
  });

  // Calcular totales por propiedad
  const propertiesReport = properties.map(property => {
    const grossIncome = property.payments.reduce((sum, p) => sum + p.totalAmount, 0);
    
    const fixedExpensesList = property.expenses.filter(e => e.expenseType === 'FIJO');
    const fixedExpenses = fixedExpensesList.reduce((sum, e) => sum + e.totalAmount, 0);
    
    const variableExpensesList = property.expenses.filter(e => e.expenseType === 'VARIABLE');
    const variableExpenses = variableExpensesList.reduce((sum, e) => sum + e.totalAmount, 0);
    
    const totalExpenses = fixedExpenses + variableExpenses;
    const netIncome = grossIncome - totalExpenses;
    
    const itbmsCollected = property.payments.reduce((sum, p) => sum + p.itbmsAmount, 0);
    const itbmsPaid = property.expenses.reduce((sum, e) => sum + e.itbmsAmount, 0);

    // Calcular ocupación
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const occupiedDays = property.contracts.reduce((total, contract) => {
      const start = new Date(Math.max(contract.startDate.getTime(), new Date(yearNum, monthNum - 1, 1).getTime()));
      const end = new Date(Math.min(contract.endDate.getTime(), new Date(yearNum, monthNum, 0).getTime()));
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + Math.max(0, Math.min(days, daysInMonth));
    }, 0);
    const occupancyRate = (occupiedDays / daysInMonth) * 100;

    // Get active contract with tenant info
    const activeContract = property.contracts[0];
    
    // Calculate contract progress
    let contractProgress = 0;
    if (activeContract) {
      const totalDays = Math.ceil((activeContract.endDate.getTime() - activeContract.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.max(0, Math.ceil((new Date().getTime() - activeContract.startDate.getTime()) / (1000 * 60 * 60 * 24)));
      contractProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    }

    // Calculate admin expense balance
    const adminPaidExpenses = property.expenses.filter(e => e.paidByAdmin);
    const pendingReimbursement = adminPaidExpenses
      .filter(e => !e.reimbursedByOwner)
      .reduce((sum, e) => sum + e.totalAmount, 0);
    const totalReimbursed = adminPaidExpenses
      .filter(e => e.reimbursedByOwner)
      .reduce((sum, e) => sum + e.totalAmount, 0);

    return {
      propertyId: property.id,
      propertyTitle: property.title,
      propertyType: property.propertyType,
      address: property.address,
      province: property.province,
      district: property.district,
      totalArea: property.totalArea,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parkingSpaces: property.parkingSpaces,
      monthlyRent: property.monthlyRent,
      grossIncome,
      fixedExpenses,
      variableExpenses,
      totalExpenses,
      netIncome,
      itbmsCollected,
      itbmsPaid,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      paymentsCount: property.payments.length,
      expensesCount: property.expenses.length,
      owner: property.owner,
      tenant: property.tenant || (activeContract?.tenant) || null,
      contract: activeContract ? {
        id: activeContract.id,
        contractNumber: activeContract.contractNumber,
        startDate: activeContract.startDate,
        endDate: activeContract.endDate,
        monthlyAmount: activeContract.monthlyAmount,
        status: activeContract.status,
        progress: contractProgress,
      } : null,
      expensesDetails: {
        fixed: fixedExpensesList.map(e => ({
          id: e.id,
          description: e.description || e.title,
          amount: e.totalAmount,
          date: e.expenseDate,
          category: e.category,
          paidByAdmin: e.paidByAdmin,
          reimbursedByOwner: e.reimbursedByOwner,
        })),
        variable: variableExpensesList.map(e => ({
          id: e.id,
          description: e.description || e.title,
          amount: e.totalAmount,
          date: e.expenseDate,
          category: e.category,
          paidByAdmin: e.paidByAdmin,
          reimbursedByOwner: e.reimbursedByOwner,
        })),
      },
      adminBalance: {
        totalAdminPaid: adminPaidExpenses.reduce((sum, e) => sum + e.totalAmount, 0),
        pendingReimbursement,
        totalReimbursed,
        adminExpenses: adminPaidExpenses.map(e => ({
          id: e.id,
          description: e.description || e.title,
          amount: e.totalAmount,
          date: e.expenseDate,
          category: e.category,
          reimbursed: e.reimbursedByOwner,
          reimbursedAt: e.reimbursedAt,
        })),
      },
      paymentsDetails: property.payments.map(p => ({
        id: p.id,
        amount: p.totalAmount,
        date: p.paidAt,
        type: p.paymentType,
        tenant: p.user?.name,
      })),
    };
  });

  // Calcular totales generales
  const totals = propertiesReport.reduce(
    (acc, p) => ({
      grossIncome: acc.grossIncome + p.grossIncome,
      fixedExpenses: acc.fixedExpenses + p.fixedExpenses,
      variableExpenses: acc.variableExpenses + p.variableExpenses,
      totalExpenses: acc.totalExpenses + p.totalExpenses,
      netIncome: acc.netIncome + p.netIncome,
      itbmsCollected: acc.itbmsCollected + p.itbmsCollected,
      itbmsPaid: acc.itbmsPaid + p.itbmsPaid,
      pendingReimbursement: acc.pendingReimbursement + p.adminBalance.pendingReimbursement,
      totalReimbursed: acc.totalReimbursed + p.adminBalance.totalReimbursed,
    }),
    {
      grossIncome: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      totalExpenses: 0,
      netIncome: 0,
      itbmsCollected: 0,
      itbmsPaid: 0,
      pendingReimbursement: 0,
      totalReimbursed: 0,
    }
  );

  // Calcular promedio de ocupación
  const avgOccupancy = propertiesReport.length > 0
    ? propertiesReport.reduce((sum, p) => sum + p.occupancyRate, 0) / propertiesReport.length
    : 0;

  // Datos comparativos con el mes anterior
  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;

  const prevReports = await db.financialReport.findMany({
    where: {
      month: prevMonth,
      year: prevYear,
      isGenerated: true,
      ...(propertyFilter.id ? { propertyId: propertyFilter.id as string } : {}),
      ...(propertyFilter.ownerId ? { property: { ownerId: propertyFilter.ownerId as string } } : {}),
    },
  });

  const prevTotals = prevReports.reduce(
    (acc, r) => ({
      grossIncome: acc.grossIncome + r.grossIncome,
      netIncome: acc.netIncome + r.netIncome,
      totalExpenses: acc.totalExpenses + r.totalExpenses,
    }),
    { grossIncome: 0, netIncome: 0, totalExpenses: 0 }
  );

  const variations = {
    grossIncome: prevTotals.grossIncome > 0 
      ? ((totals.grossIncome - prevTotals.grossIncome) / prevTotals.grossIncome) * 100 
      : 0,
    netIncome: prevTotals.netIncome > 0 
      ? ((totals.netIncome - prevTotals.netIncome) / prevTotals.netIncome) * 100 
      : 0,
    totalExpenses: prevTotals.totalExpenses > 0 
      ? ((totals.totalExpenses - prevTotals.totalExpenses) / prevTotals.totalExpenses) * 100 
      : 0,
  };

  // Fetch tickets for the selected property/properties
  let tickets: Array<{
    id: string;
    title: string;
    description: string;
    category: string | null;
    status: string;
    priority: string;
    photos: string | null;
    createdAt: Date;
    property: { id: string; title: string; address: string };
  }> = [];
  
  // Get tickets for all properties in the report
  const propertyIds = properties.map(p => p.id);
  if (propertyIds.length > 0) {
    tickets = await db.supportTicket.findMany({
      where: { 
        propertyId: { in: propertyIds }
      },
      include: {
        property: { select: { id: true, title: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // Fetch admin contacts
  const admins = await db.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { name: true, email: true, phone: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      period: {
        type: 'monthly',
        month: monthNum,
        year: yearNum,
        monthName: new Date(yearNum, monthNum - 1).toLocaleDateString('es-PA', { month: 'long' }),
      },
      properties: propertiesReport,
      totals: {
        ...totals,
        propertiesCount: properties.length,
        avgOccupancy: Math.round(avgOccupancy * 10) / 10,
      },
      comparison: {
        previousPeriod: {
          month: prevMonth,
          year: prevYear,
          totals: prevTotals,
        },
        variations: {
          grossIncome: Math.round(variations.grossIncome * 10) / 10,
          netIncome: Math.round(variations.netIncome * 10) / 10,
          totalExpenses: Math.round(variations.totalExpenses * 10) / 10,
        },
      },
      tickets: tickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        status: t.status,
        priority: t.priority,
        photos: t.photos,
        createdAt: t.createdAt.toLocaleDateString('es-PA'),
        property: {
          id: t.property.id,
          title: t.property.title,
          address: t.property.address,
        },
      })),
      admins: admins.map(a => ({
        name: a.name,
        email: a.email,
        phone: a.phone,
      })),
    },
  });
}

// Generar reporte anual
async function generateYearlyReport(
  propertyFilter: Record<string, unknown>,
  yearNum: number
) {
  // Obtener todos los reportes mensuales del año
  const monthlyReports = await db.financialReport.findMany({
    where: {
      year: yearNum,
      isGenerated: true,
      ...(propertyFilter.id ? { propertyId: propertyFilter.id as string } : {}),
      ...(propertyFilter.ownerId ? { property: { ownerId: propertyFilter.ownerId as string } } : {}),
    },
    include: {
      property: {
        select: { 
          id: true, 
          title: true, 
          address: true, 
          province: true, 
          district: true,
          propertyType: true,
          totalArea: true,
          bedrooms: true,
          bathrooms: true,
          parkingSpaces: true,
          monthlyRent: true, 
          owner: { select: { id: true, name: true, email: true, phone: true } } 
        }
      }
    },
    orderBy: [{ month: 'asc' }]
  });

  // Obtener propiedades con datos del año completo
  const properties = await db.property.findMany({
    where: propertyFilter,
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      tenant: { select: { id: true, name: true, email: true, phone: true } },
      expenses: {
        where: {
          expenseDate: {
            gte: new Date(yearNum, 0, 1),
            lte: new Date(yearNum, 11, 31, 23, 59, 59),
          },
        },
      },
      payments: {
        where: {
          paidAt: {
            gte: new Date(yearNum, 0, 1),
            lte: new Date(yearNum, 11, 31, 23, 59, 59),
          },
          status: 'PAGADO',
        },
      },
      contracts: {
        where: {
          status: 'VIGENTE',
        },
        include: {
          tenant: { select: { id: true, name: true, email: true, phone: true } }
        }
      },
    },
  });

  // Si no hay reportes generados, calcular desde los datos crudos
  const useRawData = monthlyReports.length === 0;

  let yearTotals = {
    grossIncome: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    totalExpenses: 0,
    netIncome: 0,
    itbmsCollected: 0,
    itbmsPaid: 0,
  };

  let monthlyData: Array<{
    month: number;
    monthName: string;
    grossIncome: number;
    fixedExpenses: number;
    variableExpenses: number;
    totalExpenses: number;
    netIncome: number;
  }> = [];

  let propertiesReport: Array<{
    propertyId: string;
    propertyTitle: string;
    propertyType?: string;
    address: string;
    province: string;
    district?: string;
    totalArea?: number;
    bedrooms?: number;
    bathrooms?: number;
    parkingSpaces?: number;
    monthlyRent: number;
    owner: { id: string; name: string; email?: string; phone?: string } | null;
    tenant: { id: string; name: string; email?: string; phone?: string } | null;
    contract: {
      id: string;
      contractNumber: string;
      startDate: Date;
      endDate: Date;
      monthlyAmount: number;
      status: string;
      progress: number;
    } | null;
    grossIncome: number;
    fixedExpenses: number;
    variableExpenses: number;
    totalExpenses: number;
    netIncome: number;
    itbmsCollected: number;
    itbmsPaid: number;
    monthsActive: number;
    expensesDetails: {
      fixed: Array<{ id: string; description: string; amount: number; date: Date; category: string }>;
      variable: Array<{ id: string; description: string; amount: number; date: Date; category: string }>;
    };
  }> = [];

  if (useRawData) {
    // Calcular desde datos crudos
    for (const property of properties) {
      const grossIncome = property.payments.reduce((sum, p) => sum + p.totalAmount, 0);
      const fixedExpensesList = property.expenses.filter(e => e.expenseType === 'FIJO');
      const fixedExpenses = fixedExpensesList.reduce((sum, e) => sum + e.totalAmount, 0);
      const variableExpensesList = property.expenses.filter(e => e.expenseType === 'VARIABLE');
      const variableExpenses = variableExpensesList.reduce((sum, e) => sum + e.totalAmount, 0);
      const totalExpenses = fixedExpenses + variableExpenses;
      const netIncome = grossIncome - totalExpenses;
      const itbmsCollected = property.payments.reduce((sum, p) => sum + p.itbmsAmount, 0);
      const itbmsPaid = property.expenses.reduce((sum, e) => sum + e.itbmsAmount, 0);

      // Get active contract with tenant info
      const activeContract = property.contracts?.[0];
      
      // Calculate contract progress
      let contractProgress = 0;
      if (activeContract) {
        const totalDays = Math.ceil((activeContract.endDate.getTime() - activeContract.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.max(0, Math.ceil((new Date().getTime() - activeContract.startDate.getTime()) / (1000 * 60 * 60 * 24)));
        contractProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
      }

      propertiesReport.push({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyType: property.propertyType,
        address: property.address,
        province: property.province,
        district: property.district,
        totalArea: property.totalArea,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parkingSpaces: property.parkingSpaces,
        monthlyRent: property.monthlyRent,
        owner: property.owner,
        tenant: property.tenant || (activeContract?.tenant) || null,
        contract: activeContract ? {
          id: activeContract.id,
          contractNumber: activeContract.contractNumber,
          startDate: activeContract.startDate,
          endDate: activeContract.endDate,
          monthlyAmount: activeContract.monthlyAmount,
          status: activeContract.status,
          progress: contractProgress,
        } : null,
        grossIncome,
        fixedExpenses,
        variableExpenses,
        totalExpenses,
        netIncome,
        itbmsCollected,
        itbmsPaid,
        monthsActive: 12,
        expensesDetails: {
          fixed: fixedExpensesList.map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate,
            category: e.category,
          })),
          variable: variableExpensesList.map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate,
            category: e.category,
          })),
        },
      });

      yearTotals.grossIncome += grossIncome;
      yearTotals.fixedExpenses += fixedExpenses;
      yearTotals.variableExpenses += variableExpenses;
      yearTotals.totalExpenses += totalExpenses;
      yearTotals.netIncome += netIncome;
      yearTotals.itbmsCollected += itbmsCollected;
      yearTotals.itbmsPaid += itbmsPaid;
    }

    // Calcular datos mensuales agregados
    for (let month = 1; month <= 12; month++) {
      const monthPayments = properties.flatMap(p => p.payments).filter(p => {
        const paidAt = new Date(p.paidAt!);
        return paidAt.getMonth() + 1 === month;
      });
      const monthExpenses = properties.flatMap(p => p.expenses).filter(e => {
        const expenseDate = new Date(e.expenseDate);
        return expenseDate.getMonth() + 1 === month;
      });

      const grossIncome = monthPayments.reduce((sum, p) => sum + p.totalAmount, 0);
      const fixedExpenses = monthExpenses.filter(e => e.expenseType === 'FIJO').reduce((sum, e) => sum + e.totalAmount, 0);
      const variableExpenses = monthExpenses.filter(e => e.expenseType === 'VARIABLE').reduce((sum, e) => sum + e.totalAmount, 0);

      monthlyData.push({
        month,
        monthName: new Date(yearNum, month - 1).toLocaleDateString('es-PA', { month: 'long' }),
        grossIncome,
        fixedExpenses,
        variableExpenses,
        totalExpenses: fixedExpenses + variableExpenses,
        netIncome: grossIncome - fixedExpenses - variableExpenses,
      });
    }
  } else {
    // Usar reportes mensuales generados
    const propertyMap = new Map<string, typeof propertiesReport[0]>();

    for (const report of monthlyReports) {
      const propId = report.propertyId;
      
      if (!propertyMap.has(propId)) {
        propertyMap.set(propId, {
          propertyId: propId,
          propertyTitle: report.property?.title || 'N/A',
          propertyType: report.property?.propertyType,
          address: report.property?.address || '',
          province: report.property?.province || '',
          district: report.property?.district,
          totalArea: report.property?.totalArea,
          bedrooms: report.property?.bedrooms,
          bathrooms: report.property?.bathrooms,
          parkingSpaces: report.property?.parkingSpaces,
          monthlyRent: report.property?.monthlyRent || 0,
          owner: report.property?.owner || null,
          tenant: null, // Will be fetched later
          contract: null, // Will be fetched later
          grossIncome: 0,
          fixedExpenses: 0,
          variableExpenses: 0,
          totalExpenses: 0,
          netIncome: 0,
          itbmsCollected: 0,
          itbmsPaid: 0,
          monthsActive: 0,
          expensesDetails: {
            fixed: [],
            variable: [],
          },
        });
      }

      const propData = propertyMap.get(propId)!;
      propData.grossIncome += report.grossIncome;
      propData.fixedExpenses += report.fixedExpenses;
      propData.variableExpenses += report.repairsExpenses;
      propData.totalExpenses += report.totalExpenses;
      propData.netIncome += report.netIncome;
      propData.itbmsCollected += report.itbmsCollected;
      propData.itbmsPaid += report.itbmsPaid;
      propData.monthsActive++;

      yearTotals.grossIncome += report.grossIncome;
      yearTotals.fixedExpenses += report.fixedExpenses;
      yearTotals.variableExpenses += report.repairsExpenses;
      yearTotals.totalExpenses += report.totalExpenses;
      yearTotals.netIncome += report.netIncome;
      yearTotals.itbmsCollected += report.itbmsCollected;
      yearTotals.itbmsPaid += report.itbmsPaid;
    }

    propertiesReport = Array.from(propertyMap.values());

    // Agrupar por mes
    const monthMap = new Map<number, typeof monthlyData[0]>();
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, {
        month: m,
        monthName: new Date(yearNum, m - 1).toLocaleDateString('es-PA', { month: 'long' }),
        grossIncome: 0,
        fixedExpenses: 0,
        variableExpenses: 0,
        totalExpenses: 0,
        netIncome: 0,
      });
    }

    for (const report of monthlyReports) {
      const monthData = monthMap.get(report.month)!;
      monthData.grossIncome += report.grossIncome;
      monthData.fixedExpenses += report.fixedExpenses;
      monthData.variableExpenses += report.repairsExpenses;
      monthData.totalExpenses += report.totalExpenses;
      monthData.netIncome += report.netIncome;
    }

    monthlyData = Array.from(monthMap.values());
    
    // Si hay reportes mensuales pero necesitamos detalles de gastos, obtenerlos de los datos crudos
    if (propertiesReport.length > 0) {
      const propertyIds = propertiesReport.map(p => p.propertyId);
      const expensesData = await db.expense.findMany({
        where: {
          propertyId: { in: propertyIds },
          expenseDate: {
            gte: new Date(yearNum, 0, 1),
            lte: new Date(yearNum, 11, 31, 23, 59, 59),
          },
        },
      });
      
      // Fetch tenant and contract data
      const propertiesWithTenantContract = await db.property.findMany({
        where: { id: { in: propertyIds } },
        include: {
          tenant: { select: { id: true, name: true, email: true, phone: true } },
          contracts: {
            where: { status: 'VIGENTE' },
            include: {
              tenant: { select: { id: true, name: true, email: true, phone: true } }
            }
          }
        }
      });
      
      const tenantContractMap = new Map(propertiesWithTenantContract.map(p => [p.id, p]));
      
      // Agrupar gastos por propiedad
      for (const prop of propertiesReport) {
        const propExpenses = expensesData.filter(e => e.propertyId === prop.propertyId);
        prop.expensesDetails = {
          fixed: propExpenses.filter(e => e.expenseType === 'FIJO').map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate,
            category: e.category,
          })),
          variable: propExpenses.filter(e => e.expenseType === 'VARIABLE').map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate,
            category: e.category,
          })),
        };
        
        // Add tenant and contract data
        const propData = tenantContractMap.get(prop.propertyId);
        if (propData) {
          const activeContract = propData.contracts?.[0];
          let contractProgress = 0;
          if (activeContract) {
            const totalDays = Math.ceil((activeContract.endDate.getTime() - activeContract.startDate.getTime()) / (1000 * 60 * 60 * 24));
            const elapsedDays = Math.max(0, Math.ceil((new Date().getTime() - activeContract.startDate.getTime()) / (1000 * 60 * 60 * 24)));
            contractProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
          }
          
          prop.tenant = propData.tenant || (activeContract?.tenant) || null;
          prop.contract = activeContract ? {
            id: activeContract.id,
            contractNumber: activeContract.contractNumber,
            startDate: activeContract.startDate,
            endDate: activeContract.endDate,
            monthlyAmount: activeContract.monthlyAmount,
            status: activeContract.status,
            progress: contractProgress,
          } : null;
        }
      }
    }
  }

  // Comparación con año anterior
  const prevYearReports = await db.financialReport.findMany({
    where: {
      year: yearNum - 1,
      isGenerated: true,
      ...(propertyFilter.id ? { propertyId: propertyFilter.id as string } : {}),
      ...(propertyFilter.ownerId ? { property: { ownerId: propertyFilter.ownerId as string } } : {}),
    },
  });

  const prevYearTotals = prevYearReports.reduce(
    (acc, r) => ({
      grossIncome: acc.grossIncome + r.grossIncome,
      netIncome: acc.netIncome + r.netIncome,
      totalExpenses: acc.totalExpenses + r.totalExpenses,
    }),
    { grossIncome: 0, netIncome: 0, totalExpenses: 0 }
  );

  const variations = {
    grossIncome: prevYearTotals.grossIncome > 0 
      ? ((yearTotals.grossIncome - prevYearTotals.grossIncome) / prevYearTotals.grossIncome) * 100 
      : 0,
    netIncome: prevYearTotals.netIncome > 0 
      ? ((yearTotals.netIncome - prevYearTotals.netIncome) / prevYearTotals.netIncome) * 100 
      : 0,
    totalExpenses: prevYearTotals.totalExpenses > 0 
      ? ((yearTotals.totalExpenses - prevYearTotals.totalExpenses) / prevYearTotals.totalExpenses) * 100 
      : 0,
  };

  // Fetch tickets for the selected property/properties
  let tickets: Array<{
    id: string;
    title: string;
    description: string;
    category: string | null;
    status: string;
    priority: string;
    photos: string | null;
    createdAt: Date;
    property: { id: string; title: string; address: string };
  }> = [];
  
  // Get tickets for all properties in the report
  const propertyIds = propertiesReport.map(p => p.propertyId);
  if (propertyIds.length > 0) {
    tickets = await db.supportTicket.findMany({
      where: { 
        propertyId: { in: propertyIds }
      },
      include: {
        property: { select: { id: true, title: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // Fetch admin contacts
  const admins = await db.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { name: true, email: true, phone: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      period: {
        type: 'yearly',
        year: yearNum,
      },
      monthlyData,
      properties: propertiesReport,
      totals: {
        ...yearTotals,
        propertiesCount: properties.length || propertiesReport.length,
        avgMonthlyIncome: Math.round(yearTotals.grossIncome / 12),
      },
      comparison: {
        previousYear: yearNum - 1,
        previousTotals: prevYearTotals,
        variations: {
          grossIncome: Math.round(variations.grossIncome * 10) / 10,
          netIncome: Math.round(variations.netIncome * 10) / 10,
          totalExpenses: Math.round(variations.totalExpenses * 10) / 10,
        },
      },
      generated: !useRawData,
      tickets: tickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        status: t.status,
        priority: t.priority,
        photos: t.photos,
        createdAt: t.createdAt.toLocaleDateString('es-PA'),
        property: {
          id: t.property.id,
          title: t.property.title,
          address: t.property.address,
        },
      })),
      admins: admins.map(a => ({
        name: a.name,
        email: a.email,
        phone: a.phone,
      })),
    },
  });
}
