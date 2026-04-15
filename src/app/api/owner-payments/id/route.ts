import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updatePaymentSchema = z.object({
  amount: z.number().min(0.01).optional(),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receiptImage: z.string().optional().nullable(),
});

// GET - Obtener un pago específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const payment = await db.ownerPayment.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el pago' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un pago
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePaymentSchema.parse(body);

    const existingPayment = await db.ownerPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount;
    }
    if (validatedData.paymentDate !== undefined) {
      updateData.paymentDate = new Date(validatedData.paymentDate);
    }
    if (validatedData.paymentMethod !== undefined) {
      updateData.paymentMethod = validatedData.paymentMethod;
    }
    if (validatedData.referenceNumber !== undefined) {
      updateData.referenceNumber = validatedData.referenceNumber;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }
    if (validatedData.receiptImage !== undefined) {
      updateData.receiptImage = validatedData.receiptImage;
    }

    const payment = await db.ownerPayment.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Pago actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el pago' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un pago
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingPayment = await db.ownerPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    await db.ownerPayment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pago eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el pago' },
      { status: 500 }
    );
  }
}
