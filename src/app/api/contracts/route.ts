import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquema de validación para crear contrato
const createContractSchema = z.object({
  contractType: z.enum(['ADMINISTRACION', 'ARRENDAMIENTO']),
  contractNumber: z.string().min(1, 'El número de contrato es requerido'),
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val)),
  monthlyAmount: z.number().positive('El monto mensual debe ser positivo'),
  itbmsRate: z.number().min(0).max(100).default(7.0),
  depositAmount: z.number().min(0).optional(),
  terms: z.string().optional(),
  documentUrl: z.string().optional(),
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  ownerId: z.string().min(1, 'El propietario es requerido'),
  tenantId: z.string().optional(),
});

// GET - Listar contratos
export async function GET(request: NextRequest) {
  try {
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

    const contracts = await db.contract.findMany({
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
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = createContractSchema.parse(body);

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

    // Si es contrato de arrendamiento, verificar que hay inquilino
    if (validatedData.contractType === 'ARRENDAMIENTO' && !validatedData.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Los contratos de arrendamiento requieren un inquilino',
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

    // Validar fechas
    if (validatedData.startDate >= validatedData.endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de inicio debe ser anterior a la fecha de fin',
        },
        { status: 400 }
      );
    }

    // Calcular ITBMS
    const itbmsAmount = validatedData.monthlyAmount * (validatedData.itbmsRate / 100);

    // Crear el contrato
    const contract = await db.contract.create({
      data: {
        contractType: validatedData.contractType,
        contractNumber: validatedData.contractNumber,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        monthlyAmount: validatedData.monthlyAmount,
        itbmsAmount: itbmsAmount,
        depositAmount: validatedData.depositAmount,
        terms: validatedData.terms,
        documentUrl: validatedData.documentUrl,
        status: 'VIGENTE',
        propertyId: validatedData.propertyId,
        ownerId: validatedData.ownerId,
        tenantId: validatedData.tenantId,
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
      await db.property.update({
        where: { id: validatedData.propertyId },
        data: {
          tenantId: validatedData.tenantId,
          status: 'OCUPADA',
        },
      });
    }

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
        error: 'Error al crear el contrato',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
