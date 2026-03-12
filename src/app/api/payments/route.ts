import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// ITBMS rate for Panama (7%)
const ITBMS_RATE = 7.0;

// Esquema de validación para crear pago
const createPaymentSchema = z.object({
  paymentType: z.enum(['ALQUILER', 'DEPOSITO', 'MANTENIMIENTO', 'COMISION', 'OTROS']),
  amount: z.number().positive('El monto debe ser positivo'),
  includeItbms: z.boolean().default(true),
  referenceNumber: z.string().optional(),
  paymentMethod: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA']).optional(),
  status: z.enum(['PENDIENTE', 'PAGADO', 'ATRASADO', 'PARCIAL', 'CANCELADO']).default('PENDIENTE'),
  paidAt: z.string().transform(val => new Date(val)).optional(),
  dueDate: z.string().transform(val => new Date(val)),
  receiptImage: z.string().optional(),
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  userId: z.string().min(1, 'El usuario es requerido'),
  contractId: z.string().optional(),
});

// GET - Listar pagos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const userId = searchParams.get('userId');
    const contractId = searchParams.get('contractId');
    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Construir filtros dinámicos
    const where: Record<string, unknown> = {};

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (contractId) {
      where.contractId = contractId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (paymentType) {
      where.paymentType = paymentType.toUpperCase();
    }

    // Filtro por rango de fechas
    if (startDate && endDate) {
      where.dueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Filtro por mes y año
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59);
      
      where.dueDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const payments = await db.payment.findMany({
      where,
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
      orderBy: {
        dueDate: 'desc',
      },
    });

    // Calcular estadísticas
    const totalAmount = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalITBMS = payments.reduce((sum, p) => sum + p.itbmsAmount, 0);
    const totalBase = payments.reduce((sum, p) => sum + p.amount, 0);

    const byStatus = {
      pendiente: {
        count: payments.filter(p => p.status === 'PENDIENTE').length,
        total: payments
          .filter(p => p.status === 'PENDIENTE')
          .reduce((sum, p) => sum + p.totalAmount, 0),
      },
      pagado: {
        count: payments.filter(p => p.status === 'PAGADO').length,
        total: payments
          .filter(p => p.status === 'PAGADO')
          .reduce((sum, p) => sum + p.totalAmount, 0),
      },
      atrasado: {
        count: payments.filter(p => p.status === 'ATRASADO').length,
        total: payments
          .filter(p => p.status === 'ATRASADO')
          .reduce((sum, p) => sum + p.totalAmount, 0),
      },
      parcial: {
        count: payments.filter(p => p.status === 'PARCIAL').length,
        total: payments
          .filter(p => p.status === 'PARCIAL')
          .reduce((sum, p) => sum + p.totalAmount, 0),
      },
      cancelado: {
        count: payments.filter(p => p.status === 'CANCELADO').length,
        total: payments
          .filter(p => p.status === 'CANCELADO')
          .reduce((sum, p) => sum + p.totalAmount, 0),
      },
    };

    const byType = payments.reduce((acc, payment) => {
      const type = payment.paymentType;
      if (!acc[type]) {
        acc[type] = { count: 0, total: 0 };
      }
      acc[type].count++;
      acc[type].total += payment.totalAmount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // Identificar pagos vencidos
    const today = new Date();
    const overduePayments = payments.filter(
      p => p.status === 'PENDIENTE' && new Date(p.dueDate) < today
    );

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
      summary: {
        totalAmount,
        totalITBMS,
        totalBase,
        byStatus,
        byType,
        overdueCount: overduePayments.length,
        overdueTotal: overduePayments.reduce((sum, p) => sum + p.totalAmount, 0),
      },
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los pagos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Registrar pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = createPaymentSchema.parse(body);

    // Verificar que la propiedad existe
    const property = await db.property.findUnique({
      where: { id: validatedData.propertyId },
    });

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: 'La propiedad especificada no existe',
        },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await db.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'El usuario especificado no existe',
        },
        { status: 400 }
      );
    }

    // Si hay contrato, verificar que existe
    if (validatedData.contractId) {
      const contract = await db.contract.findUnique({
        where: { id: validatedData.contractId },
      });

      if (!contract) {
        return NextResponse.json(
          {
            success: false,
            error: 'El contrato especificado no existe',
          },
          { status: 400 }
        );
      }
    }

    // Calcular ITBMS y total
    const itbmsAmount = validatedData.includeItbms
      ? validatedData.amount * (ITBMS_RATE / 100)
      : 0;
    const totalAmount = validatedData.amount + itbmsAmount;

    // Crear el pago
    const payment = await db.payment.create({
      data: {
        paymentType: validatedData.paymentType,
        amount: validatedData.amount,
        itbmsAmount: itbmsAmount,
        totalAmount: totalAmount,
        referenceNumber: validatedData.referenceNumber,
        paymentMethod: validatedData.paymentMethod,
        status: validatedData.status,
        paidAt: validatedData.paidAt,
        dueDate: validatedData.dueDate,
        receiptImage: validatedData.receiptImage,
        propertyId: validatedData.propertyId,
        userId: validatedData.userId,
        contractId: validatedData.contractId,
      },
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

    // Si el pago está marcado como PAGADO, crear notificación
    if (validatedData.status === 'PAGADO') {
      // Notificar al administrador
      await db.notification.create({
        data: {
          title: 'Pago registrado',
          message: `Se ha registrado un pago de $${totalAmount.toFixed(2)} para ${property.title}`,
          type: 'PAYMENT_RECEIVED',
          userId: property.adminId,
          link: `/payments/${payment.id}`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: payment,
        message: 'Pago registrado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear pago:', error);

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
        error: 'Error al registrar el pago',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
