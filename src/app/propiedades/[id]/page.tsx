'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  FolderOpen,
  HelpCircle,
  Loader2,
  MapPin,
  Receipt,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'

interface PropertyDetail {
  id: string
  title: string
  description?: string | null
  propertyType: string
  address: string
  district: string
  province: string
  monthlyRent: number
  status: string
  mainImage?: string | null
  owner?: { name: string; email: string } | null
  tenant?: { name: string; email: string } | null
  recurringExpenses?: unknown[]
  documents?: unknown[]
  summary?: {
    totalExpenses: number
    totalPendingPayments: number
    pendingPaymentsCount: number
    openTicketsCount: number
    activeContractsCount: number
  }
}

const propertyTypeLabels: Record<string, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  LOCAL_COMERCIAL: 'Local comercial',
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  TERRENO: 'Terreno',
  PH: 'PH',
}

const workspaceLinks = [
  { title: 'Contratos', description: 'Contratos y condiciones', href: '/contratos', icon: FileText },
  { title: 'Inquilinos', description: 'Inquilinos de la propiedad', href: '/inquilinos', icon: Users },
  { title: 'Pagos', description: 'Cobros y pagos mensuales', href: '/pagos', icon: CreditCard },
  { title: 'Gastos', description: 'Gastos fijos y variables', href: '/gastos', icon: Receipt },
  { title: 'Relación de gastos', description: 'Estado de cuenta del propietario', href: '/relacion-gastos', icon: Wallet },
  { title: 'Documentos', description: 'Archivos de esta propiedad', href: '/documentos', icon: FolderOpen },
  { title: 'Soporte', description: 'Mantenimientos e incidencias', href: '/soporte', icon: HelpCircle },
  { title: 'Reportes', description: 'Informe financiero y PDF', href: '/reportes', icon: BarChart3 },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(value || 0)
}

export default function PropertyWorkspacePage() {
  const params = useParams<{ id: string }>()
  const propertyId = params.id
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch(`/api/properties/${propertyId}`)
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'No se pudo cargar la propiedad')
        if (active) setProperty(result.data)
      })
      .catch(fetchError => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Error de conexión')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [propertyId])

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {loading ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error || !property ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="font-medium">{error || 'Propiedad no encontrada'}</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/propiedades"><ArrowLeft className="mr-2 h-4 w-4" />Volver a propiedades</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="grid md:grid-cols-[280px_1fr]">
                    <div className="aspect-[16/9] bg-muted md:aspect-auto md:min-h-52">
                      {property.mainImage ? (
                        <img src={property.mainImage} alt={property.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full min-h-48 items-center justify-center">
                          <Building2 className="h-16 w-16 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-4 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <Button asChild variant="link" className="mb-2 h-auto p-0 text-muted-foreground">
                            <Link href="/propiedades"><ArrowLeft className="mr-1 h-4 w-4" />Todas las propiedades</Link>
                          </Button>
                          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{property.title}</h1>
                          <p className="mt-2 flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-4 w-4" />{property.address}, {property.district}, {property.province}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{propertyTypeLabels[property.propertyType] || property.propertyType}</Badge>
                          <Badge>{property.status}</Badge>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">Alquiler mensual</p>
                          <p className="mt-1 font-semibold">{formatCurrency(property.monthlyRent)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">Propietario</p>
                          <p className="mt-1 truncate font-semibold">{property.owner?.name || 'Sin asignar'}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">Inquilino actual</p>
                          <p className="mt-1 truncate font-semibold">{property.tenant?.name || 'Sin inquilino'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card><CardHeader className="pb-2"><CardDescription>Contratos vigentes</CardDescription><CardTitle>{property.summary?.activeContractsCount || 0}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Pagos pendientes</CardDescription><CardTitle>{formatCurrency(property.summary?.totalPendingPayments || 0)}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Gastos registrados</CardDescription><CardTitle>{formatCurrency(property.summary?.totalExpenses || 0)}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Soportes abiertos</CardDescription><CardTitle>{property.summary?.openTicketsCount || 0}</CardTitle></CardHeader></Card>
                </div>

                <div>
                  <h2 className="mb-4 text-xl font-semibold">Gestión de la propiedad</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {workspaceLinks.map(item => {
                      const Icon = item.icon
                      return (
                        <Link key={item.href} href={`${item.href}?propertyId=${property.id}`}>
                          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                            <CardHeader>
                              <Icon className="mb-2 h-6 w-6 text-primary" />
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              <CardDescription>{item.description}</CardDescription>
                            </CardHeader>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
