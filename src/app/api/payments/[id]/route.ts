import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para actualizar pago
const updatePaymentSchema = z.object({
  paymentType: z.enum(['ALQUILER', 'DEPOSITO', 'MANTENIMIENTO', 'COMISION', 'OTROS']).optional(),
  amount: z.number().positive('El monto debe ser positivo').optional(),
  referenceNumber: z.string().optional().nullable(),
  paymentMethod: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA']).optional().nullable(),
  status: z.enum(['PENDIENTE', 'PAGADO', 'ATRASADO', 'PARCIAL', 'CANCELADO']).optional(),
  paidAt: z.string().optional().nullable(),
  dueDate: z.string().optional(),
  receiptImage: z.string().optional().nullable(),
  propertyId: z.string().optional(),
  userId: z.string().optional(),
  contractId: z.string().optional().nullable(),
});

// GET - Obtener un pago específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrismaClient();
  
  try {
    const { id } = await params;
    
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            province: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        contract: {
          select: {
            id: true,
            contractNumber: true,
            contractType: true,
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

    console.log('===== ACTUALIZAR PAGO =====');
    console.log('Payment ID:', id);
    console.log('Received data:', JSON.stringify(body, null, 2));

    // Verificar que el pago existe
    const existingPayment = await prisma.payment.findUnique({
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

    // Si se actualiza la propiedad, verificar que existe
    if (validatedData.propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: validatedData.propertyId },
      });

      if (!property) {
        return NextResponse.json(
          { success: false, error: 'La propiedad especificada no existe' },
          { status: 400 }
        );
      }
    }

    // Si se actualiza el usuario, verificar que existe
    if (validatedData.userId) {
      const user = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'El usuario especificado no existe' },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualización
    const updateData: Record<string, unknown> = {};

    if (validatedData.paymentType) updateData.paymentType = validatedData.paymentType;
    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount;
      updateData.itbmsAmount = 0;
      updateData.totalAmount = validatedData.amount;
    }
    if (validatedData.referenceNumber !== undefined) updateData.referenceNumber = validatedData.referenceNumber;
    if (validatedData.paymentMethod !== undefined) updateData.paymentMethod = validatedData.paymentMethod;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.paidAt !== undefined) {
      updateData.paidAt = validatedData.paidAt ? new Date(validatedData.paidAt) : null;
    }
    if (validatedData.dueDate) updateData.dueDate = new Date(validatedData.dueDate);
    if (validatedData.receiptImage !== undefined) updateData.receiptImage = validatedData.receiptImage;
    if (validatedData.propertyId) updateData.propertyId = validatedData.propertyId;
    if (validatedData.userId) updateData.userId = validatedData.userId;
    if (validatedData.contractId !== undefined) updateData.contractId = validatedData.contractId;

    console.log('Update data:', JSON.stringify(updateData, null, 2));

    // Actualizar el pago
    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contract: {
          select: {
            id: true,
            contractNumber: true,
          },
        },
      },
    });

    console.log('Payment updated:', {
      id: payment.id,
      amount: payment.amount,
      totalAmount: payment.totalAmount,
    });
    console.log('===== FIN =====');

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
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el pago
    await prisma.payment.delete({
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
