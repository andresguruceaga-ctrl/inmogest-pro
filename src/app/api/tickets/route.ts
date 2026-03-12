import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquema de validación para crear ticket
const createTicketSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  category: z.string().optional(),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
  photos: z.string().optional(), // JSON array de URLs
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  userId: z.string().min(1, 'El usuario es requerido'),
});

// GET - Listar tickets de soporte
export async function GET(request: NextRequest) {
  try {
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

    const tickets = await db.supportTicket.findMany({
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
            phone: true,
            role: true,
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

    // Calcular tiempo promedio de respuesta
    const resolvedTickets = tickets.filter(t => t.respondedAt && t.createdAt);
    const avgResponseTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const diff = t.respondedAt!.getTime() - t.createdAt.getTime();
          return sum + diff;
        }, 0) / resolvedTickets.length / (1000 * 60 * 60) // en horas
      : 0;

    return NextResponse.json({
      success: true,
      data: tickets,
      count: tickets.length,
      stats: {
        ...stats,
        avgResponseTimeHours: Math.round(avgResponseTime * 10) / 10,
      },
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
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = createTicketSchema.parse(body);

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

    // Crear el ticket
    const ticket = await db.supportTicket.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        priority: validatedData.priority,
        status: 'ABIERTO',
        photos: validatedData.photos,
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
    await db.notification.create({
      data: {
        title: 'Nuevo ticket de soporte',
        message: `Se ha creado un nuevo ticket: ${validatedData.title}`,
        type: 'TICKET_CREATED',
        userId: property.adminId,
        link: `/tickets/${ticket.id}`,
      },
    });

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
        error: 'Error al crear el ticket',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
