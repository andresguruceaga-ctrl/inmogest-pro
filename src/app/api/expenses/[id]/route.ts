import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';

// ITBMS rate for Panama (7%)
const ITBMS_RATE = 7.0;

// Esquema de validación para actualizar gasto
const updateExpenseSchema = z.object({
  title: z.string().min(1, 'El título es requerido').optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  expenseType: z.string().optional(),
  amount: z.number().min(0, 'El monto debe ser válido').optional(),
  includeItbms: z.boolean().optional(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  invoiceImage: z.string().optional().nullable(),
  workEvidence: z.string().optional().nullable(),
  expenseDate: z.string().optional(),
  propertyId: z.string().optional(),
  paidByAdmin: z.boolean().optional(),
  reimbursedByOwner: z.boolean().optional(),
});

// GET - Obtener un gasto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            province: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gasto no encontrado',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error('Error al obtener gasto:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el gasto',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar gasto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;
    const body = await request.json();
    console.log('Received expense update data:', JSON.stringify(body, null, 2));

    // Validar datos de entrada
    const validatedData = updateExpenseSchema.parse(body);

    // Verificar que el gasto existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gasto no encontrado',
        },
        { status: 404 }
      );
    }

    // Si se cambia la propiedad, verificar que existe
    if (validatedData.propertyId && validatedData.propertyId !== existingExpense.propertyId) {
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
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {};

    if (validatedData.title) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.category) {
      updateData.category = validatedData.category;
    }
    if (validatedData.expenseType) {
      updateData.expenseType = validatedData.expenseType;
    }
    if (validatedData.amount !== undefined) {
      const includeItbms = validatedData.includeItbms ?? true;
      const itbmsAmount = includeItbms ? validatedData.amount * (ITBMS_RATE / 100) : 0;
      updateData.amount = validatedData.amount;
      updateData.itbmsAmount = itbmsAmount;
      updateData.totalAmount = validatedData.amount + itbmsAmount;
    } else if (validatedData.includeItbms !== undefined) {
      // Si solo se cambia includeItbms, recalcular con el monto existente
      const itbmsAmount = validatedData.includeItbms
        ? existingExpense.amount * (ITBMS_RATE / 100)
        : 0;
      updateData.itbmsAmount = itbmsAmount;
      updateData.totalAmount = existingExpense.amount + itbmsAmount;
    }
    if (validatedData.invoiceNumber !== undefined) {
      updateData.invoiceNumber = validatedData.invoiceNumber;
    }
    if (validatedData.invoiceDate !== undefined) {
      updateData.invoiceDate = validatedData.invoiceDate ? new Date(validatedData.invoiceDate) : null;
    }
    if (validatedData.supplier !== undefined) {
      updateData.supplier = validatedData.supplier;
    }
    if (validatedData.invoiceImage !== undefined) {
      updateData.invoiceImage = validatedData.invoiceImage;
    }
    if (validatedData.workEvidence !== undefined) {
      updateData.workEvidence = validatedData.workEvidence;
    }
    if (validatedData.expenseDate) {
      updateData.expenseDate = new Date(validatedData.expenseDate);
    }
    if (validatedData.propertyId) {
      updateData.propertyId = validatedData.propertyId;
    }
    if (validatedData.paidByAdmin !== undefined) {
      updateData.paidByAdmin = validatedData.paidByAdmin;
    }
    if (validatedData.reimbursedByOwner !== undefined) {
      updateData.reimbursedByOwner = validatedData.reimbursedByOwner;
      // Si se marca como reembolsado, registrar la fecha
      if (validatedData.reimbursedByOwner && !existingExpense.reimbursedAt) {
        updateData.reimbursedAt = new Date();
      } else if (!validatedData.reimbursedByOwner) {
        updateData.reimbursedAt = null;
      }
    }

    // Actualizar el gasto
    const expense = await prisma.expense.update({
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
      },
    });

    console.log('Expense updated successfully:', expense.id);

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Gasto actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar gasto:', error);

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
        error: 'Error al actualizar el gasto',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar gasto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const { id } = await params;

    // Verificar que el gasto existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gasto no encontrado',
        },
        { status: 404 }
      );
    }

    // Eliminar el gasto
    await prisma.expense.delete({
      where: { id },
    });

    console.log('Expense deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Gasto eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el gasto',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
