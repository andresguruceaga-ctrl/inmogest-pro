'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AdminDashboard, InquilinoDashboard, PropietarioDashboard } from '@/components/dashboards'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutDashboard, Users, UserCheck } from 'lucide-react'

type DashboardView = 'admin' | 'inquilino' | 'propietario'

export default function Home() {
  const { user } = useAppStore()
  const router = useRouter()
  const [activeView, setActiveView] = useState<DashboardView>('admin')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // For non-admin users, show their specific dashboard only
  if (user.role === 'inquilino') {
    return (
      <SidebarProvider>
        <Sidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <Header />
          
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <InquilinoDashboard />
            </div>
          </main>
          
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (user.role === 'propietario') {
    return (
      <SidebarProvider>
        <Sidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <Header />
          
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <PropietarioDashboard />
            </div>
          </main>
          
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // For admin users, show tabbed dashboard with ability to view others
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as DashboardView)} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
                <TabsTrigger value="inquilino" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Inquilinos</span>
                </TabsTrigger>
                <TabsTrigger value="propietario" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Propietarios</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin">
                <AdminDashboard />
              </TabsContent>
              
              <TabsContent value="inquilino">
                <InquilinoDashboard />
              </TabsContent>
              
              <TabsContent value="propietario">
                <PropietarioDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
