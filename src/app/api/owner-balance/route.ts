// Version 2 - Fixed ownerPayment query
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Obtener balance de gastos por propiedad
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const propertyId = searchParams.get('propertyId');

    // Si es propietario, solo puede ver sus propios datos
    const effectiveOwnerId = session.user.role === 'PROPIETARIO'
      ? session.user.id
      : ownerId;

    // Construir filtro de propiedades
    const propertyWhere: Record<string, unknown> = {};
    if (effectiveOwnerId) {
      propertyWhere.ownerId = effectiveOwnerId;
    }
    if (propertyId) {
      propertyWhere.id = propertyId;
    }

    // Obtener todas las propiedades con sus propietarios
    const properties = await prisma.property.findMany({
      where: propertyWhere,
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

    // Filtrar propiedades que tienen owner
    const propertiesWithOwner = properties.filter(p => p.ownerId && p.owner);

    // Obtener IDs de propiedades
    const propertyIds = propertiesWithOwner.map(p => p.id);

    // Obtener gastos pagados por admin que no han sido reembolsados
    const adminExpenses = await prisma.expense.findMany({
      where: {
        propertyId: { in: propertyIds },
        paidByAdmin: true,
        reimbursedByOwner: false
      }
    });

    // Obtener pagos de propietarios (sin filtrar por propertyId ya que no existe la columna aún)
    const ownerPayments = await prisma.ownerPayment.findMany({
      where: effectiveOwnerId ? { ownerId: effectiveOwnerId } : {}
    });

    // Construir balance por propiedad
    const propertyBalances = propertiesWithOwner.map(property => {
      if (!property.owner) return null;

      // Gastos pendientes de reembolso para esta propiedad
      const pendingExpenses = adminExpenses
        .filter(e => e.propertyId === property.id)
        .map(e => ({
          id: e.id,
          description: e.description || e.title,
          amount: e.amount,
          date: e.expenseDate.toISOString(),
          category: e.category,
        }));

      // Pagos del propietario para esta propiedad
      // Por ahora asignamos todos los pagos del owner a todas sus propiedades
      // hasta que se agregue la columna propertyId
      const propertyPayments = ownerPayments
        .filter(p => p.ownerId === property.ownerId)
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

      return {
        property: {
          id: property.id,
          title: property.title,
          address: property.address,
        },
        owner: {
          id: property.owner.id,
          name: property.owner.name || 'Sin nombre',
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
      };
    }).filter(Boolean);

    // Calcular totales generales
    const totals = {
      totalPending: propertyBalances.reduce((sum, p) => sum + (p?.totals.pending || 0), 0),
      totalPayments: propertyBalances.reduce((sum, p) => sum + (p?.totals.payments || 0), 0),
      totalBalance: propertyBalances.reduce((sum, p) => sum + (p?.totals.balance || 0), 0),
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