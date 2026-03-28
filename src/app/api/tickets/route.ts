import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para crear ticket
const createTicketSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  category: z.string().optional().nullable(),
  priority: z.string().default('MEDIA'),
  photos: z.string().optional().nullable(),
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  userId: z.string().min(1, 'El usuario es requerido'),
});

// GET - Listar tickets de soporte
export async function GET(request: NextRequest) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');

    // Construir filtros dinámicos
    const where: Record<string, unknown> = {};

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (priority) {
      where.priority = priority.toUpperCase();
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
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
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Calcular estadísticas
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'ABIERTO').length,
      inProgress: tickets.filter(t => t.status === 'EN_PROCESO').length,
      resolved: tickets.filter(t => t.status === 'RESUELTO').length,
      closed: tickets.filter(t => t.status === 'CERRADO').length,
      urgent: tickets.filter(t => t.priority === 'URGENTE').length,
      high: tickets.filter(t => t.priority === 'ALTA').length,
      medium: tickets.filter(t => t.priority === 'MEDIA').length,
      low: tickets.filter(t => t.priority === 'BAJA').length,
    };

    return NextResponse.json({
      success: true,
      data: tickets,
      count: tickets.length,
      stats,
    });
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los tickets',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Crear ticket
export async function POST(request: NextRequest) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const body = await request.json();
    console.log('Received ticket data:', JSON.stringify(body, null, 2));

    // Validar datos de entrada
    const validatedData = createTicketSchema.parse(body);

    // Verificar que la propiedad existe
    const property = await prisma.property.findUnique({
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
    const user = await prisma.user.findUnique({
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

    // Crear el ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category ?? null,
        priority: validatedData.priority as any,
        status: 'ABIERTO',
        photos: validatedData.photos ?? null,
        propertyId: validatedData.propertyId,
        userId: validatedData.userId,
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
      },
    });

    // Crear notificación para el administrador de la propiedad
    if (property.adminId) {
      await prisma.notification.create({
        data: {
          title: 'Nuevo ticket de soporte',
          message: `Se ha creado un nuevo ticket: ${validatedData.title}`,
          type: 'TICKET_CREATED',
          userId: property.adminId,
          link: `/tickets/${ticket.id}`,
        },
      });
    }

    console.log('Ticket created successfully:', ticket.id);

    return NextResponse.json(
      {
        success: true,
        data: ticket,
        message: 'Ticket creado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear ticket:', error);

    if (error instanceof z.ZodError) {
      console.log('Zod validation errors:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear el ticket',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
