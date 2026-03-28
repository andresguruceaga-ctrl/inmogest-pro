'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

export default function ConfiguracionPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configuración</h1>

            <Card>
              <CardHeader>
                <CardTitle>Preferencias de Cuenta</CardTitle>
                <CardDescription>Administra tu cuenta y preferencias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Notificaciones</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificaciones por correo</Label>
                      <p className="text-xs text-muted-foreground">Recibe actualizaciones por email</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Recordatorios de pago</Label>
                      <p className="text-xs text-muted-foreground">Recordatorios antes del vencimiento</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Seguridad</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Contraseña actual</Label>
                      <Input type="password" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nueva contraseña</Label>
                        <Input type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirmar contraseña</Label>
                        <Input type="password" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Guardar cambios</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
