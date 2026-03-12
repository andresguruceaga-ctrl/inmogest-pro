'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Building2, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, MapPin, Bed, Bath, Car, Ruler } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const properties = [
  { id: '1', name: 'Apartamento Vista Mar', address: 'Punta Paitilla', type: 'Apartamento', bedrooms: 3, bathrooms: 2, parking: 2, area: 150.5, rent: 2500, status: 'ocupada' },
  { id: '2', name: 'Casa Condado del Rey', address: 'Juan Díaz', type: 'Casa', bedrooms: 4, bathrooms: 3, parking: 2, area: 280, rent: 1800, status: 'ocupada' },
  { id: '3', name: 'Local Comercial El Dorado', address: 'El Dorado', type: 'Local', bedrooms: 0, bathrooms: 2, parking: 4, area: 120, rent: 3500, status: 'disponible' },
  { id: '4', name: 'Oficina Torre Américas', address: 'Punta Pacífica', type: 'Oficina', bedrooms: 0, bathrooms: 2, parking: 3, area: 85, rent: 4200, status: 'ocupada' },
  { id: '5', name: 'PH Costa del Este', address: 'Costa del Este', type: 'PH', bedrooms: 4, bathrooms: 4, parking: 4, area: 350, rent: 6500, status: 'disponible' },
]

export default function PropiedadesPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Propiedades</h1>
                <p className="text-muted-foreground">Gestiona tu inventario de propiedades</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Propiedad
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar propiedades..." className="pl-9" />
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
                <CardTitle>Listado de Propiedades</CardTitle>
                <CardDescription>5 propiedades registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propiedad</TableHead>
                      <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                      <TableHead className="hidden lg:table-cell">Características</TableHead>
                      <TableHead>Alquiler</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{property.name}</p>
                              <p className="text-xs text-muted-foreground">{property.type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {property.address}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {property.bedrooms > 0 && (
                              <span className="flex items-center gap-1">
                                <Bed className="h-3 w-3" /> {property.bedrooms}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Bath className="h-3 w-3" /> {property.bathrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" /> {property.parking}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" /> {property.area}m²
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${property.rent.toLocaleString()}/mes
                        </TableCell>
                        <TableCell>
                          <Badge variant={property.status === 'ocupada' ? 'default' : 'secondary'}
                            className={property.status === 'ocupada' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }>
                            {property.status === 'ocupada' ? 'Ocupada' : 'Disponible'}
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
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
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
