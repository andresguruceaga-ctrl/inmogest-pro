'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FolderOpen, Plus, Search, Filter, MoreHorizontal, Eye, Download, FileText, Image, File } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const documents = [
  { id: '1', name: 'Contrato Arrendamiento Apt 15-03.pdf', type: 'PDF', size: '524 KB', property: 'Apt Vista Mar', uploaded: '05 Ene 2025' },
  { id: '2', name: 'Escritura Propiedad Finca 12345.pdf', type: 'PDF', size: '1.2 MB', property: 'Casa Condado', uploaded: '15 Dic 2024' },
  { id: '3', name: 'Póliza Seguro 2024-2025.pdf', type: 'PDF', size: '328 KB', property: 'Oficina 2501', uploaded: '01 Dic 2024' },
  { id: '4', name: 'Evidencia Reparación Plomería.jpg', type: 'Imagen', size: '2.1 MB', property: 'Casa Condado', uploaded: '22 Dic 2024' },
  { id: '5', name: 'Recibo Depósito Garantía.pdf', type: 'PDF', size: '156 KB', property: 'Apt Vista Mar', uploaded: '20 Dic 2024' },
]

export default function DocumentosPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Documentos</h1>
                <p className="text-muted-foreground">Gestión documental de propiedades</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar documentos..." className="pl-9" />
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
                <CardTitle>Documentos</CardTitle>
                <CardDescription>5 documentos almacenados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead className="hidden md:table-cell">Propiedad</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden md:table-cell">Tamaño</TableHead>
                      <TableHead>Subido</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              {doc.type === 'PDF' ? (
                                <FileText className="h-5 w-5 text-red-500" />
                              ) : (
                                <Image className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{doc.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{doc.size}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {doc.property}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.type}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {doc.size}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.uploaded}
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
                                Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
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
