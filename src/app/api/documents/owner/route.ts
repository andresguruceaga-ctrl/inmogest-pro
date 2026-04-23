import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener documentos del propietario (documentos de sus propiedades)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('ownerId')

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ID del propietario es requerido' },
        { status: 400 }
      )
    }

    // Obtener todas las propiedades del propietario
    const properties = await prisma.property.findMany({
      where: {
        ownerId: ownerId,
      },
      select: {
        id: true,
        title: true,
      },
    })

    const propertyIds = properties.map((p) => p.id)

    if (propertyIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Obtener todos los documentos de las propiedades del propietario
    const documents = await prisma.document.findMany({
      where: {
        propertyId: {
          in: propertyIds,
        },
      },
      include: {
        property: {
          select: {
            title: true,
            address: true,
          },
        },
        uploader: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: documents,
    })
  } catch (error) {
    console.error('Error fetching owner documents:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener los documentos' },
      { status: 500 }
    )
  }
}
