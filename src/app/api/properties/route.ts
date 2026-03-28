import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Create PrismaClient with explicit URL for Turbopack compatibility
const getPrismaClient = () => {
  return new PrismaClient({
    datasourceUrl: 'postgresql://postgres.megswukieallaguhmjbh:inmogest-pro@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
  });
};

// Esquema de validación simplificado - coincide con el formulario del frontend
const createPropertySchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional().nullable(),
  propertyType: z.string().default('APARTAMENTO'),
  province: z.string().min(1, 'La provincia es requerida'),
  district: z.string().min(1, 'El distrito es requerido'),
  corregimiento: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  address: z.string().min(1, 'La dirección es requerida'),
  buildingName: z.string().optional().nullable(),
  totalArea: z.number().min(0, 'El área total debe ser válida'),
  builtArea: z.number().min(0).nullable().optional(),
  bedrooms: z.number().int().min(0).default(0),
  bathrooms: z.number().int().min(0).default(1),
  parkingSpaces: z.number().int().min(0).default(0),
  floorNumber: z.number().int().nullable().optional(),
  fincaNumber: z.string().optional().nullable(),
  tomoNumber: z.string().optional().nullable(),
  folioNumber: z.string().optional().nullable(),
  asientoNumber: z.string().optional().nullable(),
  monthlyRent: z.number().min(0, 'El alquiler mensual debe ser válido'),
  depositAmount: z.number().min(0).default(0),
  mainImage: z.string().optional().nullable(),
  images: z.string().optional().nullable(),
  ownerId: z.string().min(1, 'El propietario es requerido'),
  adminId: z.string().min(1, 'El administrador es requerido'),
  // Nuevos campos
  comments: z.string().optional().nullable(),
  forSale: z.boolean().default(false),
  salePrice: z.number().min(0).nullable().optional(),
  saleDescription: z.string().optional().nullable(),
  forRent: z.boolean().default(true),
});

// GET - Listar propiedades
export async function GET(request: NextRequest) {
  let prisma;
  
  try {
    prisma = getPrismaClient();
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

    const properties = await prisma.property.findMany({
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
      properties: propertiesWithITBMS,
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

// POST - Crear propiedad
export async function POST(request: NextRequest) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const body = await request.json();
    
    console.log('Received property data:', JSON.stringify(body, null, 2));

    // Validar datos de entrada
    const validatedData = createPropertySchema.parse(body);

    // Verificar que el propietario existe
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

    // Verificar que el administrador existe
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

    // Crear la propiedad
    const property = await prisma.property.create({
      data: {
        title: validatedData.title,
        description: validatedData.description ?? null,
        propertyType: validatedData.propertyType as 'APARTAMENTO' | 'CASA' | 'LOCAL_COMERCIAL' | 'OFICINA' | 'BODEGA' | 'TERRENO' | 'PH',
        province: validatedData.province,
        district: validatedData.district,
        corregimiento: validatedData.corregimiento ?? null,
        neighborhood: validatedData.neighborhood ?? null,
        address: validatedData.address,
        buildingName: validatedData.buildingName ?? null,
        totalArea: validatedData.totalArea,
        builtArea: validatedData.builtArea ?? null,
        bedrooms: validatedData.bedrooms,
        bathrooms: validatedData.bathrooms,
        parkingSpaces: validatedData.parkingSpaces,
        floorNumber: validatedData.floorNumber ?? null,
        fincaNumber: validatedData.fincaNumber ?? 'SIN-FINCA',
        tomoNumber: validatedData.tomoNumber ?? null,
        folioNumber: validatedData.folioNumber ?? null,
        asientoNumber: validatedData.asientoNumber ?? null,
        monthlyRent: validatedData.monthlyRent,
        depositAmount: validatedData.depositAmount ?? 0,
        mainImage: validatedData.mainImage ?? null,
        images: validatedData.images ?? null,
        ownerId: validatedData.ownerId,
        adminId: validatedData.adminId,
        // Nuevos campos
        comments: validatedData.comments ?? null,
        forSale: validatedData.forSale ?? false,
        salePrice: validatedData.salePrice ?? null,
        saleDescription: validatedData.saleDescription ?? null,
        forRent: validatedData.forRent ?? true,
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

    console.log('Property created successfully:', property.id);

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
        error: 'Error al crear la propiedad',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
