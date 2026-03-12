import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Generar reporte financiero mensual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const generate = searchParams.get('generate') === 'true';

    // Validar parámetros requeridos
    if (!month || !year) {
      return NextResponse.json(
        {
          success: false,
          error: 'Los parámetros month y year son requeridos',
        },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validar rango de mes
    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        {
          success: false,
          error: 'El mes debe estar entre 1 y 12',
        },
        { status: 400 }
      );
    }

    // Construir filtro de propiedad
    const propertyFilter = propertyId ? { id: propertyId } : { isActive: true };

    // Obtener propiedades
    const properties = await db.property.findMany({
      where: propertyFilter,
      include: {
        contracts: {
          where: {
            status: 'VIGENTE',
            startDate: { lte: new Date(yearNum, monthNum, 0) },
            endDate: { gte: new Date(yearNum, monthNum - 1, 1) },
          },
        },
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
        },
        financialReports: {
          where: {
            month: monthNum,
            year: yearNum,
          },
        },
      },
    });

    // Calcular totales por propiedad
    const propertiesReport = properties.map(property => {
      // Ingresos del mes (pagos recibidos)
      const grossIncome = property.payments.reduce((sum, p) => sum + p.totalAmount, 0);
      
      // Gastos fijos (mantenimiento PH, seguros)
      const fixedExpenses = property.expenses
        .filter(e => e.expenseType === 'FIJO')
        .reduce((sum, e) => sum + e.totalAmount, 0);
      
      // Gastos variables (reparaciones, servicios)
      const repairsExpenses = property.expenses
        .filter(e => e.expenseType === 'VARIABLE')
        .reduce((sum, e) => sum + e.totalAmount, 0);
      
      // Total gastos
      const totalExpenses = fixedExpenses + repairsExpenses;
      
      // Ingreso neto
      const netIncome = grossIncome - totalExpenses;
      
      // ITBMS recaudado (de pagos)
      const itbmsCollected = property.payments.reduce((sum, p) => sum + p.itbmsAmount, 0);
      
      // ITBMS pagado (en gastos)
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

      return {
        propertyId: property.id,
        propertyTitle: property.title,
        address: property.address,
        province: property.province,
        monthlyRent: property.monthlyRent,
        grossIncome,
        fixedExpenses,
        repairsExpenses,
        totalExpenses,
        netIncome,
        itbmsCollected,
        itbmsPaid,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        paymentsCount: property.payments.length,
        expensesCount: property.expenses.length,
        contractsCount: property.contracts.length,
      };
    });

    // Calcular totales generales
    const totals = propertiesReport.reduce(
      (acc, p) => ({
        grossIncome: acc.grossIncome + p.grossIncome,
        fixedExpenses: acc.fixedExpenses + p.fixedExpenses,
        repairsExpenses: acc.repairsExpenses + p.repairsExpenses,
        totalExpenses: acc.totalExpenses + p.totalExpenses,
        netIncome: acc.netIncome + p.netIncome,
        itbmsCollected: acc.itbmsCollected + p.itbmsCollected,
        itbmsPaid: acc.itbmsPaid + p.itbmsPaid,
      }),
      {
        grossIncome: 0,
        fixedExpenses: 0,
        repairsExpenses: 0,
        totalExpenses: 0,
        netIncome: 0,
        itbmsCollected: 0,
        itbmsPaid: 0,
      }
    );

    // Calcular promedio de ocupación
    const avgOccupancy = propertiesReport.length > 0
      ? propertiesReport.reduce((sum, p) => sum + p.occupancyRate, 0) / propertiesReport.length
      : 0;

    // Si se solicita generar/guardar el reporte
    if (generate) {
      // Guardar o actualizar reportes por propiedad
      for (const propReport of propertiesReport) {
        const existingReport = await db.financialReport.findFirst({
          where: {
            propertyId: propReport.propertyId,
            month: monthNum,
            year: yearNum,
          },
        });

        if (existingReport) {
          await db.financialReport.update({
            where: { id: existingReport.id },
            data: {
              grossIncome: propReport.grossIncome,
              fixedExpenses: propReport.fixedExpenses,
              repairsExpenses: propReport.repairsExpenses,
              totalExpenses: propReport.totalExpenses,
              netIncome: propReport.netIncome,
              itbmsCollected: propReport.itbmsCollected,
              itbmsPaid: propReport.itbmsPaid,
              isGenerated: true,
            },
          });
        } else {
          await db.financialReport.create({
            data: {
              month: monthNum,
              year: yearNum,
              grossIncome: propReport.grossIncome,
              fixedExpenses: propReport.fixedExpenses,
              repairsExpenses: propReport.repairsExpenses,
              totalExpenses: propReport.totalExpenses,
              netIncome: propReport.netIncome,
              itbmsCollected: propReport.itbmsCollected,
              itbmsPaid: propReport.itbmsPaid,
              isGenerated: true,
              propertyId: propReport.propertyId,
            },
          });
        }
      }
    }

    // Datos comparativos con el mes anterior
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;

    const prevReports = await db.financialReport.findMany({
      where: {
        month: prevMonth,
        year: prevYear,
        isGenerated: true,
        ...(propertyId ? { propertyId } : {}),
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

    // Calcular variaciones porcentuales
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

    return NextResponse.json({
      success: true,
      data: {
        period: {
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
        generated: generate,
      },
    });
  } catch (error) {
    console.error('Error al generar reporte:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar el reporte financiero',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
