import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all suppliers
export async function GET() {
  try {
    const suppliers = await db.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Error fetching suppliers' }, { status: 500 });
  }
}

// POST - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const supplier = await db.supplier.create({
      data: {
        name: data.name,
        category: data.category || 'other',
        contactName: data.contactName || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        dni: data.dni || '',
        cif: data.cif || '',
        notes: data.notes || ''
      }
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Error creating supplier' }, { status: 500 });
  }
}
