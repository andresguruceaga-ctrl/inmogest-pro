import { UserRole } from '@prisma/client'
import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: UserRole
      name: string
      email: string
      avatar?: string | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
    role: UserRole
    name: string
    email: string
    avatar?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    name: string
    email: string
    avatar?: string | null
  }
}
