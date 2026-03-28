import { NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

// GET - Verificar y crear bucket de almacenamiento
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase no está configurado. Por favor, configure las variables de entorno NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 500 }
    );
  }

  try {
    // Verificar si el bucket existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al verificar buckets existentes',
          details: listError.message,
        },
        { status: 500 }
      );
    }

    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);

    if (bucketExists) {
      return NextResponse.json({
        success: true,
        message: `El bucket "${STORAGE_BUCKET}" ya existe`,
        bucket: STORAGE_BUCKET,
        status: 'ready',
      });
    }

    // Crear el bucket
    const { data, error: createError } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
      ],
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al crear el bucket de almacenamiento',
          details: createError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Bucket "${STORAGE_BUCKET}" creado exitosamente`,
      bucket: STORAGE_BUCKET,
      status: 'created',
    });
  } catch (error) {
    console.error('Error setting up storage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al configurar el almacenamiento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// POST - Crear carpetas por defecto en el bucket
export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase no está configurado.',
      },
      { status: 500 }
    );
  }

  try {
    const folders = ['properties', 'documents', 'receipts', 'tickets', 'uploads'];
    const results = [];

    for (const folder of folders) {
      // Crear un archivo .keep en cada carpeta para asegurar que exista
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(`${folder}/.keep`, new TextEncoder().encode(''), {
          contentType: 'text/plain',
          upsert: true,
        });

      results.push({
        folder,
        success: !error,
        error: error?.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Carpetas creadas exitosamente',
      results,
    });
  } catch (error) {
    console.error('Error creating folders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear carpetas',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
