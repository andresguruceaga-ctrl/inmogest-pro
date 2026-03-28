'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, NAV_ITEMS, UserRole } from '@/lib/store'

interface UsePageAccessOptions {
  pageId: string
  redirectPath?: string
}

interface PageAccessResult {
  hasAccess: boolean
  canEdit: boolean
  isReadOnly: boolean
  isLoading: boolean
}

export function usePageAccess(options: UsePageAccessOptions): PageAccessResult {
  const { pageId, redirectPath = '/' } = options
  const router = useRouter()
  const { user, canEdit, isReadOnly } = useAppStore()
  
  const navItem = NAV_ITEMS.find(item => 
    item.id === pageId || 
    item.href === pageId ||
    item.href === `/${pageId}`
  )
  
  const hasAccess = user && navItem ? navItem.roles.includes(user.role) : false
  const userCanEdit = canEdit(pageId)
  const userIsReadOnly = isReadOnly(pageId)
  
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    if (navItem && !navItem.roles.includes(user.role)) {
      router.push(redirectPath)
    }
  }, [user, navItem, router, redirectPath])
  
  return {
    hasAccess: hasAccess ?? false,
    canEdit: userCanEdit,
    isReadOnly: userIsReadOnly,
    isLoading: !user,
  }
}

interface PageGuardProps {
  pageId: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PageGuard({ pageId, children, fallback }: PageGuardProps) {
  const { hasAccess, isLoading } = usePageAccess({ pageId })
  
  if (isLoading) {
    if (fallback) return fallback
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!hasAccess) {
    if (fallback) return fallback
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permiso para acceder a esta pagina</p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

interface CanEditProps {
  pageId: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function CanEdit({ pageId, children, fallback }: CanEditProps) {
  const { canEdit } = usePageAccess({ pageId })
  
  if (!canEdit) {
    if (fallback) return fallback
    return null
  }
  
  return <>{children}</>
}

interface OnlyForRolesProps {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function OnlyForRoles({ roles, children, fallback }: OnlyForRolesProps) {
  const { user } = useAppStore()
  
  if (!user || !roles.includes(user.role)) {
    if (fallback) return fallback
    return null
  }
  
  return <>{children}</>
}

interface ReadOnlyBadgeProps {
  pageId: string
}

export function ReadOnlyBadge({ pageId }: ReadOnlyBadgeProps) {
  const { isReadOnly } = usePageAccess({ pageId })
  
  if (!isReadOnly) return null
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-full">
      Solo lectura
    </span>
  )
}
