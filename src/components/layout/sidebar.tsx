'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Receipt,
  FolderOpen,
  Users,
  UserCheck,
  BarChart3,
  Home,
  CreditCard,
  HelpCircle,
  User,
  TrendingUp,
  ChevronDown,
  LogOut,
  Settings,
  Building,
  PanelLeft,
  Wallet,
  ArrowLeft,
} from 'lucide-react'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  FileText,
  Receipt,
  FolderOpen,
  Users,
  UserCheck,
  BarChart3,
  Home,
  CreditCard,
  HelpCircle,
  User,
  TrendingUp,
  Wallet,
  Settings,
  ArrowLeft,
}

interface NavItem {
  title: string
  href: string
  icon: string
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { title: 'Propietarios', href: '/propietarios', icon: 'UserCheck' },
  { title: 'Propiedades', href: '/propiedades', icon: 'Building2' },
  { title: 'Configuración', href: '/configuracion', icon: 'Settings' },
]

const propertyNavItems = (propertyId: string): NavItem[] => [
  { title: 'Resumen', href: `/propiedades/${propertyId}`, icon: 'LayoutDashboard' },
  { title: 'Contratos', href: `/contratos?propertyId=${propertyId}`, icon: 'FileText' },
  { title: 'Inquilinos', href: `/inquilinos?propertyId=${propertyId}`, icon: 'Users' },
  { title: 'Pagos', href: `/pagos?propertyId=${propertyId}`, icon: 'CreditCard' },
  { title: 'Gastos', href: `/gastos?propertyId=${propertyId}`, icon: 'Receipt' },
  { title: 'Relación de Gastos', href: `/relacion-gastos?propertyId=${propertyId}`, icon: 'Wallet' },
  { title: 'Documentos', href: `/documentos?propertyId=${propertyId}`, icon: 'FolderOpen' },
  { title: 'Soporte', href: `/soporte?propertyId=${propertyId}`, icon: 'HelpCircle' },
  { title: 'Reportes', href: `/reportes?propertyId=${propertyId}`, icon: 'BarChart3' },
]

const propietarioNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { title: 'Mis Propiedades', href: '/mis-propiedades', icon: 'Building2' },
  { title: 'Mis Contratos', href: '/mis-contratos', icon: 'FileText' },
  { title: 'Relación de Gastos', href: '/relacion-gastos', icon: 'Wallet' },
  { title: 'Soporte', href: '/soporte', icon: 'HelpCircle' },
  { title: 'Perfil', href: '/perfil', icon: 'User' },
]

const inquilinoNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { title: 'Mi Contrato', href: '/mi-contrato', icon: 'FileText' },
  { title: 'Mi Propiedad', href: '/mi-propiedad', icon: 'Home' },
  { title: 'Soporte', href: '/soporte', icon: 'HelpCircle' },
  { title: 'Perfil', href: '/perfil', icon: 'User' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAppStore()
  const { toggleSidebar } = useSidebar()
  const [queryPropertyId, setQueryPropertyId] = useState('')
  const [propertyTitle, setPropertyTitle] = useState('')

  const pathPropertyId = pathname.startsWith('/propiedades/')
    ? pathname.split('/')[2] || ''
    : ''
  const propertyId = pathPropertyId || queryPropertyId
  const isPropertyWorkspace = user?.role === 'admin' && Boolean(propertyId)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('propertyId') || ''
    queueMicrotask(() => setQueryPropertyId(id))
  }, [pathname])

  useEffect(() => {
    if (!propertyId || user?.role !== 'admin') {
      queueMicrotask(() => setPropertyTitle(''))
      return
    }

    let active = true
    fetch(`/api/properties/${propertyId}`)
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (active) setPropertyTitle(result?.data?.title || 'Propiedad')
      })
      .catch(() => {
        if (active) setPropertyTitle('Propiedad')
      })

    return () => { active = false }
  }, [propertyId, user?.role])

  const getNavItems = () => {
    switch (user?.role) {
      case 'admin':
        return isPropertyWorkspace ? propertyNavItems(propertyId) : adminNavItems
      case 'propietario':
        return propietarioNavItems
      case 'inquilino':
        return inquilinoNavItems
      default:
        return adminNavItems
    }
  }

  const navItems = getNavItems()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <ShadcnSidebar>
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center gap-2 px-4 py-2">
          <Building className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">InmoGest Pro</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isPropertyWorkspace ? (propertyTitle || 'Propiedad') :
             user?.role === 'admin' ? 'Administración' :
             user?.role === 'propietario' ? 'Propietario' : 'Inquilino'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard
                const itemPath = item.href.split('?')[0]
                const isActive = pathname === itemPath
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        isActive && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
            {isPropertyWorkspace && (
              <SidebarMenu className="mt-4 border-t pt-4">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/propiedades">
                      <ArrowLeft className="h-4 w-4" />
                      <span>Volver a propiedades</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <User className="h-4 w-4" />
                  <span className="truncate">{user?.name || 'Usuario'}</span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  )
}
