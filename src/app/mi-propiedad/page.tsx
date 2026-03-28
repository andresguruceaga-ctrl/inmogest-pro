'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Home, Bed, Bath, Car, Ruler, MapPin, Building, Calendar, User } from 'lucide-react'

export default function MiPropiedadPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mi Propiedad</h1>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Apartamento Vista Mar</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> Ave. Balboa, Torre Vista Mar, Apto 15-03
                    </CardDescription>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 w-fit">Ocupado</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bed className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">3</p>
                      <p className="text-xs text-muted-foreground">Recámaras</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bath className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">2</p>
                      <p className="text-xs text-muted-foreground">Baños</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">2</p>
                      <p className="text-xs text-muted-foreground">Estacionamientos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Ruler className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">150.5 m²</p>
                      <p className="text-xs text-muted-foreground">Área total</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alquiler mensual</span>
                      <span className="font-semibold">$2,500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ITBMS (7%)</span>
                      <span className="font-semibold">$175.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span className="font-medium">Total mensual</span>
                      <span className="font-bold text-primary">$2,675.00</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Edificio:</span>
                      <span className="font-medium">Torre Vista Mar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Piso:</span>
                      <span className="font-medium">Piso 15</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Ocupado desde:</span>
                      <span className="font-medium">Enero 2024</span>
                    </div>
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
