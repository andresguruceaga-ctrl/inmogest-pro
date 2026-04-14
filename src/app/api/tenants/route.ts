import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all tenants
export async function GET() {
  try {
    const tenants = await db.tenant.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: 'Error fetching tenants' }, { status: 500 });
  }
}

// POST - Create new tenant
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const tenant = await db.tenant.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        dni: data.dni || '',
        contractStart: data.contractStart ? new Date(data.contractStart) : null,
        contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
        userId: data.userId || 'default-user',
        propertyId: data.propertyId || null
      }
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Error creating tenant' }, { status: 500 });
  }
}
