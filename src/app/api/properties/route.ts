import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquema de validación para crear propiedad
const createPropertySchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  propertyType: z.enum([
    'APARTAMENTO',
    'CASA',
    'LOCAL_COMERCIAL',
    'OFICINA',
    'BODEGA',
    'TERRENO',
    'PH',
  ]).default('APARTAMENTO'),
  province: z.string().min(1, 'La provincia es requerida'),
  district: z.string().min(1, 'El distrito es requerido'),
  corregimiento: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().min(1, 'La dirección es requerida'),
  buildingName: z.string().optional(),
  totalArea: z.number().positive('El área total debe ser positiva'),
  builtArea: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).default(0),
  bathrooms: z.number().int().min(0).default(0),
  parkingSpaces: z.number().int().min(0).default(0),
  floorNumber: z.number().int().optional(),
  fincaNumber: z.string().min(1, 'El número de finca es requerido'),
  tomoNumber: z.string().optional(),
  folioNumber: z.string().optional(),
  asientoNumber: z.string().optional(),
  monthlyRent: z.number().positive('El alquiler mensual debe ser positivo'),
  itbmsRate: z.number().min(0).max(100).default(7.0),
  depositAmount: z.number().min(0).default(0),
  status: z.enum(['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO', 'INACTIVA']).default('DISPONIBLE'),
  mainImage: z.string().optional(),
  images: z.string().optional(),
  ownerId: z.string().min(1, 'El propietario es requerido'),
  adminId: z.string().min(1, 'El administrador es requerido'),
  tenantId: z.string().optional(),
});

// GET - Listar propiedades (filtrar por rol)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const propertyType = searchParams.get('propertyType');
    const province = searchParams.get('province');

    // Construir filtros dinámicos
    const where: Record<string, unknown> = { isActive: true };

    // Filtrar por rol de usuario
    if (role && userId) {
      switch (role.toUpperCase()) {
        case 'ADMIN':
          where.adminId = userId;
          break;
        case 'PROPIETARIO':
          where.ownerId = userId;
          break;
        case 'INQUILINO':
          where.tenantId = userId;
          break;
      }
    }

    // Filtros adicionales
    if (status) {
      where.status = status.toUpperCase();
    }

    if (propertyType) {
      where.propertyType = propertyType.toUpperCase();
    }

    if (province) {
      where.province = { contains: province, mode: 'insensitive' };
    }

    const properties = await db.property.findMany({
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
        _count: {
          select: {
            contracts: true,
            expenses: true,
            supportTickets: true,
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular ITBMS mensual para cada propiedad
    const propertiesWithITBMS = properties.map(property => {
      const itbmsAmount = property.monthlyRent * (property.itbmsRate / 100);
      const totalRentWithITBMS = property.monthlyRent + itbmsAmount;

      return {
        ...property,
        itbmsAmount,
        totalRentWithITBMS,
      };
    });

    return NextResponse.json({
      success: true,
      data: propertiesWithITBMS,
      count: propertiesWithITBMS.length,
    });
  } catch (error) {
    console.error('Error al obtener propiedades:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener las propiedades',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Crear propiedad (solo Admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = createPropertySchema.parse(body);

    // Verificar que el propietario existe
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

    // Verificar que el administrador existe y tiene rol de ADMIN
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

    // Si hay inquilino, verificar que existe
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

    // Crear la propiedad
    const property = await db.property.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        propertyType: validatedData.propertyType,
        province: validatedData.province,
        district: validatedData.district,
        corregimiento: validatedData.corregimiento,
        neighborhood: validatedData.neighborhood,
        address: validatedData.address,
        buildingName: validatedData.buildingName,
        totalArea: validatedData.totalArea,
        builtArea: validatedData.builtArea,
        bedrooms: validatedData.bedrooms,
        bathrooms: validatedData.bathrooms,
        parkingSpaces: validatedData.parkingSpaces,
        floorNumber: validatedData.floorNumber,
        fincaNumber: validatedData.fincaNumber,
        tomoNumber: validatedData.tomoNumber,
        folioNumber: validatedData.folioNumber,
        asientoNumber: validatedData.asientoNumber,
        monthlyRent: validatedData.monthlyRent,
        itbmsRate: validatedData.itbmsRate,
        depositAmount: validatedData.depositAmount,
        status: validatedData.status,
        mainImage: validatedData.mainImage,
        images: validatedData.images,
        ownerId: validatedData.ownerId,
        adminId: validatedData.adminId,
        tenantId: validatedData.tenantId,
      },
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

    // Calcular ITBMS
    const itbmsAmount = property.monthlyRent * (property.itbmsRate / 100);
    const totalRentWithITBMS = property.monthlyRent + itbmsAmount;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...property,
          itbmsAmount,
          totalRentWithITBMS,
        },
        message: 'Propiedad creada exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear propiedad:', error);

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
        error: 'Error al crear la propiedad',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
