'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Bell, 
  Search, 
  Menu, 
  Sun, 
  Moon, 
  Settings,
  LogOut,
  User,
  ChevronRight,
  X,
  Check,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAppStore, type Notification } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useSidebar, SidebarTrigger } from '@/components/ui/sidebar'

// Theme toggle component
function ThemeToggle() {
  const { theme, setTheme } = useAppStore()
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="h-9 w-9"
    >
      {theme === 'light' && <Sun className="h-4 w-4" />}
      {theme === 'dark' && <Moon className="h-4 w-4" />}
      {theme === 'system' && (
        <div className="relative h-4 w-4">
          <Sun className="h-4 w-4 absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="h-4 w-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </div>
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

// Notification item component
function NotificationItem({ 
  notification, 
  onMarkRead 
}: { 
  notification: Notification
  onMarkRead: (id: string) => void
}) {
  const typeColors: Record<string, string> = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }
  
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes}m`
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${days}d`
  }
  
  return (
    <div 
      className={cn(
        'flex gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors',
        !notification.read && 'bg-accent/30'
      )}
      onClick={() => !notification.read && onMarkRead(notification.id)}
    >
      <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', typeColors[notification.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onMarkRead(notification.id)
          }}
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

// Notifications dropdown
function NotificationsDropdown() {
  const { notifications, markAsRead, markAllAsRead, getUnreadCount } = useAppStore()
  const unreadCount = getUnreadCount()
  const [open, setOpen] = React.useState(false)
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs notification-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-medium">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={markAllAsRead}
            >
              Marcar todas leídas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
              />
            ))
          )}
        </div>
        {notifications.length > 5 && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full">
              Ver todas las notificaciones
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// User menu dropdown
function UserMenu() {
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
  
  const handleLogout = () => {
    logout()
    setOpenMobile(false)
    router.push('/login')
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 px-2 gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium">
            {user.name.split(' ')[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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

// Search component
function SearchBar() {
  const [focused, setFocused] = React.useState(false)
  
  return (
    <div className={cn(
      'relative hidden md:flex items-center transition-all',
      focused && 'w-72'
    )}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder="Buscar propiedades, contratos..."
        className="pl-9 w-64 focus:w-72 transition-all"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <kbd className="absolute right-3 pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </div>
  )
}

// Breadcrumb generator
function useBreadcrumbs() {
  const pathname = usePathname()
  
  const routeLabels: Record<string, string> = {
    '': 'Dashboard',
    propiedades: 'Propiedades',
    contratos: 'Contratos',
    gastos: 'Gastos',
    documentos: 'Documentos',
    inquilinos: 'Inquilinos',
    propietarios: 'Propietarios',
    reportes: 'Reportes',
    'mi-propiedad': 'Mi Propiedad',
    'mi-contrato': 'Mi Contrato',
    pagos: 'Pagos',
    soporte: 'Soporte',
    perfil: 'Perfil',
    'mis-propiedades': 'Mis Propiedades',
    'reportes-financieros': 'Reportes Financieros',
    configuracion: 'Configuración',
  }
  
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = routeLabels[segment] || segment
    const isLast = index === segments.length - 1
    
    return { href, label, isLast }
  })
  
  return breadcrumbs
}

// Main header component
export function Header() {
  const breadcrumbs = useBreadcrumbs()
  const { toggleSidebar, isMobile } = useSidebar()
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-2 px-4">
        {/* Mobile menu button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9 md:hidden"
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
        
        {/* Sidebar trigger for desktop */}
        {!isMobile && <SidebarTrigger />}
        
        {/* Breadcrumbs */}
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.length > 0 && breadcrumbs[0].label !== 'Dashboard' && (
              <>
                <BreadcrumbSeparator />
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    <BreadcrumbItem>
                      {crumb.isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!crumb.isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <SearchBar />
          
          {/* Mobile search button */}
          <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
            <Search className="h-4 w-4" />
            <span className="sr-only">Buscar</span>
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <NotificationsDropdown />
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default Header
