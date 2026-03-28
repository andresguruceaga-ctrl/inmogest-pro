'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { HelpCircle, Plus, Search, Filter, MoreHorizontal, Eye, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const tickets = [
  { id: '1', title: 'Fuga de agua en cocina', property: 'Apt 15-03, Vista Mar', priority: 'alta', status: 'en_proceso', date: '10 Ene' },
  { id: '2', title: 'Aire acondicionado no enfría', property: 'Apt 15-03, Vista Mar', priority: 'media', status: 'abierto', date: '08 Ene' },
  { id: '3', title: 'Puerta del garaje atascada', property: 'Casa 45, Condado', priority: 'baja', status: 'resuelto', date: '05 Ene' },
]

export default function SoportePage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Soporte</h1>
                <p className="text-muted-foreground">Sistema de tickets y solicitudes</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Ticket
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar tickets..." className="pl-9" />
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
                <CardTitle>Tickets de Soporte</CardTitle>
                <CardDescription>3 tickets registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead className="hidden md:table-cell">Propiedad</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{ticket.property}</TableCell>
                        <TableCell>
                          <Badge variant={ticket.priority === 'alta' ? 'destructive' : ticket.priority === 'media' ? 'outline' : 'secondary'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ticket.status === 'resuelto' ? 'default' : 'secondary'}
                            className={ticket.status === 'resuelto' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : ticket.status === 'en_proceso'
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }>
                            {ticket.status === 'en_proceso' ? 'En Proceso' : ticket.status === 'abierto' ? 'Abierto' : 'Resuelto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{ticket.date}</TableCell>
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
