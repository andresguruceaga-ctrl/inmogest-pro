import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para crear gasto
const createExpenseSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional().nullable(),
  category: z.string(),
  expenseType: z.string().default('VARIABLE'),
  amount: z.number().min(0, 'El monto debe ser válido'),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  invoiceImage: z.string().optional().nullable(),
  workEvidence: z.string().optional().nullable(),
  expenseDate: z.string(),
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  paidByAdmin: z.boolean().default(false),
  reimbursedByOwner: z.boolean().default(false),
});

// GET - Listar gastos
export async function GET(request: NextRequest) {
  let prisma;
  
  try {
    prisma = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const category = searchParams.get('category');
    const expenseType = searchParams.get('expenseType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Construir filtros dinámicos
    const where: Record<string, unknown> = {};

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (category) {
      where.category = category.toUpperCase();
    }

    if (expenseType) {
      where.expenseType = expenseType.toUpperCase();
    }

    // Filtro por rango de fechas
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Filtro por mes y año
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59);
      
      where.expenseDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
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
      orderBy: {
        expenseDate: 'desc',
      },
    });

    // Calcular totales
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);

    // Calcular balance de gastos administrados
    const adminPaidExpenses = expenses.filter(e => e.paidByAdmin);
    const pendingReimbursement = adminPaidExpenses
      .filter(e => !e.reimbursedByOwner)
      .reduce((sum, e) => sum + e.totalAmount, 0);
    const totalReimbursed = adminPaidExpenses
      .filter(e => e.reimbursedByOwner)
      .reduce((sum, e) => sum + e.totalAmount, 0);

    // Agrupar por categoría
    const byCategory = expenses.reduce((acc, expense) => {
      const cat = expense.category;
      if (!acc[cat]) {
        acc[cat] = {
          count: 0,
          total: 0,
        };
      }
      acc[cat].count++;
      acc[cat].total += expense.totalAmount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // Agrupar por tipo
    const byType = {
      FIJO: {
        count: expenses.filter(e => e.expenseType === 'FIJO').length,
        total: expenses
          .filter(e => e.expenseType === 'FIJO')
          .reduce((sum, e) => sum + e.totalAmount, 0),
      },
      VARIABLE: {
        count: expenses.filter(e => e.expenseType === 'VARIABLE').length,
        total: expenses
          .filter(e => e.expenseType === 'VARIABLE')
          .reduce((sum, e) => sum + e.totalAmount, 0),
      },
    };

    return NextResponse.json({
      success: true,
      data: expenses,
      count: expenses.length,
      summary: {
        totalExpenses,
        byCategory,
        byType,
        adminBalance: {
          totalAdminPaid: adminPaidExpenses.reduce((sum, e) => sum + e.totalAmount, 0),
          pendingReimbursement,
          totalReimbursed,
        },
      },
    });
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los gastos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Registrar gasto
export async function POST(request: NextRequest) {
  let prisma;

  try {
    prisma = getPrismaClient();
    const body = await request.json();
    console.log('Received expense data:', JSON.stringify(body, null, 2));

    // Validar datos de entrada
    const validatedData = createExpenseSchema.parse(body);

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

    // Crear el gasto (sin ITBMS, totalAmount = amount)
    const expense = await prisma.expense.create({
      data: {
        title: validatedData.title,
        description: validatedData.description ?? null,
        category: validatedData.category as any,
        expenseType: validatedData.expenseType as any,
        amount: validatedData.amount,
        itbmsAmount: 0,
        totalAmount: validatedData.amount,
        invoiceNumber: validatedData.invoiceNumber ?? null,
        invoiceDate: validatedData.invoiceDate ? new Date(validatedData.invoiceDate) : null,
        supplier: validatedData.supplier ?? null,
        invoiceImage: validatedData.invoiceImage ?? null,
        workEvidence: validatedData.workEvidence ?? null,
        expenseDate: new Date(validatedData.expenseDate),
        propertyId: validatedData.propertyId,
        paidByAdmin: validatedData.paidByAdmin,
        reimbursedByOwner: validatedData.reimbursedByOwner,
        reimbursedAt: validatedData.reimbursedByOwner ? new Date() : null,
      },
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

    console.log('Expense created successfully:', expense.id);

    return NextResponse.json(
      {
        success: true,
        data: expense,
        message: 'Gasto registrado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear gasto:', error);

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
        error: 'Error al registrar el gasto',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
