import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para actualizar contrato
const updateContractSchema = z.object({
  contractType: z.string().optional(),
  contractNumber: z.string().min(1, 'El número de contrato es requerido').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  monthlyAmount: z.number().min(0, 'El monto mensual debe ser válido').optional(),
  itbmsRate: z.number().min(0).max(100).optional(),
  depositAmount: z.number().min(0).optional().nullable(),
  terms: z.string().optional().nullable(),
  status: z.string().optional(),
  tenantId: z.string().optional().nullable(),
});

// GET - Obtener un contrato por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
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
    });

    if (!contract) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contrato no encontrado',
        },
        { status: 404 }
      );
    }

    // Agregar información calculada
    const isActive = new Date() >= contract.startDate && new Date() <= contract.endDate;
    const daysRemaining = Math.ceil(
      (contract.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const durationMonths = Math.ceil(
      (contract.endDate.getTime() - contract.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const contractCalculated = {
      ...contract,
      isActive,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      durationMonths,
      totalContractValue: contract.monthlyAmount * durationMonths,
    };

    return NextResponse.json({
      success: true,
      data: contractCalculated,
    });
  } catch (error) {
    console.error('Error al obtener contrato:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el contrato',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar contrato
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;
    const body = await request.json();
    console.log('Received contract update data:', JSON.stringify(body, null, 2));

    // Validar datos de entrada
    const validatedData = updateContractSchema.parse(body);

    // Verificar que el contrato existe
    const existingContract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existingContract) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contrato no encontrado',
        },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {};

    if (validatedData.contractType) {
      updateData.contractType = validatedData.contractType;
    }
    if (validatedData.contractNumber) {
      updateData.contractNumber = validatedData.contractNumber;
    }
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }
    if (validatedData.monthlyAmount !== undefined) {
      const itbmsRate = validatedData.itbmsRate ?? 7.0;
      updateData.monthlyAmount = validatedData.monthlyAmount;
      updateData.itbmsAmount = validatedData.monthlyAmount * (itbmsRate / 100);
    }
    if (validatedData.depositAmount !== undefined) {
      updateData.depositAmount = validatedData.depositAmount;
    }
    if (validatedData.terms !== undefined) {
      updateData.terms = validatedData.terms;
    }
    if (validatedData.status) {
      updateData.status = validatedData.status;
    }
    if (validatedData.tenantId !== undefined) {
      updateData.tenantId = validatedData.tenantId;
    }

    // Validar fechas si se proporcionan
    const startDate = updateData.startDate as Date | undefined;
    const endDate = updateData.endDate as Date | undefined;
    
    if (startDate && endDate && startDate >= endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de inicio debe ser anterior a la fecha de fin',
        },
        { status: 400 }
      );
    }

    // Actualizar el contrato
    const contract = await prisma.contract.update({
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

    // Si se actualiza el inquilino, actualizar la propiedad
    if (validatedData.tenantId !== undefined && existingContract.contractType === 'ARRENDAMIENTO') {
      await prisma.property.update({
        where: { id: existingContract.propertyId },
        data: {
          tenantId: validatedData.tenantId,
          status: validatedData.tenantId ? 'OCUPADA' : 'DISPONIBLE',
        },
      });
    }

    console.log('Contract updated successfully:', contract.id);

    return NextResponse.json({
      success: true,
      data: contract,
      message: 'Contrato actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar contrato:', error);

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
        error: 'Error al actualizar el contrato',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar contrato
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    // Verificar que el contrato existe
    const existingContract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existingContract) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contrato no encontrado',
        },
        { status: 404 }
      );
    }

    // Verificar si hay pagos asociados
    const paymentsCount = await prisma.payment.count({
      where: { contractId: id },
    });

    if (paymentsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar el contrato porque tiene pagos asociados',
        },
        { status: 400 }
      );
    }

    // Eliminar el contrato
    await prisma.contract.delete({
      where: { id },
    });

    // Si es contrato de arrendamiento, actualizar la propiedad
    if (existingContract.contractType === 'ARRENDAMIENTO') {
      await prisma.property.update({
        where: { id: existingContract.propertyId },
        data: {
          tenantId: null,
          status: 'DISPONIBLE',
        },
      });
    }

    console.log('Contract deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Contrato eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar contrato:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el contrato',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
