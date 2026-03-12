import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquema de validación para crear documento
const createDocumentSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  documentType: z.enum([
    'CONTRATO_ADMINISTRACION',
    'CONTRATO_ARRENDAMIENTO',
    'FACTURA',
    'RECIBO',
    'ESCRITURA',
    'INFORME',
    'OTRO',
  ]),
  fileUrl: z.string().min(1, 'La URL del archivo es requerida'),
  fileName: z.string().min(1, 'El nombre del archivo es requerido'),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  uploadedBy: z.string().min(1, 'El usuario que sube el documento es requerido'),
});

// GET - Listar documentos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const uploadedBy = searchParams.get('uploadedBy');
    const documentType = searchParams.get('documentType');
    const search = searchParams.get('search');

    // Construir filtros dinámicos
    const where: Record<string, unknown> = {};

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (uploadedBy) {
      where.uploadedBy = uploadedBy;
    }

    if (documentType) {
      where.documentType = documentType.toUpperCase();
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const documents = await db.document.findMany({
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
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    // Calcular estadísticas
    const totalSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);

    const byType = documents.reduce((acc, doc) => {
      const type = doc.documentType;
      if (!acc[type]) {
        acc[type] = { count: 0, size: 0 };
      }
      acc[type].count++;
      acc[type].size += doc.fileSize || 0;
      return acc;
    }, {} as Record<string, { count: number; size: number }>);

    // Formatear tamaños de archivo
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length,
      summary: {
        totalDocuments: documents.length,
        totalSize,
        totalSizeFormatted: formatFileSize(totalSize),
        byType,
      },
    });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los documentos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Subir documento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = createDocumentSchema.parse(body);

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

    // Verificar que el usuario existe
    const user = await db.user.findUnique({
      where: { id: validatedData.uploadedBy },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'El usuario especificado no existe',
        },
        { status: 400 }
      );
    }

    // Crear el documento
    const document = await db.document.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        documentType: validatedData.documentType,
        fileUrl: validatedData.fileUrl,
        fileName: validatedData.fileName,
        fileSize: validatedData.fileSize,
        mimeType: validatedData.mimeType,
        propertyId: validatedData.propertyId,
        uploadedBy: validatedData.uploadedBy,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Crear notificación para el administrador de la propiedad
    if (user.id !== property.adminId) {
      await db.notification.create({
        data: {
          title: 'Nuevo documento subido',
          message: `Se ha subido el documento "${validatedData.title}" para ${property.title}`,
          type: 'DOCUMENT_UPLOADED',
          userId: property.adminId,
          link: `/documents/${document.id}`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: document,
        message: 'Documento subido exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al subir documento:', error);

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
        error: 'Error al subir el documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
