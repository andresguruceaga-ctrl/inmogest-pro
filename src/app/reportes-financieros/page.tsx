'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, TrendingDown, DollarSign, Receipt, BarChart3 } from 'lucide-react'

const summary = [
  { label: 'Ingresos Brutos', value: 18500, icon: TrendingUp, color: 'text-emerald-500' },
  { label: 'Gastos Totales', value: 1650, icon: TrendingDown, color: 'text-red-500' },
  { label: 'Ingreso Neto', value: 16850, icon: DollarSign, color: 'text-primary' },
  { label: 'ITBMS Recaudado', value: 1295, icon: Receipt, color: 'text-blue-500' },
]

export default function ReportesFinancierosPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reportes Financieros</h1>
                <p className="text-muted-foreground">Análisis detallado de tus propiedades</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Descargar Reporte
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {summary.map((item, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="text-2xl font-bold mt-1">${item.value.toLocaleString()}</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <item.icon className={`h-6 w-6 ${item.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Desglose Financiero Mensual
                </CardTitle>
                <CardDescription>Enero 2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ingresos Brutos</span>
                      <span className="text-2xl font-bold text-emerald-500">+$18,500.00</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">3 propiedades generando ingresos</p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Gastos Totales</span>
                      <span className="text-2xl font-bold text-red-500">-$1,650.00</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Gastos fijos + variables + ITBMS</p>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Ingreso Neto</span>
                      <span className="text-2xl font-bold text-primary">$16,850.00</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">91% margen neto</p>
                  </div>
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
