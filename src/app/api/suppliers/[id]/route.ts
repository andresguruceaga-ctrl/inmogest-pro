import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - Update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        dni: data.dni,
        cif: data.cif,
        notes: data.notes
      }
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Error updating supplier' }, { status: 500 });
  }
}

// DELETE - Delete supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.supplier.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Error deleting supplier' }, { status: 500 });
  }
}
