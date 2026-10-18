import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api-auth';

// Esquema de validación para crear documento
const createDocumentSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional().nullable(),
  documentType: z.string(),
  fileUrl: z.string().min(1, 'La URL del archivo es requerida'),
  fileName: z.string().min(1, 'El nombre del archivo es requerido'),
  fileSize: z.number().int().min(0).optional(),
  mimeType: z.string().optional().nullable(),
  propertyId: z.string().min(1, 'La propiedad es requerida'),
  uploadedBy: z.string().min(1, 'El usuario que sube el documento es requerido'),
});

type LinkedAttachment = {
  name?: string
  url?: string
  type?: string
  size?: number
}

function parseAttachments(value: string | null): LinkedAttachment[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is LinkedAttachment => (
      typeof item === 'object' && item !== null && typeof (item as LinkedAttachment).url === 'string'
    ))
  } catch {
    return []
  }
}

function inferMimeType(url: string, declared?: string | null) {
  if (declared) return declared
  if (url.startsWith('data:')) return url.slice(5, url.indexOf(';')) || null
  if (/\.pdf(?:$|\?)/i.test(url)) return 'application/pdf'
  if (/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(url)) return 'image/*'
  return null
}

function inferFileName(url: string, fallback: string) {
  if (url.startsWith('data:')) return fallback
  const pathName = url.split('?')[0].split('/').pop()
  return pathName ? decodeURIComponent(pathName) : fallback
}

