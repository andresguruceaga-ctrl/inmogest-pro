import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// ITBMS rate for Panama (7%)
const ITBMS_RATE = 7.0;

// Esquema de validación para crear gasto
const createExpenseSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  category: z.enum([
    'MANTENIMIENTO_PH',
    'SEGURO',
    'SERVICIOS_BASICOS',
    'REPARACION',
    'SERVICIO_TECNICO',
    'IMPUESTOS',
    'COMISION_ADMIN',
    'OTROS',
  ]),
  expenseType: z.enum(['FIJO', 'VARIABLE']).default('VARIABLE'),
  amount: z.number().positive('El monto debe ser positivo'),
  includeItbms: z.boolean().default(true),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().transform(val => new Date(val)).optional(),
  supplier: z.string().optional(),
  invoiceImage: z.string().optional(),
  workEvidence: z.string().optional(),
  expenseDate: z.string().transform(val => new Date(val)),
  propertyId: z.string().min(1, 'La propiedad es requerida'),
});

// GET - Listar gastos
export async function GET(request: NextRequest) {
  try {
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

    const expenses = await db.expense.findMany({
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
    const totalITBMS = expenses.reduce((sum, expense) => sum + expense.itbmsAmount, 0);
    const totalBase = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Agrupar por categoría
    const byCategory = expenses.reduce((acc, expense) => {
      const cat = expense.category;
      if (!acc[cat]) {
        acc[cat] = {
          count: 0,
          total: 0,
          itbms: 0,
        };
      }
      acc[cat].count++;
      acc[cat].total += expense.totalAmount;
      acc[cat].itbms += expense.itbmsAmount;
      return acc;
    }, {} as Record<string, { count: number; total: number; itbms: number }>);

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
        totalITBMS,
        totalBase,
        byCategory,
        byType,
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
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = createExpenseSchema.parse(body);

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

    // Calcular ITBMS y total
    const itbmsAmount = validatedData.includeItbms
      ? validatedData.amount * (ITBMS_RATE / 100)
      : 0;
    const totalAmount = validatedData.amount + itbmsAmount;

    // Crear el gasto
    const expense = await db.expense.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        expenseType: validatedData.expenseType,
        amount: validatedData.amount,
        itbmsAmount: itbmsAmount,
        totalAmount: totalAmount,
        invoiceNumber: validatedData.invoiceNumber,
        invoiceDate: validatedData.invoiceDate,
        supplier: validatedData.supplier,
        invoiceImage: validatedData.invoiceImage,
        workEvidence: validatedData.workEvidence,
        expenseDate: validatedData.expenseDate,
        propertyId: validatedData.propertyId,
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
        error: 'Error al registrar el gasto',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
