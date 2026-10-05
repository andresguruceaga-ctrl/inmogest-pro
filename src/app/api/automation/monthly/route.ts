import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { runMonthlyAutomation } from '@/lib/monthly-automation'

async function executeAutomation() {
  const result = await runMonthlyAutomation(prisma)
  return NextResponse.json({
    success: true,
    data: result,
    message: 'Automatización mensual ejecutada correctamente',
  })
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    return await executeAutomation()
  } catch (error) {
    console.error('Error en automatización mensual:', error)
    return NextResponse.json(
      { success: false, error: 'No se pudo ejecutar la automatización mensual' },
      { status: 500 }
    )
  }
}

export async function POST() {
  const auth = await requireApiUser(['ADMIN'])
  if (!auth.ok) return auth.response

  try {
    return await executeAutomation()
  } catch (error) {
    console.error('Error en automatización mensual:', error)
    return NextResponse.json(
      { success: false, error: 'No se pudo ejecutar la automatización mensual' },
      { status: 500 }
    )
  }
}
