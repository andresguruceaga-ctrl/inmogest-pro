'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Eye, MoreHorizontal, Loader2, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { Separator } from '@/components/ui/separator'

interface Property {
  id: string
  title: string
  address: string
  province: string
  propertyType: string
  monthlyRent: number
  itbmsAmount: number
  totalRentWithITBMS: number
  status: string
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  tenant: {
    id: string
    name: string
    email: string
    phone: string | null
  } | null
  owner: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  _count?: {
    contracts: number
    expenses: number
    supportTickets: number
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DISPONIBLE: { label: 'Disponible', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  OCUPADA: { label: 'Ocupada', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  MANTENIMIENTO: { label: 'Mantenimiento', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  INACTIVA: { label: 'Inactiva', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  LOCAL_COMERCIAL: 'Local Comercial',
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  TERRENO: 'Terreno',
  PH: 'PH',
}

export default function MisPropiedadesPage() {
  const { user } = useAppStore()
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Only propietario role can access this page
    if (user.role !== 'propietario' && user.role !== 'admin') {
      router.push('/')
      return
    }
  }, [user, router])

  // Fetch properties for this owner
  useEffect(() => {
    if (!user?.id) return

    const fetchProperties = async () => {
      setLoading(true)
      setError(null)

      try {
        // Use user's role from store (API will convert to uppercase)
        const response = await fetch(`/api/properties?role=${user.role.toUpperCase()}&userId=${user.id}`)
        const result = await response.json()

        if (response.ok && result.success) {
          setProperties(result.properties || result.data || [])
        } else {
          setError(result.error || 'No se pudieron cargar las propiedades')
        }
      } catch (err) {
        console.error('Error fetching properties:', err)
        setError('Error de conexión al cargar las propiedades')
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [user?.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const openDetail = (property: Property) => {
    setSelectedProperty(property)
    setDetailOpen(true)
  }

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Calculate summary
  const totalMonthlyRent = properties.reduce((sum, p) => sum + p.monthlyRent, 0)
  const totalITBMS = properties.reduce((sum, p) => sum + (p.itbmsAmount || 0), 0)
  const occupiedCount = properties.filter(p => p.status === 'OCUPADA').length
  const availableCount = properties.filter(p => p.status === 'DISPONIBLE').length

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mis Propiedades</h1>
                <p className="text-muted-foreground">
                  Gestiona y visualiza el estado de tus propiedades
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Propiedades</p>
                      <p className="text-2xl font-bold mt-1">{properties.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
                      <p className="text-2xl font-bold mt-1 text-emerald-500">{formatCurrency(totalMonthlyRent)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ITBMS Mensual</p>
                      <p className="text-2xl font-bold mt-1 text-blue-500">{formatCurrency(totalITBMS)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ocupación</p>
                      <p className="text-2xl font-bold mt-1">{occupiedCount}/{properties.length}</p>
                      <p className="text-xs text-muted-foreground">
                        {availableCount} disponible(s)
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Properties List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Cargando propiedades...</p>
                </div>
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 opacity-50" />
                    <p className="text-muted-foreground">{error}</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Reintentar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : properties.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No tienes propiedades asignadas</p>
                    <p className="text-sm text-muted-foreground">
                      Contacta al administrador para que te asigne tus propiedades
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => {
                  const statusConfig = STATUS_LABELS[property.status] || STATUS_LABELS.INACTIVA

                  return (
                    <Card key={property.id} className="overflow-hidden">
                      <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-primary/40" />
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{property.title}</CardTitle>
                            <CardDescription className="truncate">{property.address}</CardDescription>
                            <p className="text-xs text-muted-foreground mt-1">
                              {property.province}
                            </p>
                          </div>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Tenant info */}
                          {property.tenant && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Inquilino:</span>
                              <span className="font-medium truncate">{property.tenant.name}</span>
                            </div>
                          )}

                          {/* Rent info */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Alquiler mensual</p>
                              <p className="text-xl font-bold">
                                {formatCurrency(property.monthlyRent)}
                                <span className="text-sm font-normal text-muted-foreground">/mes</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                + {formatCurrency(property.itbmsAmount || 0)} ITBMS
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetail(property)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </SidebarInset>

      {/* Property Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de la Propiedad</DialogTitle>
            <DialogDescription>
              Información completa de la propiedad
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedProperty.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">
                    {PROPERTY_TYPE_LABELS[selectedProperty.propertyType] || selectedProperty.propertyType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={STATUS_LABELS[selectedProperty.status]?.color || ''}>
                    {STATUS_LABELS[selectedProperty.status]?.label || selectedProperty.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provincia</p>
                  <p className="font-medium">{selectedProperty.province}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Habitaciones</p>
                  <p className="font-medium">{selectedProperty.bedrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Baños</p>
                  <p className="font-medium">{selectedProperty.bathrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estacionamientos</p>
                  <p className="font-medium">{selectedProperty.parkingSpaces}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alquiler base:</span>
                  <span className="font-medium">{formatCurrency(selectedProperty.monthlyRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ITBMS (7%):</span>
                  <span className="font-medium">{formatCurrency(selectedProperty.itbmsAmount || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total mensual:</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(selectedProperty.totalRentWithITBMS || selectedProperty.monthlyRent + (selectedProperty.itbmsAmount || 0))}
                  </span>
                </div>
              </div>

              {selectedProperty.tenant && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Inquilino Actual</p>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="font-medium">{selectedProperty.tenant.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedProperty.tenant.email}</p>
                      {selectedProperty.tenant.phone && (
                        <p className="text-sm text-muted-foreground">{selectedProperty.tenant.phone}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selectedProperty._count && (
                <>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty._count.contracts}</p>
                      <p className="text-xs text-muted-foreground">Contratos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty._count.expenses}</p>
                      <p className="text-xs text-muted-foreground">Gastos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedProperty._count.supportTickets}</p>
                      <p className="text-xs text-muted-foreground">Tickets</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
