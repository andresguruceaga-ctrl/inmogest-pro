export type AuthorizationRole = 'ADMIN' | 'PROPIETARIO' | 'INQUILINO'

export interface AuthorizationUser {
  id: string
  role: AuthorizationRole
}

export interface PropertyOwnership {
  adminId: string
  ownerId: string
  tenantId?: string | null
}

export function isAdmin(user: AuthorizationUser) {
  return user.role === 'ADMIN'
}

export function canAccessProperty(
  user: AuthorizationUser,
  property: PropertyOwnership
) {
  if (isAdmin(user)) return true
  if (user.role === 'PROPIETARIO') return property.ownerId === user.id
  return property.tenantId === user.id
}

export function propertyScope(user: AuthorizationUser): Record<string, string> {
  if (isAdmin(user)) return {}
  if (user.role === 'PROPIETARIO') return { ownerId: user.id }
  return { tenantId: user.id }
}

export function canAccessUser(user: AuthorizationUser, targetUserId: string) {
  return isAdmin(user) || user.id === targetUserId
}

export function canManageFinancialData(user: AuthorizationUser) {
  return isAdmin(user)
}
