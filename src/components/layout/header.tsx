'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Search,
  Menu,
  Sun,
  Moon,
  Settings,
  LogOut,
  User,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default Header
