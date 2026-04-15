'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import { useRouter } from 'next/navigation'

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
}

interface NavItem {
  title: string
  href: string
  icon: string
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { title: 'Propiedades', href: '/propiedades', icon: 'Building2' },
  { title: 'Contratos', href: '/contratos', icon: 'FileText' },
  { title: 'Inquilinos', href: '/inquilinos', icon: 'Users' },
  { title: 'Propietarios', href: '/propietarios', icon: 'UserCheck' },
  { title: 'Pagos', href: '/pagos', icon: 'CreditCard' },
  { title: 'Gastos', href: '/gastos', icon: 'Receipt' },
  { title: 'Relación de Gastos', href: '/relacion-gastos', icon: 'Wallet' },
  { title: 'Documentos', href: '/documentos', icon: 'FolderOpen' },
  { title: 'Reportes', href: '/reportes', icon: 'BarChart3' },
  { title: 'Soporte', href: '/soporte', icon: 'HelpCircle' },
  { title: 'Configuración', href: '/configuracion', icon: 'Settings' },
]

const propietarioNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { title: 'Mis Propiedades', href: '/mis-propiedades', icon: 'Building2' },
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

  const getNavItems = () => {
    switch (user?.role) {
      case 'admin':
        return adminNavItems
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
            {user?.role === 'admin' ? 'Administración' : 
             user?.role === 'propietario' ? 'Propietario' : 'Inquilino'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard
                const isActive = pathname === item.href
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