// GET - Listar documentos
export async function GET(request: NextRequest) {
  let prisma;
  
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    prisma = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const uploadedBy = searchParams.get('uploadedBy');
    const documentType = searchParams.get('documentType');
    const search = searchParams.get('search');

    // Construir filtros dinámicos
    const where: Record<string, unknown> = {};

    if (auth.user.role === 'PROPIETARIO') {
      where.property = { ownerId: auth.user.id };
    } else if (auth.user.role === 'INQUILINO') {
      where.property = { tenantId: auth.user.id };
      where.uploadedBy = auth.user.id;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (uploadedBy && auth.user.role === 'ADMIN') {
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

    const storedDocuments = await prisma.document.findMany({
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

    const linkedPropertyWhere: Record<string, unknown> = {}
    if (auth.user.role === 'PROPIETARIO') linkedPropertyWhere.ownerId = auth.user.id
    if (auth.user.role === 'INQUILINO') linkedPropertyWhere.tenantId = auth.user.id
    if (propertyId) linkedPropertyWhere.id = propertyId
    const linkedWhere = Object.keys(linkedPropertyWhere).length > 0
      ? { property: linkedPropertyWhere }
      : {}
    const propertySelect = { id: true, title: true, address: true }

    const [expenses, payments, ownerPayments, tickets, contracts] = await Promise.all([
      auth.user.role === 'INQUILINO'
        ? Promise.resolve([])
        : prisma.expense.findMany({
            where: linkedWhere,
            select: {
              id: true, title: true, invoiceImage: true, workEvidence: true, updatedAt: true,
              property: { select: propertySelect },
            },
          }),
      prisma.payment.findMany({
        where: {
          ...linkedWhere,
          ...(auth.user.role === 'INQUILINO' ? { userId: auth.user.id } : {}),
        },
        select: {
          id: true, paymentType: true, receiptImage: true, updatedAt: true,
          property: { select: propertySelect },
        },
      }),
      auth.user.role === 'INQUILINO'
        ? Promise.resolve([])
        : prisma.ownerPayment.findMany({
            where: {
              propertyId: { not: null },
              ...(Object.keys(linkedPropertyWhere).length > 0 ? { property: linkedPropertyWhere } : {}),
            },
            select: {
              id: true, receiptImage: true, updatedAt: true,
              property: { select: propertySelect },
            },
          }),
      prisma.supportTicket.findMany({
        where: {
          ...linkedWhere,
          ...(auth.user.role === 'INQUILINO' ? { userId: auth.user.id } : {}),
        },
        select: {
          id: true, title: true, attachments: true, updatedAt: true,
          property: { select: propertySelect },
        },
      }),
      prisma.contract.findMany({
        where: {
          ...linkedWhere,
          ...(auth.user.role === 'INQUILINO' ? { tenantId: auth.user.id } : {}),
        },
        select: {
          id: true, contractNumber: true, contractType: true, documentUrl: true,
          attachments: true, updatedAt: true, property: { select: propertySelect },
        },
      }),
    ])

    const systemUploader = { id: 'linked-record', name: 'Registro asociado', email: '', role: 'ADMIN' }
    const linkedDocuments: Array<Record<string, unknown>> = []
    const addLinkedDocument = (input: {
      id: string
      title: string
      description: string
      documentType: string
      fileUrl: string | null
      fileName: string
      fileSize?: number | null
      mimeType?: string | null
      uploadedAt: Date
      property: { id: string; title: string; address: string }
      source: string
    }) => {
      if (!input.fileUrl) return
      linkedDocuments.push({
        ...input,
        fileSize: input.fileSize ?? null,
        mimeType: inferMimeType(input.fileUrl, input.mimeType),
        updatedAt: input.uploadedAt,
        uploader: systemUploader,
      })
    }

    expenses.forEach(expense => {
      addLinkedDocument({
        id: `expense-invoice:${expense.id}`,
        title: `Factura · ${expense.title}`,
        description: 'Comprobante asociado al gasto',
        documentType: 'FACTURA',
        fileUrl: expense.invoiceImage,
        fileName: expense.invoiceImage ? inferFileName(expense.invoiceImage, `factura-${expense.id}.pdf`) : '',
        uploadedAt: expense.updatedAt,
        property: expense.property,
        source: 'GASTO',
      })
      addLinkedDocument({
        id: `expense-evidence:${expense.id}`,
        title: `Evidencia · ${expense.title}`,
        description: 'Evidencia de trabajo asociada al gasto',
        documentType: 'OTRO',
        fileUrl: expense.workEvidence,
        fileName: expense.workEvidence ? inferFileName(expense.workEvidence, `evidencia-${expense.id}.jpg`) : '',
        uploadedAt: expense.updatedAt,
        property: expense.property,
        source: 'GASTO',
      })
    })

    payments.forEach(payment => addLinkedDocument({
      id: `payment:${payment.id}`,
      title: `Comprobante de ${String(payment.paymentType).toLowerCase()}`,
      description: 'Comprobante asociado al pago del inquilino',
      documentType: 'RECIBO',
      fileUrl: payment.receiptImage,
      fileName: payment.receiptImage ? inferFileName(payment.receiptImage, `pago-${payment.id}.pdf`) : '',
      uploadedAt: payment.updatedAt,
      property: payment.property,
      source: 'PAGO',
    }))

    ownerPayments.forEach(payment => {
      if (!payment.property) return
      addLinkedDocument({
        id: `owner-payment:${payment.id}`,
        title: 'Comprobante de pago del propietario',
        description: 'Comprobante asociado a la relación de gastos',
        documentType: 'RECIBO',
        fileUrl: payment.receiptImage,
        fileName: payment.receiptImage ? inferFileName(payment.receiptImage, `pago-propietario-${payment.id}.pdf`) : '',
        uploadedAt: payment.updatedAt,
        property: payment.property,
        source: 'PAGO_PROPIETARIO',
      })
    })

    tickets.forEach(ticket => parseAttachments(ticket.attachments).forEach((attachment, index) => addLinkedDocument({
      id: `support:${ticket.id}:${index}`,
      title: `${ticket.title} · ${attachment.name || `Adjunto ${index + 1}`}`,
      description: 'Archivo asociado al soporte',
      documentType: 'OTRO',
      fileUrl: attachment.url || null,
      fileName: attachment.name || `soporte-${ticket.id}-${index + 1}`,
      fileSize: typeof attachment.size === 'number' ? attachment.size : null,
      mimeType: attachment.type || null,
      uploadedAt: ticket.updatedAt,
      property: ticket.property,
      source: 'SOPORTE',
    })))

    contracts.forEach(contract => {
      const contractType = contract.contractType === 'ARRENDAMIENTO'
        ? 'CONTRATO_ARRENDAMIENTO'
        : 'CONTRATO_ADMINISTRACION'
      addLinkedDocument({
        id: `contract-document:${contract.id}`,
        title: `Contrato ${contract.contractNumber}`,
        description: 'Documento principal del contrato',
        documentType: contractType,
        fileUrl: contract.documentUrl,
        fileName: contract.documentUrl ? inferFileName(contract.documentUrl, `contrato-${contract.contractNumber}.pdf`) : '',
        uploadedAt: contract.updatedAt,
        property: contract.property,
        source: 'CONTRATO',
      })
      parseAttachments(contract.attachments).forEach((attachment, index) => addLinkedDocument({
        id: `contract-attachment:${contract.id}:${index}`,
        title: `Contrato ${contract.contractNumber} · ${attachment.name || `Adjunto ${index + 1}`}`,
        description: 'Archivo adjunto al contrato',
        documentType: contractType,
        fileUrl: attachment.url || null,
        fileName: attachment.name || `contrato-${contract.contractNumber}-${index + 1}`,
        fileSize: typeof attachment.size === 'number' ? attachment.size : null,
        mimeType: attachment.type || null,
        uploadedAt: contract.updatedAt,
        property: contract.property,
        source: 'CONTRATO',
      }))
    })

    const combined = [
      ...storedDocuments.map(document => ({ ...document, source: 'DOCUMENTO' })),
      ...linkedDocuments,
    ]
      .filter(document => !documentType || String(document.documentType) === documentType.toUpperCase())
      .filter(document => {
        if (!search) return true
        const needle = search.toLocaleLowerCase('es')
        return [document.title, document.description, document.fileName]
          .some(value => String(value || '').toLocaleLowerCase('es').includes(needle))
      })
      .sort((a, b) => new Date(String(b.uploadedAt)).getTime() - new Date(String(a.uploadedAt)).getTime())
    const documents = Array.from(new Map(
      combined.map(document => [`${document.property.id}:${document.fileUrl}`, document])
    ).values())

    // Calcular estadísticas
    const totalSize = documents.reduce((sum, d) => sum + (Number(d.fileSize) || 0), 0);

    const byType = documents.reduce((acc, doc) => {
      const type = String(doc.documentType);
      if (!acc[type]) {
        acc[type] = { count: 0, size: 0 };
      }
      acc[type].count++;
      acc[type].size += Number(doc.fileSize) || 0;
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
  let prisma;

  try {
    const auth = await requireApiUser(['ADMIN']);
    if (!auth.ok) return auth.response;

    prisma = getPrismaClient();
    const body = await request.json();
    console.log('Received document data:', JSON.stringify(body, null, 2));

    // Validar datos de entrada
    const validatedData = createDocumentSchema.parse(body);

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

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
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
    const document = await prisma.document.create({
      data: {
        title: validatedData.title,
        description: validatedData.description ?? null,
        documentType: validatedData.documentType as any,
        fileUrl: validatedData.fileUrl,
        fileName: validatedData.fileName,
        fileSize: validatedData.fileSize ?? null,
        mimeType: validatedData.mimeType ?? null,
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

    console.log('Document created successfully:', document.id);

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
      console.log('Zod validation errors:', JSON.stringify(error.issues, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.issues.map(e => ({
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
        error: 'Error al subir el documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
