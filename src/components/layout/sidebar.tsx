'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAppStore, type NavItem } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

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
}

// Logo component
function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Building className="h-5 w-5" />
      </div>
      { !collapsed && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            InmoGest
          </span>
          <span className="text-xs text-sidebar-foreground/60 -mt-1">
            Pro
          </span>
        </div>
      )}
    </Link>
  )
}

// Navigation item component
function NavItemComponent({ 
  item, 
  isActive,
  collapsed = false 
}: { 
  item: NavItem
  isActive: boolean
  collapsed?: boolean
}) {
  const Icon = iconMap[item.icon] || LayoutDashboard
  const { setOpenMobile } = useSidebar()
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={collapsed ? item.label : undefined}
        className={cn(
          'sidebar-item-hover',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        )}
      >
        <Link 
          href={item.href}
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-3"
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// User profile component
function UserProfile({ collapsed = false }: { collapsed?: boolean }) {
  const { user, logout } = useAppStore()
  const { setOpenMobile } = useSidebar()
  const router = useRouter()
  
  if (!user) return null
  
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    inquilino: 'Inquilino',
    propietario: 'Propietario',
  }
  
  const handleLogout = () => {
    logout()
    setOpenMobile(false)
    router.push('/login')
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-2 rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {roleLabels[user.role]}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'start' : 'end'}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil" onClick={() => setOpenMobile(false)}>
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/configuracion" onClick={() => setOpenMobile(false)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Role switcher component for demo
function RoleSwitcher() {
  const { user, setUser } = useAppStore()
  
  if (!user) return null
  
  const roles: Array<{ value: 'admin' | 'inquilino' | 'propietario'; label: string }> = [
    { value: 'admin', label: 'Admin' },
    { value: 'inquilino', label: 'Inquilino' },
    { value: 'propietario', label: 'Dueño' },
  ]
  
  return (
    <div className="flex gap-1 px-2">
      {roles.map((role) => (
        <Button
          key={role.value}
          size="sm"
          variant={user.role === role.value ? 'default' : 'ghost'}
          className="flex-1 text-xs h-7"
          onClick={() => setUser({ ...user, role: role.value })}
        >
          {role.label}
        </Button>
      ))}
    </div>
  )
}

// Main sidebar component
export function Sidebar() {
  const pathname = usePathname()
  const { getNavItems, user } = useAppStore()
  const { state } = useSidebar()
  
  const navItems = getNavItems()
  const collapsed = state === 'collapsed'
  
  // Group navigation items
  const mainNavItems = navItems.filter((item) => 
    ['dashboard', 'propiedades', 'mis-propiedades', 'mi-propiedad'].includes(item.id)
  )
  const managementNavItems = navItems.filter((item) => 
    ['contratos', 'gastos', 'documentos', 'inquilinos', 'propietarios', 'mi-contrato', 'pagos', 'mi-propiedad', 'mis-propiedades'].includes(item.id)
  )
  const reportNavItems = navItems.filter((item) => 
    ['reportes', 'reportes-financieros'].includes(item.id)
  )
  const supportNavItems = navItems.filter((item) => 
    ['soporte', 'perfil'].includes(item.id)
  )
  
  return (
    <ShadcnSidebar collapsible="icon">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between p-2">
          <Logo collapsed={collapsed} />
        </div>
        {/* Demo role switcher */}
        {!collapsed && user && (
          <div className="pb-2">
            <RoleSwitcher />
          </div>
        )}
      </SidebarHeader>
      
      {/* Navigation Content */}
      <SidebarContent className="scrollbar-thin">
        {/* Main Navigation */}
        {mainNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <NavItemComponent
                    key={item.id}
                    item={item}
                    isActive={pathname === item.href}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Management Navigation */}
        {managementNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestión</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementNavItems.map((item) => (
                  <NavItemComponent
                    key={item.id}
                    item={item}
                    isActive={pathname === item.href}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Reports Navigation */}
        {reportNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Reportes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {reportNavItems.map((item) => (
                  <NavItemComponent
                    key={item.id}
                    item={item}
                    isActive={pathname === item.href}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Support Navigation */}
        {supportNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Soporte</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {supportNavItems.map((item) => (
                  <NavItemComponent
                    key={item.id}
                    item={item}
                    isActive={pathname === item.href}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      {/* Footer with User Profile */}
      <SidebarFooter className="border-t border-sidebar-border">
        <UserProfile collapsed={collapsed} />
      </SidebarFooter>
      
      {/* Rail for resizing */}
      <SidebarRail />
    </ShadcnSidebar>
  )
}

// Mobile sidebar trigger
export function SidebarTrigger() {
  const { toggleSidebar } = useSidebar()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="h-9 w-9"
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

export default Sidebar
