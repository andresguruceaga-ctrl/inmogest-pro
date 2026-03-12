import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquema de validación para actualizar propiedad
const updatePropertySchema = z.object({
  title: z.string().min(1, 'El título es requerido').optional(),
  description: z.string().optional(),
  propertyType: z.enum([
    'APARTAMENTO',
    'CASA',
    'LOCAL_COMERCIAL',
    'OFICINA',
    'BODEGA',
    'TERRENO',
    'PH',
  ]).optional(),
  province: z.string().min(1, 'La provincia es requerida').optional(),
  district: z.string().min(1, 'El distrito es requerido').optional(),
  corregimiento: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().min(1, 'La dirección es requerida').optional(),
  buildingName: z.string().optional(),
  totalArea: z.number().positive('El área total debe ser positiva').optional(),
  builtArea: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parkingSpaces: z.number().int().min(0).optional(),
  floorNumber: z.number().int().optional(),
  fincaNumber: z.string().min(1, 'El número de finca es requerido').optional(),
  tomoNumber: z.string().optional(),
  folioNumber: z.string().optional(),
  asientoNumber: z.string().optional(),
  monthlyRent: z.number().positive('El alquiler mensual debe ser positivo').optional(),
  itbmsRate: z.number().min(0).max(100).optional(),
  depositAmount: z.number().min(0).optional(),
  status: z.enum(['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO', 'INACTIVA']).optional(),
  mainImage: z.string().optional(),
  images: z.string().optional(),
  ownerId: z.string().optional(),
  adminId: z.string().optional(),
  tenantId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET - Detalle de propiedad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const property = await db.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            owner: {
              select: { id: true, name: true },
            },
            tenant: {
              select: { id: true, name: true },
            },
          },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 10,
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        payments: {
          orderBy: { dueDate: 'desc' },
          take: 10,
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
          take: 10,
        },
        financialReports: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12,
        },
        _count: {
          select: {
            contracts: true,
            expenses: true,
            supportTickets: true,
            payments: true,
            documents: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: 'Propiedad no encontrada',
        },
        { status: 404 }
      );
    }

    // Calcular ITBMS y totales
    const itbmsAmount = property.monthlyRent * (property.itbmsRate / 100);
    const totalRentWithITBMS = property.monthlyRent + itbmsAmount;

    // Calcular totales de gastos
    const totalExpenses = property.expenses.reduce(
      (sum, expense) => sum + expense.totalAmount,
      0
    );

    // Calcular pagos pendientes
    const pendingPayments = property.payments.filter(
      payment => payment.status === 'PENDIENTE' || payment.status === 'ATRASADO'
    );
    const totalPending = pendingPayments.reduce(
      (sum, payment) => sum + payment.totalAmount,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        ...property,
        itbmsAmount,
        totalRentWithITBMS,
        summary: {
          totalExpenses,
          totalPendingPayments: totalPending,
          pendingPaymentsCount: pendingPayments.length,
          openTicketsCount: property.supportTickets.filter(
            t => t.status === 'ABIERTO' || t.status === 'EN_PROCESO'
          ).length,
          activeContractsCount: property.contracts.filter(
            c => c.status === 'VIGENTE'
          ).length,
        },
      },
    });
  } catch (error) {
    console.error('Error al obtener propiedad:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener la propiedad',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar propiedad
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = updatePropertySchema.parse(body);

    // Verificar que la propiedad existe
    const existingProperty = await db.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      return NextResponse.json(
        {
          success: false,
          error: 'Propiedad no encontrada',
        },
        { status: 404 }
      );
    }

    // Si se actualiza el propietario, verificar que existe
    if (validatedData.ownerId) {
      const owner = await db.user.findUnique({
        where: { id: validatedData.ownerId },
      });

      if (!owner) {
        return NextResponse.json(
          {
            success: false,
            error: 'El propietario especificado no existe',
          },
          { status: 400 }
        );
      }
    }

    // Si se actualiza el administrador, verificar que existe
    if (validatedData.adminId) {
      const admin = await db.user.findUnique({
        where: { id: validatedData.adminId },
      });

      if (!admin) {
        return NextResponse.json(
          {
            success: false,
            error: 'El administrador especificado no existe',
          },
          { status: 400 }
        );
      }
    }

    // Si se actualiza el inquilino, verificar que existe
    if (validatedData.tenantId) {
      const tenant = await db.user.findUnique({
        where: { id: validatedData.tenantId },
      });

      if (!tenant) {
        return NextResponse.json(
          {
            success: false,
            error: 'El inquilino especificado no existe',
          },
          { status: 400 }
        );
      }
    }

    // Actualizar la propiedad
    const property = await db.property.update({
      where: { id },
      data: validatedData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Calcular ITBMS actualizado
    const itbmsAmount = property.monthlyRent * (property.itbmsRate / 100);
    const totalRentWithITBMS = property.monthlyRent + itbmsAmount;

    return NextResponse.json({
      success: true,
      data: {
        ...property,
        itbmsAmount,
        totalRentWithITBMS,
      },
      message: 'Propiedad actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar propiedad:', error);

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
        error: 'Error al actualizar la propiedad',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar propiedad (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar que la propiedad existe
    const existingProperty = await db.property.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contracts: { where: { status: 'VIGENTE' } },
            payments: { where: { status: 'PENDIENTE' } },
          },
        },
      },
    });

    if (!existingProperty) {
      return NextResponse.json(
        {
          success: false,
          error: 'Propiedad no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar si hay contratos vigentes o pagos pendientes
    if (existingProperty._count.contracts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar la propiedad porque tiene contratos vigentes',
        },
        { status: 400 }
      );
    }

    // Soft delete - marcar como inactiva
    await db.property.update({
      where: { id },
      data: {
        isActive: false,
        status: 'INACTIVA',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Propiedad eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar propiedad:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar la propiedad',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
