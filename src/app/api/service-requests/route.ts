import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all service requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const tenantId = searchParams.get('tenantId');

    const where: Record<string, string> = {};
    if (propertyId) where.propertyId = propertyId;
    if (tenantId) where.tenantId = tenantId;

    const serviceRequests = await db.serviceRequest.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true }
        },
        tenant: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(serviceRequests);
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return NextResponse.json({ error: 'Error fetching service requests' }, { status: 500 });
  }
}

// POST - Create new service request
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const serviceRequest = await db.serviceRequest.create({
      data: {
        title: data.title,
        description: data.description || '',
        priority: data.priority || 'medium',
        status: data.status || 'pending',
        category: data.category || 'other',
        images: data.images ? JSON.stringify(data.images) : null,
        propertyId: data.propertyId,
        tenantId: data.tenantId || null
      }
    });

    return NextResponse.json(serviceRequest);
  } catch (error) {
    console.error('Error creating service request:', error);
    return NextResponse.json({ error: 'Error creating service request' }, { status: 500 });
  }
}
