import type { AuthorizationRole, AuthorizationUser } from './authorization.ts'

export type SessionLike = {
  user?: { id?: string; role?: AuthorizationRole } | null
} | null

export function evaluateApiUser(
  session: SessionLike,
  allowedRoles?: readonly AuthorizationRole[]
):
  | { ok: true; user: AuthorizationUser }
  | { ok: false; response: Response } {
  const id = session?.user?.id
  const role = session?.user?.role

  if (!id || !role) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      ),
    }
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      ),
    }
  }

  return { ok: true, user: { id, role } }
}

export function createAuthorizedHandler(
  allowedRoles: readonly AuthorizationRole[] | undefined,
  handler: (request: Request, user: AuthorizationUser) => Response | Promise<Response>
) {
  return async (request: Request, session: SessionLike): Promise<Response> => {
    const access = evaluateApiUser(session, allowedRoles)
    if (!access.ok) return access.response
    return handler(request, access.user)
  }
}
