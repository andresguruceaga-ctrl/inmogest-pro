import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const prisma = getPrismaClient();
  
  try {
    const body = await request.json();
    console.log('DEBUG - Received data:', JSON.stringify(body, null, 2));
    
    // Simular exactamente lo que hace la API de gastos
    const testExpense = {
      title: body.title,
      amount: body.amount,
      itbmsAmount: 0,
      totalAmount: body.amount, // Sin ITBMS
    };
    
    console.log('DEBUG - Expense to create:', JSON.stringify(testExpense, null, 2));
    
    // Crear el gasto
    const expense = await prisma.expense.create({
      data: {
        title: body.title,
        description: body.description || null,
        category: body.category || 'OTROS',
        expenseType: body.expenseType || 'VARIABLE',
        amount: body.amount,
        itbmsAmount: 0,
        totalAmount: body.amount,
        invoiceNumber: body.invoiceNumber || null,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
        supplier: body.supplier || null,
        invoiceImage: body.invoiceImage || null,
        workEvidence: body.workEvidence || null,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
        propertyId: body.propertyId,
        paidByAdmin: body.paidByAdmin || false,
        reimbursedByOwner: body.reimbursedByOwner || false,
      },
    });
    
    console.log('DEBUG - Created expense:', JSON.stringify(expense, null, 2));
    
    return NextResponse.json({
      success: true,
      received: body,
      created: expense,
    });
  } catch (error) {
    console.error('DEBUG - Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
