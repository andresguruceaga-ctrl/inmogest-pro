import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        invoiceNumber: data.invoiceNumber,
        concept: data.concept,
        category: data.category,
        amount: parseFloat(data.amount) || 0,
        taxAmount: data.taxAmount ? parseFloat(data.taxAmount) : null,
        totalAmount: parseFloat(data.totalAmount) || 0,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        status: data.status,
        fileUrl: data.fileUrl,
        notes: data.notes,
        supplierId: data.supplierId || null
      }
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Error updating invoice' }, { status: 500 });
  }
}

// DELETE - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.invoice.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Error deleting invoice' }, { status: 500 });
  }
}
