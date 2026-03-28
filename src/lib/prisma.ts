import { PrismaClient } from '@prisma/client'

// Supabase PostgreSQL URL - hardcoded for Turbopack compatibility
const DATABASE_URL = 'postgresql://postgres.megswukieallaguhmjbh:inmogest-pro@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

// Global for Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create PrismaClient with explicit datasource URL for Turbopack compatibility
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: DATABASE_URL,
  })
}

// Export singleton instance
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Helper function to get the PrismaClient singleton for API routes
export function getPrismaClient() {
  return prisma
}

export default prisma
