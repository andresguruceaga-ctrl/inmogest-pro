import { NextRequest, NextResponse } from 'next/server';

// POST - Subir archivo (convierte a base64 para compatibilidad con Vercel)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se encontró ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG y WEBP' 
        },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'El archivo excede el tamaño máximo de 10MB' },
        { status: 400 }
      );
    }

    // Convertir a base64 data URL (funciona en Vercel)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Retornar la data URL como si fuera una URL de archivo
    return NextResponse.json({
      success: true,
      data: {
        fileUrl: dataUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isBase64: true,
      },
      message: 'Archivo procesado exitosamente',
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al subir el archivo',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
