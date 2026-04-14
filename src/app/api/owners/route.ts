import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all owners
export async function GET() {
  try {
    const owners = await db.owner.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(owners);
  } catch (error) {
    console.error('Error fetching owners:', error);
    return NextResponse.json({ error: 'Error fetching owners' }, { status: 500 });
  }
}

// POST - Create new owner
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const owner = await db.owner.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        address: data.address || '',
        dni: data.dni || '',
        properties: data.properties ? JSON.stringify(data.properties) : null
      }
    });

    return NextResponse.json(owner);
  } catch (error) {
    console.error('Error creating owner:', error);
    return NextResponse.json({ error: 'Error creating owner' }, { status: 500 });
  }
}
