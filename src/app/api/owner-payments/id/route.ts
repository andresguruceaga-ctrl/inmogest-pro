import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para actualizar pago
const updatePaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo').optional(),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET - Obtener un pago específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrismaClient();
  
  try {
    const { id } = await params;
    
    const payment = await prisma.ownerPayment.findUnique({
      where: { id },
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

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el pago' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar pago
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrismaClient();
  
  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar que el pago existe
    const existingPayment = await prisma.ownerPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Validar datos de entrada
    const validatedData = updatePaymentSchema.parse(body);

    // Preparar datos para actualización
    const updateData: Record<string, unknown> = {};

    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.paymentDate) updateData.paymentDate = new Date(validatedData.paymentDate);
    if (validatedData.paymentMethod !== undefined) updateData.paymentMethod = validatedData.paymentMethod;
    if (validatedData.referenceNumber !== undefined) updateData.referenceNumber = validatedData.referenceNumber;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    // Actualizar el pago
    const payment = await prisma.ownerPayment.update({
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
        {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar el pago',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar pago
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrismaClient();
  
  try {
    const { id } = await params;

    // Verificar que el pago existe
    const existingPayment = await prisma.ownerPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el pago
    await prisma.ownerPayment.delete({
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
