import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

// Esquema de validación para actualizar usuario
const updateUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  avatar: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET - Obtener usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            propertiesAsOwner: true,
            propertiesAsTenant: true,
            contractsAsOwner: true,
            contractsAsTenant: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el usuario',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = updateUserSchema.parse(body);

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado',
        },
        { status: 404 }
      );
    }

    // Si se actualiza el email, verificar que no esté en uso
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailInUse) {
        return NextResponse.json(
          {
            success: false,
            error: 'El email ya está en uso por otro usuario',
          },
          { status: 400 }
        );
      }
    }

    // Preparar datos a actualizar
    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      avatar?: string | null;
      isActive?: boolean;
      password?: string;
    } = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone ?? null,
      avatar: validatedData.avatar ?? null,
      isActive: validatedData.isActive,
    };

    // Si se proporciona una nueva contraseña, hashearla
    if (validatedData.password) {
      updateData.password = await hash(validatedData.password, 10);
    }

    // Eliminar campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    // Actualizar usuario
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
      message: 'Usuario actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);

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
        error: 'Error al actualizar el usuario',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            propertiesAsOwner: true,
            contractsAsOwner: true,
            contractsAsTenant: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado',
        },
        { status: 404 }
      );
    }

    // Verificar si el usuario tiene propiedades o contratos activos
    if (existingUser._count.propertiesAsOwner > 0 || existingUser._count.contractsAsOwner > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar el usuario porque tiene propiedades o contratos asociados',
        },
        { status: 400 }
      );
    }

    // Soft delete - marcar como inactivo
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el usuario',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
