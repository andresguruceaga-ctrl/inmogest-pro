import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function GET() {
  const prisma = getPrismaClient();
  
  try {
    // Obtener una propiedad para la prueba
    const property = await prisma.property.findFirst({
      select: { id: true, title: true }
    });
    
    if (!property) {
      return NextResponse.json({ error: 'No hay propiedades' });
    }
    
    // Crear gasto de prueba con monto exacto de 100
    const expense = await prisma.expense.create({
      data: {
        title: 'TEST GASTO - ELIMINAR',
        category: 'OTROS',
        expenseType: 'VARIABLE',
        amount: 100,
        itbmsAmount: 0,
        totalAmount: 100,
        expenseDate: new Date(),
        propertyId: property.id,
      },
    });
    
    return NextResponse.json({
      message: 'Gasto de prueba creado',
      property: property.title,
      expenseCreated: {
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        itbmsAmount: expense.itbmsAmount,
        totalAmount: expense.totalAmount,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error'
    }, { status: 500 });
  }
}
