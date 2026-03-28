import { PrismaClient } from '@prisma/client'

// Global for Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create PrismaClient using environment variables (Neon PostgreSQL)
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
