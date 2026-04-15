import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener balance de relación de gastos entre admin y propietarios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    // Obtener todos los propietarios
    const owners = await db.user.findMany({
      where: {
        role: 'PROPIETARIO',
        isActive: true,
        ...(ownerId ? { id: ownerId } : {}),
      },
      include: {
        propertiesAsOwner: {
          select: { id: true, title: true },
        },
      },
    });

    const balances = await Promise.all(
      owners.map(async (owner) => {
        // Obtener IDs de propiedades del propietario
        const propertyIds = owner.propertiesAsOwner.map(p => p.id);

        // Gastos pagados por admin pendientes de reembolso
        const pendingExpenses = await db.expense.findMany({
          where: {
            propertyId: { in: propertyIds },
            paidByAdmin: true,
            reimbursedByOwner: false,
          },
          include: {
            property: {
              select: { id: true, title: true },
            },
          },
          orderBy: { expenseDate: 'desc' },
        });

        // Gastos ya reembolsados
        const reimbursedExpenses = await db.expense.findMany({
          where: {
            propertyId: { in: propertyIds },
            paidByAdmin: true,
            reimbursedByOwner: true,
          },
          include: {
            property: {
              select: { id: true, title: true },
            },
          },
          orderBy: { expenseDate: 'desc' },
        });

        // Pagos realizados por el propietario
        const ownerPayments = await db.ownerPayment.findMany({
          where: {
            ownerId: owner.id,
          },
          orderBy: { paymentDate: 'desc' },
        });

        // Calcular totales
        const totalPending = pendingExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
        const totalReimbursed = reimbursedExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
        const totalPayments = ownerPayments.reduce((sum, p) => sum + p.amount, 0);
        const balance = totalPayments - totalPending;

        return {
          owner: {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            phone: owner.phone,
            propertiesCount: owner.propertiesAsOwner.length,
          },
          pendingExpenses: pendingExpenses.map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate,
            category: e.category,
            property: e.property,
          })),
          reimbursedExpenses: reimbursedExpenses.map(e => ({
            id: e.id,
            description: e.description || e.title,
            amount: e.totalAmount,
            date: e.expenseDate,
            category: e.category,
            property: e.property,
            reimbursedAt: e.reimbursedAt,
          })),
          ownerPayments: ownerPayments.map(p => ({
            id: p.id,
            amount: p.amount,
            date: p.paymentDate,
            method: p.paymentMethod,
            reference: p.referenceNumber,
            notes: p.notes,
          })),
          totals: {
            pending: totalPending,
            reimbursed: totalReimbursed,
            payments: totalPayments,
            balance: balance, // Positivo = saldo a favor, Negativo = debe dinero
          },
        };
      })
    );

    // Calcular totales generales
    const generalTotals = balances.reduce(
      (acc, b) => ({
        totalPending: acc.totalPending + b.totals.pending,
        totalReimbursed: acc.totalReimbursed + b.totals.reimbursed,
        totalPayments: acc.totalPayments + b.totals.payments,
        totalBalance: acc.totalBalance + b.totals.balance,
      }),
      { totalPending: 0, totalReimbursed: 0, totalPayments: 0, totalBalance: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        owners: balances,
        totals: generalTotals,
      },
    });
  } catch (error) {
    console.error('Error al obtener balance:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el balance de gastos' },
      { status: 500 }
    );
  }
}
