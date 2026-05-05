import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

// GET - Obtener un ticket especifico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            ownerId: true,
            adminId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
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

// PUT - Actualizar un ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;
    const body = await request.json();

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return NextResponse.json(
        { success: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.photos !== undefined) updateData.photos = body.photos;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;

    if (body.response !== undefined) {
      updateData.response = body.response;
      updateData.respondedAt = new Date();
      if (body.respondedBy) {
        updateData.respondedBy = body.respondedBy;
      }
    }

    if (body.status === 'RESUELTO' || body.status === 'CERRADO') {
      updateData.resolvedAt = new Date();
    }

    const updatedTicket = await prisma.supportTicket.update({
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

    if (body.status || body.response) {
      await prisma.notification.create({
        data: {
          title: 'Actualizacion de ticket',
          message: 'Tu ticket ha sido actualizado',
          type: 'TICKET_UPDATED',
          userId: updatedTicket.userId,
          link: '/soporte',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: 'Ticket actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
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

// DELETE - Eliminar un ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return NextResponse.json(
        { success: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    await prisma.supportTicket.delete({
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
