import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - Update service request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const serviceRequest = await db.serviceRequest.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        category: data.category,
        images: data.images ? JSON.stringify(data.images) : undefined,
        resolvedAt: data.status === 'resolved' ? new Date() : undefined
      }
    });

    return NextResponse.json(serviceRequest);
  } catch (error) {
    console.error('Error updating service request:', error);
    return NextResponse.json({ error: 'Error updating service request' }, { status: 500 });
  }
}
