import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquema de validación
const ownerPaymentSchema = z.object({
  ownerId: z.string().min(1, 'El propietario es requerido'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  paymentDate: z.string().min(1, 'La fecha es requerida'),
  paymentMethod: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receiptImage: z.string().optional().nullable(),
});

// GET - Listar pagos de propietarios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};
    
    if (ownerId) {
      where.ownerId = ownerId;
    }
    
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate = { ...where.paymentDate, gte: new Date(startDate) };
      }
      if (endDate) {
        where.paymentDate = { ...where.paymentDate, lte: new Date(endDate) };
      }
    }

    const payments = await db.ownerPayment.findMany({
      where,
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
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los pagos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ownerPaymentSchema.parse(body);

    // Verificar que el propietario existe
    const owner = await db.user.findUnique({
      where: { id: validatedData.ownerId },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'El propietario no existe' },
        { status: 400 }
      );
    }

    const payment = await db.ownerPayment.create({
      data: {
        ownerId: validatedData.ownerId,
        amount: validatedData.amount,
        paymentDate: new Date(validatedData.paymentDate),
        paymentMethod: validatedData.paymentMethod || null,
        referenceNumber: validatedData.referenceNumber || null,
        notes: validatedData.notes || null,
        receiptImage: validatedData.receiptImage || null,
      },
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
      message: 'Pago registrado exitosamente',
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Error al registrar el pago' },
      { status: 500 }
    );
  }
}
