import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - Update fixed cost
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const fixedCost = await db.fixedCost.update({
      where: { id },
      data: {
        concept: data.concept,
        category: data.category,
        amount: parseFloat(data.amount) || 0,
        periodicity: data.periodicity,
        nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : null,
        isActive: data.isActive,
        notes: data.notes,
        supplierId: data.supplierId || null
      }
    });

    return NextResponse.json(fixedCost);
  } catch (error) {
    console.error('Error updating fixed cost:', error);
    return NextResponse.json({ error: 'Error updating fixed cost' }, { status: 500 });
  }
}

// DELETE - Delete fixed cost
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.fixedCost.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fixed cost:', error);
    return NextResponse.json({ error: 'Error deleting fixed cost' }, { status: 500 });
  }
}
