'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// User roles
export type UserRole = 'admin' | 'inquilino' | 'propietario'

// User interface
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
}

// Notification interface
export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}

// Navigation item interface
export interface NavItem {
  id: string
  label: string
  href: string
  icon: string
  roles: UserRole[]
}

// Navigation items by role
export const NAV_ITEMS: NavItem[] = [
  // Admin navigation
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'LayoutDashboard', roles: ['admin', 'inquilino', 'propietario'] },
  { id: 'propiedades', label: 'Propiedades', href: '/propiedades', icon: 'Building2', roles: ['admin'] },
  { id: 'contratos', label: 'Contratos', href: '/contratos', icon: 'FileText', roles: ['admin'] },
  { id: 'gastos', label: 'Gastos', href: '/gastos', icon: 'Receipt', roles: ['admin'] },
  { id: 'documentos', label: 'Documentos', href: '/documentos', icon: 'FolderOpen', roles: ['admin'] },
  { id: 'inquilinos', label: 'Inquilinos', href: '/inquilinos', icon: 'Users', roles: ['admin'] },
  { id: 'propietarios', label: 'Propietarios', href: '/propietarios', icon: 'UserCheck', roles: ['admin'] },
  { id: 'reportes', label: 'Reportes', href: '/reportes', icon: 'BarChart3', roles: ['admin'] },
  
  // Inquilino navigation
  { id: 'mi-propiedad', label: 'Mi Propiedad', href: '/mi-propiedad', icon: 'Home', roles: ['inquilino'] },
  { id: 'mi-contrato', label: 'Mi Contrato', href: '/mi-contrato', icon: 'FileText', roles: ['inquilino'] },
  { id: 'pagos', label: 'Pagos', href: '/pagos', icon: 'CreditCard', roles: ['inquilino'] },
  { id: 'soporte', label: 'Soporte', href: '/soporte', icon: 'HelpCircle', roles: ['inquilino', 'propietario'] },
  { id: 'perfil', label: 'Perfil', href: '/perfil', icon: 'User', roles: ['inquilino', 'propietario'] },
  
  // Propietario navigation
  { id: 'mis-propiedades', label: 'Mis Propiedades', href: '/mis-propiedades', icon: 'Building2', roles: ['propietario'] },
  { id: 'contratos-prop', label: 'Contratos', href: '/contratos', icon: 'FileText', roles: ['propietario'] },
  { id: 'reportes-financieros', label: 'Reportes Financieros', href: '/reportes-financieros', icon: 'TrendingUp', roles: ['propietario'] },
]

// Demo notifications
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Nuevo contrato creado',
    message: 'Se ha creado un nuevo contrato para la propiedad en Bella Vista',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    title: 'Pago recibido',
    message: 'Se recibió el pago de alquiler de María García',
    type: 'info',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '3',
    title: 'Contrato por vencer',
    message: 'El contrato #1234 vence en 30 días',
    type: 'warning',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
]

// App state interface
interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
  
  // Navigation state
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Notifications state
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  getUnreadCount: () => number
  
  // Theme state
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  
  // Helper functions
  getNavItems: () => NavItem[]
}

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User state - null by default (must login)
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      
      // Navigation state
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      // Notifications state
      notifications: DEMO_NOTIFICATIONS,
      addNotification: (notification) => set((state) => ({
        notifications: [
          { ...notification, id: Date.now().toString(), read: false, createdAt: new Date() },
          ...state.notifications,
        ],
      })),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      })),
      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      })),
      clearNotifications: () => set({ notifications: [] }),
      getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
      
      // Theme state
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      
      // Helper functions
      getNavItems: () => {
        const { user } = get()
        if (!user) return []
        return NAV_ITEMS.filter((item) => item.roles.includes(user.role))
      },
    }),
    {
      name: 'inmogest-pro-storage',
      partialize: (state) => ({
        user: state.user,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
