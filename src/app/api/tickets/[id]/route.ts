import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquema de validación para actualizar ticket
const updateTicketSchema = z.object({
  title: z.string().min(1, 'El título es requerido').optional(),
  description: z.string().min(1, 'La descripción es requerida').optional(),
  category: z.string().optional(),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).optional(),
  status: z.enum(['ABIERTO', 'EN_PROCESO', 'RESUELTO', 'CERRADO']).optional(),
  photos: z.string().optional(),
  response: z.string().optional(),
  respondedBy: z.string().optional(),
});

// GET - Obtener detalle de ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            province: true,
            district: true,
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
    });

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket no encontrado',
        },
        { status: 404 }
      );
    }

    // Calcular tiempo transcurrido
    const timeElapsed = {
      created: ticket.createdAt,
      responded: ticket.respondedAt,
      resolved: ticket.resolvedAt,
      hoursSinceCreated: Math.round(
        (new Date().getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60) * 10
      ) / 10,
      hoursToResponse: ticket.respondedAt
        ? Math.round(
            (ticket.respondedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60) * 10
          ) / 10
        : null,
      hoursToResolution: ticket.resolvedAt
        ? Math.round(
            (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60) * 10
          ) / 10
        : null,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        timeElapsed,
      },
    });
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el ticket',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar ticket (responder/cambiar estado)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = updateTicketSchema.parse(body);

    // Verificar que el ticket existe
    const existingTicket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            adminId: true,
          },
        },
      },
    });

    if (!existingTicket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket no encontrado',
        },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = { ...validatedData };

    // Si hay respuesta, marcar fecha de respuesta
    if (validatedData.response && !existingTicket.respondedAt) {
      updateData.respondedAt = new Date();
    }

    // Si el estado cambia a RESUELTO, marcar fecha de resolución
    if (validatedData.status === 'RESUELTO' && existingTicket.status !== 'RESUELTO') {
      updateData.resolvedAt = new Date();
    }

    // Si el estado cambia a CERRADO, marcar fecha de resolución si no existe
    if (validatedData.status === 'CERRADO' && !existingTicket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    // Actualizar el ticket
    const ticket = await db.supportTicket.update({
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
      },
    });

    // Crear notificación para el usuario que creó el ticket
    if (validatedData.response || validatedData.status) {
      await db.notification.create({
        data: {
          title: 'Actualización de ticket',
          message: validatedData.response 
            ? `Su ticket "${existingTicket.title}" ha recibido una respuesta.`
            : `El estado de su ticket "${existingTicket.title}" ha cambiado a ${validatedData.status}.`,
          type: 'TICKET_UPDATED',
          userId: existingTicket.userId,
          link: `/tickets/${id}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar ticket:', error);

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
        error: 'Error al actualizar el ticket',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar que el ticket existe
    const existingTicket = await db.supportTicket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket no encontrado',
        },
        { status: 404 }
      );
    }

    // Eliminar el ticket
    await db.supportTicket.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el ticket',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
