import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener balance de gastos por propiedad
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const propertyId = searchParams.get('propertyId');

    // Obtener todas las propiedades con sus propietarios
    const properties = await db.property.findMany({
      where: {
        ownerId: { not: null }, // Solo propiedades con propietario
        ...(ownerId && { ownerId }),
        ...(propertyId && { id: propertyId }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Obtener gastos pagados por admin (paidByAdmin = true) agrupados por propiedad
    const adminExpenses = await db.expense.findMany({
      where: {
        paidByAdmin: true,
        propertyId: { not: null },
        ...(propertyId && { propertyId }),
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
      },
    });

    // Obtener pagos de propietarios
    const ownerPayments = await db.ownerPayment.findMany({
      where: {
        propertyId: { not: null },
        ...(propertyId && { propertyId }),
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
      },
    });

    // Construir balance por propiedad
    const propertyBalances: Array<{
      property: {
        id: string;
        title: string;
        address: string | null;
      };
      owner: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
      };
      pendingExpenses: Array<{
        id: string;
        description: string;
        amount: number;
        date: string;
        category: string;
      }>;
      ownerPayments: Array<{
        id: string;
        amount: number;
        date: string;
        method: string | null;
        reference: string | null;
        notes: string | null;
      }>;
      totals: {
        pending: number;
        payments: number;
        balance: number;
      };
    }> = [];

    // Procesar cada propiedad
    for (const property of properties) {
      if (!property.owner) continue;

      // Gastos pendientes de reembolso para esta propiedad
      const pendingExpenses = adminExpenses
        .filter(e => e.propertyId === property.id && !e.reimbursedByOwner)
        .map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          date: e.date.toISOString(),
          category: e.category,
        }));

      // Pagos del propietario para esta propiedad
      const propertyPayments = ownerPayments
        .filter(p => p.propertyId === property.id)
        .map(p => ({
          id: p.id,
          amount: p.amount,
          date: p.paymentDate.toISOString(),
          method: p.paymentMethod,
          reference: p.referenceNumber,
          notes: p.notes,
        }));

      const totalPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPayments = propertyPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalPayments - totalPending;

      propertyBalances.push({
        property: {
          id: property.id,
          title: property.title,
          address: property.address,
        },
        owner: {
          id: property.owner.id,
          name: property.owner.name,
          email: property.owner.email,
          phone: property.owner.phone,
        },
        pendingExpenses,
        ownerPayments: propertyPayments,
        totals: {
          pending: totalPending,
          payments: totalPayments,
          balance,
        },
      });
    }

    // Calcular totales generales
    const totals = {
      totalPending: propertyBalances.reduce((sum, p) => sum + p.totals.pending, 0),
      totalPayments: propertyBalances.reduce((sum, p) => sum + p.totals.payments, 0),
      totalBalance: propertyBalances.reduce((sum, p) => sum + p.totals.balance, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        properties: propertyBalances,
        totals,
      },
    });
  } catch (error) {
    console.error('Error al obtener balance:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el balance de propiedades' },
      { status: 500 }
    );
  }
}
