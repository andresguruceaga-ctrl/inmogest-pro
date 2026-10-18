import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api-auth';
import { canAccessProperty } from '@/lib/authorization';

const recurringExpenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'El nombre del gasto fijo es requerido'),
  description: z.string().optional().nullable(),
  category: z.enum(['MANTENIMIENTO_PH', 'SEGURO', 'SERVICIOS_BASICOS', 'REPARACION', 'SERVICIO_TECNICO', 'IMPUESTOS', 'COMISION_ADMIN', 'OTROS']),
  amount: z.number().positive('El monto del gasto fijo debe ser mayor que cero'),
  frequencyMonths: z.union([z.literal(1), z.literal(3), z.literal(4), z.literal(6), z.literal(12)]),
  startsAt: z.string().date(),
  endsAt: z.string().date().optional().nullable(),
  paidByAdmin: z.boolean(),
}).refine(expense => !expense.startsAt || !expense.endsAt || expense.endsAt >= expense.startsAt, {
  message: 'La fecha final debe ser igual o posterior a la fecha inicial',
  path: ['endsAt'],
});

// Esquema de validación para actualizar propiedad
const updatePropertySchema = z.object({
  title: z.string().min(1, 'El título es requerido').optional(),
  description: z.string().optional().nullable(),
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
  corregimiento: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  address: z.string().min(1, 'La dirección es requerida').optional(),
  buildingName: z.string().optional().nullable(),
  hasTerrace: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  hasDen: z.boolean().optional(),
  hasSocialArea: z.boolean().optional(),
  socialAreaDescription: z.string().optional().nullable(),
  hasMaidRoomBathroom: z.boolean().optional(),
  phContactName: z.string().optional().nullable(),
  phContactPhone: z.string().optional().nullable(),
  phContactEmail: z.union([z.string().email('El correo del PH no es válido'), z.literal('')]).optional().nullable(),
  totalArea: z.number().positive('El área total debe ser positiva').optional(),
  builtArea: z.number().positive().optional().nullable(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parkingSpaces: z.number().int().min(0).optional(),
  floorNumber: z.number().int().optional().nullable(),
  fincaNumber: z.string().optional().nullable(),
  tomoNumber: z.string().optional().nullable(),
  folioNumber: z.string().optional().nullable(),
  asientoNumber: z.string().optional().nullable(),
  monthlyRent: z.number().min(0, 'El alquiler mensual debe ser válido').optional(),
  depositAmount: z.number().min(0).optional().nullable(),
  status: z.enum(['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO', 'INACTIVA']).optional(),
  mainImage: z.string().optional().nullable(),
  images: z.string().optional().nullable(),
  ownerId: z.string().optional(),
  adminId: z.string().optional(),
  tenantId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  forSale: z.boolean().optional(),
  salePrice: z.number().min(0).nullable().optional(),
  saleDescription: z.string().optional().nullable(),
  forRent: z.boolean().optional(),
  recurringExpenses: z.array(recurringExpenseSchema).optional(),
}).refine(property => property.forSale !== false || property.forRent !== false, {
  message: 'La propiedad debe estar disponible para venta, alquiler o ambos',
  path: ['forRent'],
});

// GET - Detalle de propiedad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;
  
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    prisma = getPrismaClient();
    const { id } = await params;

    const property = await prisma.property.findUnique({
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
        recurringExpenses: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
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

    if (!canAccessProperty(auth.user, property)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const isTenant = auth.user.role === 'INQUILINO';
    const visibleExpenses = isTenant ? [] : property.expenses;
    const visiblePayments = isTenant
      ? property.payments.filter(payment => payment.userId === auth.user.id)
      : property.payments;
    const visibleTickets = isTenant
      ? property.supportTickets.filter(ticket => ticket.userId === auth.user.id)
      : property.supportTickets;
    const visibleContracts = isTenant
      ? property.contracts.filter(contract => contract.tenantId === auth.user.id)
      : property.contracts;

    // Calcular totales de gastos
    const totalExpenses = visibleExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Calcular pagos pendientes
    const pendingPayments = visiblePayments.filter(
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
        expenses: visibleExpenses,
        payments: visiblePayments,
        supportTickets: visibleTickets,
        contracts: visibleContracts,
        financialReports: isTenant ? [] : property.financialReports,
        summary: {
          totalExpenses,
          totalPendingPayments: totalPending,
          pendingPaymentsCount: pendingPayments.length,
          openTicketsCount: visibleTickets.filter(
            t => t.status === 'ABIERTO' || t.status === 'EN_PROCESO'
          ).length,
          activeContractsCount: visibleContracts.filter(
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
  let prisma;

  try {
    const auth = await requireApiUser(['ADMIN']);
    if (!auth.ok) return auth.response;

    prisma = getPrismaClient();
    const { id } = await params;
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = updatePropertySchema.parse(body);

    // Verificar que la propiedad existe
    const existingProperty = await prisma.property.findUnique({
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
      const owner = await prisma.user.findUnique({
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
      const admin = await prisma.user.findUnique({
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
      const tenant = await prisma.user.findUnique({
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

    const { recurringExpenses, ...propertyData } = validatedData;
    const property = await prisma.$transaction(async tx => {
      await tx.property.update({
        where: { id },
        data: {
          ...propertyData,
          socialAreaDescription: propertyData.hasSocialArea === false ? null : propertyData.socialAreaDescription,
          phContactEmail: propertyData.phContactEmail === undefined ? undefined : propertyData.phContactEmail || null,
        },
      });

      if (recurringExpenses) {
        const existingTemplates = await tx.recurringExpense.findMany({
          where: { propertyId: id },
          select: { id: true },
        });
        const existingIds = new Set(existingTemplates.map(template => template.id));
        const submittedIds = recurringExpenses.flatMap(expense => expense.id ? [expense.id] : []);
        if (submittedIds.some(templateId => !existingIds.has(templateId))) {
          throw new Error('Uno de los gastos recurrentes no pertenece a esta propiedad');
        }

        await tx.recurringExpense.updateMany({
          where: { propertyId: id, id: { notIn: submittedIds } },
          data: { isActive: false },
        });

        for (const expense of recurringExpenses) {
          const templateData = {
            title: expense.title,
            description: expense.description || null,
            category: expense.category,
            amount: expense.amount,
            frequencyMonths: expense.frequencyMonths,
            startsAt: expense.startsAt ? new Date(`${expense.startsAt}T00:00:00.000Z`) : null,
            endsAt: expense.endsAt ? new Date(`${expense.endsAt}T23:59:59.999Z`) : null,
            paidByAdmin: expense.paidByAdmin,
            isActive: true,
          };
          if (expense.id) {
            await tx.recurringExpense.update({ where: { id: expense.id }, data: templateData });
          } else {
            await tx.recurringExpense.create({ data: { ...templateData, propertyId: id } });
          }
        }
      }

      return tx.property.findUniqueOrThrow({
        where: { id },
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
          admin: { select: { id: true, name: true, email: true, phone: true } },
          tenant: { select: { id: true, name: true, email: true, phone: true } },
          recurringExpenses: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: property,
      message: 'Propiedad actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar propiedad:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.issues,
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
  let prisma;

  try {
    const auth = await requireApiUser(['ADMIN']);
    if (!auth.ok) return auth.response;

    prisma = getPrismaClient();
    const { id } = await params;

    // Verificar que la propiedad existe
    const existingProperty = await prisma.property.findUnique({
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
    await prisma.property.update({
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
