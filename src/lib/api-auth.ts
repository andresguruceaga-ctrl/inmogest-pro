import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { AuthorizationRole, AuthorizationUser } from '@/lib/authorization'
import { evaluateApiUser, type SessionLike } from '@/lib/http-authorization'

export async function requireApiUser(
  allowedRoles?: readonly AuthorizationRole[],
  resolveSession: () => Promise<SessionLike> = () => getServerSession(authOptions)
): Promise<
  | { ok: true; user: AuthorizationUser }
  | { ok: false; response: Response }
> {
  return evaluateApiUser(await resolveSession(), allowedRoles)
}
