'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Plus, Search, Filter, MoreHorizontal, Eye, Download, Calendar, User, Building2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const contracts = [
  { id: '1', number: 'CTR-2024-001', property: 'Apartamento Vista Mar', tenant: 'Pedro González', startDate: '01 Ene 2024', endDate: '31 Dic 2025', amount: 2675, status: 'vigente' },
  { id: '2', number: 'CTR-2024-002', property: 'Casa Condado del Rey', tenant: 'Ana Martínez', startDate: '01 Mar 2024', endDate: '28 Feb 2025', amount: 1926, status: 'vigente' },
  { id: '3', number: 'CTR-2024-003', property: 'Oficina Torre Américas', tenant: 'Luis Herrera', startDate: '01 Jun 2024', endDate: '31 May 2025', amount: 4494, status: 'vigente' },
  { id: '4', number: 'CTR-2023-015', property: 'Local El Dorado', tenant: 'Comercial XYZ', startDate: '01 Ago 2023', endDate: '31 Jul 2024', amount: 3745, status: 'vencido' },
]

export default function ContratosPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contratos</h1>
                <p className="text-muted-foreground">Gestión de contratos de arrendamiento</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Contrato
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar contratos..." className="pl-9" />
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
                <CardTitle>Listado de Contratos</CardTitle>
                <CardDescription>4 contratos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Propiedad</TableHead>
                      <TableHead className="hidden md:table-cell">Inquilino</TableHead>
                      <TableHead className="hidden lg:table-cell">Vigencia</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-mono font-medium">{contract.number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {contract.property}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {contract.tenant}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {contract.startDate} - {contract.endDate}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">${contract.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={contract.status === 'vigente' ? 'default' : 'secondary'}
                            className={contract.status === 'vigente' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }>
                            {contract.status === 'vigente' ? 'Vigente' : 'Vencido'}
                          </Badge>
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
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Descargar PDF
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
