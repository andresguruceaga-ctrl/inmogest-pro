import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// GET - Listar todos los usuarios
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    
    const where = { isActive: true };
    if (role) {
      // @ts-ignore
      where.role = role;
    }

    const users = await db.user.findMany({
      where,
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
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los usuarios',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role } = body;

    // Validaciones
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: email, password, name, role' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un usuario con este email' },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await hash(password, 10);

    // Crear usuario
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user,
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear el usuario',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
