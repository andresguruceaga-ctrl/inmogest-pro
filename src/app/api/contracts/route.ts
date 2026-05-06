import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para crear contrato
const createContractSchema = z.object({
  contractType: z.string(),
  contractNumber: z.string().min(1, 'El número de contrato es requerido'),
  startDate: z.string(),
  endDate: z.string(),
  monthlyAmount: z.number().min(0, 'El monto mensual debe ser válido'),
  depositAmount: z.number().min(0).optional(),
  terms: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
  attachments: z.string().optional().nullable(), // JSON string con array de archivos adjuntos
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  ownerId: z.string().min(1, 'El propietario es requerido'),
  tenantId: z.string().optional().nullable(),
});

// GET - Listar contratos
export async function GET(request: NextRequest) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const ownerId = searchParams.get('ownerId');
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const contractType = searchParams.get('contractType');

    // Construir filtros dinámicos
    const where: Record<string, unknown> = {};

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (contractType) {
      where.contractType = contractType.toUpperCase();
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            province: true,
            propertyType: true,
            monthlyRent: true,
          },
        },
        owner: {
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
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Agregar información calculada
    const contractsCalculated = contracts.map(contract => {
      const isActive = new Date() >= contract.startDate && new Date() <= contract.endDate;
      const daysRemaining = Math.ceil(
        (contract.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      const durationMonths = Math.ceil(
        (contract.endDate.getTime() - contract.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      return {
        ...contract,
        isActive,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        durationMonths,
        totalContractValue: contract.monthlyAmount * durationMonths,
      };
    });

    return NextResponse.json({
      success: true,
      data: contractsCalculated,
      count: contractsCalculated.length,
    });
  } catch (error) {
    console.error('Error al obtener contratos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los contratos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Crear contrato
export async function POST(request: NextRequest) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const body = await request.json();
    console.log('Received contract data:', JSON.stringify(body, null, 2));

    // Validar datos de entrada
    const validatedData = createContractSchema.parse(body);

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

    // Si hay inquilino, verificar que existe
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

    // Validar fechas
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de inicio debe ser anterior a la fecha de fin',
        },
        { status: 400 }
      );
    }

    // Crear el contrato (sin ITBMS, itbmsAmount = 0)
    const contract = await prisma.contract.create({
      data: {
        contractType: validatedData.contractType as any,
        contractNumber: validatedData.contractNumber,
        startDate: startDate,
        endDate: endDate,
        monthlyAmount: validatedData.monthlyAmount,
        itbmsAmount: 0,
        depositAmount: validatedData.depositAmount ?? null,
        terms: validatedData.terms ?? null,
        documentUrl: validatedData.documentUrl ?? null,
        attachments: validatedData.attachments ?? null, // Guardar attachments
        status: 'VIGENTE',
        propertyId: validatedData.propertyId,
        ownerId: validatedData.ownerId,
        tenantId: validatedData.tenantId ?? null,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Si es contrato de arrendamiento, actualizar la propiedad con el inquilino
    if (validatedData.contractType === 'ARRENDAMIENTO' && validatedData.tenantId) {
      await prisma.property.update({
        where: { id: validatedData.propertyId },
        data: {
          tenantId: validatedData.tenantId,
          status: 'OCUPADA',
        },
      });
    }

    console.log('Contract created successfully:', contract.id);

    return NextResponse.json(
      {
        success: true,
        data: contract,
        message: 'Contrato creado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear contrato:', error);

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
        error: 'Error al crear el contrato',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
