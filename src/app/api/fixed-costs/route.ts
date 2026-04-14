import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all fixed costs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    const where = propertyId ? { propertyId } : {};

    const fixedCosts = await db.fixedCost.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true }
        },
        supplier: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(fixedCosts);
  } catch (error) {
    console.error('Error fetching fixed costs:', error);
    return NextResponse.json({ error: 'Error fetching fixed costs' }, { status: 500 });
  }
}

// POST - Create new fixed cost
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const fixedCost = await db.fixedCost.create({
      data: {
        concept: data.concept,
        category: data.category || 'other',
        amount: parseFloat(data.amount) || 0,
        periodicity: data.periodicity || 'monthly',
        nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : null,
        isActive: data.isActive ?? true,
        notes: data.notes || '',
        propertyId: data.propertyId,
        supplierId: data.supplierId || null
      }
    });

    return NextResponse.json(fixedCost);
  } catch (error) {
    console.error('Error creating fixed cost:', error);
    return NextResponse.json({ error: 'Error creating fixed cost' }, { status: 500 });
  }
}
