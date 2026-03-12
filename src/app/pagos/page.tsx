'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const payments = [
  { id: '1', month: 'Enero 2025', amount: 2675, status: 'paid', date: '05 Ene' },
  { id: '2', month: 'Diciembre 2024', amount: 2675, status: 'paid', date: '03 Dic' },
  { id: '3', month: 'Noviembre 2024', amount: 2675, status: 'paid', date: '02 Nov' },
]

export default function PagosPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pagos</h1>
            <p className="text-muted-foreground">Historial y estado de pagos</p>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Próximo pago</p>
                  <p className="text-2xl font-bold">$2,675.00</p>
                  <p className="text-xs text-muted-foreground">01 Febrero 2025</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total pagado 2025</p>
                  <p className="text-2xl font-bold">$2,675.00</p>
                  <div className="flex items-center gap-1 text-emerald-500 text-xs">
                    <ArrowUpRight className="h-3 w-3" /> Al día
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Incluye ITBMS (7%)</p>
                  <p className="text-2xl font-bold">$175.00</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
                <CardDescription>Últimos 12 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.month}</p>
                          <p className="text-xs text-muted-foreground">{payment.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${payment.amount.toLocaleString()}</p>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Pagado</Badge>
                      </div>
                    </div>
                  ))}
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
