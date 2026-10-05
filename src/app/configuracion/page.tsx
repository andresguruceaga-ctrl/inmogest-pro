'use client'

import { useState } from 'react'

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
import { Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ConfiguracionPage() {
  const [runningAutomation, setRunningAutomation] = useState(false)
  const { toast } = useToast()

  const runAutomation = async () => {
    setRunningAutomation(true)
    try {
      const response = await fetch('/api/automation/monthly', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo ejecutar la automatización')

      const data = result.data
      toast({
        title: 'Automatización completada',
        description: `${data.tenantPaymentsCreated} pago(s) y ${data.fixedExpensesCreated} gasto(s) nuevo(s).`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo ejecutar la automatización',
        variant: 'destructive',
      })
    } finally {
      setRunningAutomation(false)
    }
  }

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

            <Card>
              <CardHeader>
                <CardTitle>Automatización mensual</CardTitle>
                <CardDescription>
                  Los alquileres se preparan en la primera semana y los gastos fijos el día 30 de cada mes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  La ejecución es segura: si un registro mensual ya existe, no vuelve a crearlo. Puedes usar este botón para probar el proceso ahora.
                </p>
                <Button onClick={runAutomation} disabled={runningAutomation}>
                  {runningAutomation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Ejecutar ahora
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
