import { PrismaClient } from '@prisma/client'

// Global for Prisma Client in development - prevents multiple instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma client configuration for Supabase
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Optimized connection settings for Supabase
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Singleton pattern to prevent multiple Prisma instances
export const db = globalForPrisma.prisma ?? createPrismaClient()

// In development, attach to global to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown handler
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}

// Helper function for API routes with automatic cleanup
export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } finally {
    // Don't disconnect in development to avoid connection churn
    // In production, Vercel handles this automatically
  }
}
