import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function GET() {
  const prisma = getPrismaClient();
  
  try {
    // Verificar triggers en la tabla expenses
    const triggers = await prisma.$queryRaw`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'expenses';
    `;
    
    // También verificar funciones que podrían calcular ITBMS
    const functions = await prisma.$queryRaw`
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_definition LIKE '%itbms%';
    `;
    
    return NextResponse.json({
      triggers,
      functions,
      message: 'Consulta ejecutada correctamente'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
