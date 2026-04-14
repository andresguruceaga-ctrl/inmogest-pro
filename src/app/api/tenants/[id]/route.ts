import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - Update tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const tenant = await db.tenant.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        dni: data.dni,
        contractStart: data.contractStart ? new Date(data.contractStart) : null,
        contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
        propertyId: data.propertyId || null
      }
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json({ error: 'Error updating tenant' }, { status: 500 });
  }
}

// DELETE - Delete tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.tenant.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json({ error: 'Error deleting tenant' }, { status: 500 });
  }
}
