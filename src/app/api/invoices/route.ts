import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    const where = propertyId ? { propertyId } : {};

    const invoices = await db.invoice.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true }
        },
        supplier: {
          select: { id: true, name: true }
        }
      },
      orderBy: { issueDate: 'desc' }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Error fetching invoices' }, { status: 500 });
  }
}

// POST - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber || '',
        concept: data.concept,
        category: data.category || 'other',
        amount: parseFloat(data.amount) || 0,
        taxAmount: data.taxAmount ? parseFloat(data.taxAmount) : null,
        totalAmount: parseFloat(data.totalAmount) || 0,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        status: data.status || 'pending',
        fileUrl: data.fileUrl || '',
        notes: data.notes || '',
        propertyId: data.propertyId,
        supplierId: data.supplierId || null
      }
    });

    // Update supplier invoice count
    if (data.supplierId) {
      await db.supplier.update({
        where: { id: data.supplierId },
        data: { invoiceCount: { increment: 1 } }
      });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Error creating invoice' }, { status: 500 });
  }
}
