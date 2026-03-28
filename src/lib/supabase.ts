import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// These environment variables need to be set in production (Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials not configured. File uploads will not work.')
}

// Create Supabase client with service role key for server-side operations
// The service role key bypasses RLS policies, which is needed for server-side uploads
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Storage bucket name for all file uploads
export const STORAGE_BUCKET = 'inmogest-files'

// Helper function to get public URL for a file
export function getPublicUrl(path: string): string {
  if (!supabaseUrl) return path
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
}

// File type configurations
export const FILE_CONFIGS = {
  properties: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'properties',
  },
  documents: {
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'documents',
  },
  receipts: {
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'receipts',
  },
  tickets: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'tickets',
  },
  uploads: {
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'uploads',
  },
} as const

export type FileFolder = keyof typeof FILE_CONFIGS
