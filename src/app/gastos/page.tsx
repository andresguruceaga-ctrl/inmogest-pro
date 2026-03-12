'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Receipt, Plus, Search, Filter, MoreHorizontal, Eye, Calendar, Building2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const expenses = [
  { id: '1', date: '05 Ene 2025', property: 'Apt 15-03, Vista Mar', category: 'Mantenimiento PH', amount: 267.50, type: 'fijo' },
  { id: '2', date: '12 Ene 2025', property: 'Apt 15-03, Vista Mar', category: 'Servicio Técnico', amount: 160.50, type: 'variable' },
  { id: '3', date: '15 Ene 2025', property: 'Casa 45, Condado', category: 'Seguro', amount: 535.00, type: 'fijo' },
  { id: '4', date: '22 Dic 2024', property: 'Casa 45, Condado', category: 'Reparación', amount: 214.00, type: 'variable' },
  { id: '5', date: '01 Ene 2025', property: 'Oficina 2501', category: 'Comisión Admin', amount: 374.50, type: 'fijo' },
]

const summary = [
  { label: 'Total Gastos Fijos', value: 1177.00, trend: 'up' },
  { label: 'Total Variables', value: 374.50, trend: 'down' },
  { label: 'ITBMS Pagado', value: 108.16, trend: 'neutral' },
  { label: 'Total Mes', value: 1551.50, trend: 'up' },
]

export default function GastosPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gastos</h1>
                <p className="text-muted-foreground">Control de gastos fijos y variables</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {summary.map((item, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold">${item.value.toLocaleString()}</span>
                      {item.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-red-500" />}
                      {item.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar gastos..." className="pl-9" />
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Gastos</CardTitle>
                <CardDescription>Enero 2025</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Propiedad</TableHead>
                      <TableHead className="hidden md:table-cell">Categoría</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {expense.date}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {expense.property}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{expense.category}</TableCell>
                        <TableCell>
                          <Badge variant={expense.type === 'fijo' ? 'outline' : 'secondary'}>
                            {expense.type === 'fijo' ? 'Fijo' : 'Variable'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-red-500">
                          -${expense.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
