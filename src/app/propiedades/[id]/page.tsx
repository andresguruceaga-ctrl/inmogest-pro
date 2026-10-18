'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { downloadPropertyPDF, getPropertyImageUrls, type PropertyPDFData } from '@/lib/property-pdf'
import {
  ArrowLeft,
  BarChart3,
  Bath,
  BedDouble,
  Building2,
  Car,
  Check,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  Images,
  Layers3,
  Loader2,
  MapPin,
  Receipt,
  Ruler,
  Users,
  Wallet,
} from 'lucide-react'

interface PropertyDetail extends PropertyPDFData {
  id: string
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

const propertyStatusLabels: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADA: 'Ocupada',
  MANTENIMIENTO: 'En mantenimiento',
  INACTIVA: 'Inactiva',
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
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export default function PropertyWorkspacePage() {
  const params = useParams<{ id: string }>()
  const propertyId = params.id
  const { toast } = useToast()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [error, setError] = useState('')

  const imageUrls = useMemo(() => property ? getPropertyImageUrls(property) : [], [property])

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

  const handleDownloadPDF = async () => {
    if (!property) return
    setDownloadingPDF(true)
    try {
      const result = await downloadPropertyPDF(property)
      toast({
        title: 'PDF descargado',
        description: result.totalPhotos === result.includedPhotos
          ? `La ficha incluye las ${result.includedPhotos} fotos de la propiedad.`
          : `Se incluyeron ${result.includedPhotos} de ${result.totalPhotos} fotos.`,
      })
    } catch (downloadError) {
      console.error('Error generando el PDF de la propiedad:', downloadError)
      toast({
        title: 'No se pudo crear el PDF',
        description: 'Comprueba que las imágenes continúen disponibles e inténtalo nuevamente.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingPDF(false)
    }
  }

  const features = property ? [
    property.hasTerrace ? 'Terraza' : null,
    property.hasBalcony ? 'Balcón' : null,
    property.hasDen ? 'Den' : null,
    property.hasMaidRoomBathroom ? 'Cuarto y baño de empleada' : null,
    property.hasSocialArea ? 'Área social' : null,
  ].filter((feature): feature is string => Boolean(feature)) : []

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-8">
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
                <section className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button asChild variant="ghost" className="-ml-3 text-muted-foreground">
                      <Link href="/propiedades"><ArrowLeft className="mr-2 h-4 w-4" />Todas las propiedades</Link>
                    </Button>
                    <Button onClick={handleDownloadPDF} disabled={downloadingPDF}>
                      {downloadingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      {downloadingPDF ? 'Preparando fotos…' : 'Descargar ficha PDF'}
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    {imageUrls.length > 0 ? (
                      <div className={`grid gap-1 bg-muted ${imageUrls.length > 1 ? 'lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]' : ''}`}>
                        <div className="group relative aspect-[16/10] min-h-72 overflow-hidden bg-slate-100 lg:aspect-auto lg:min-h-[470px]">
                          <img
                            src={imageUrls[selectedImage] || imageUrls[0]}
                            alt={`${property.title} - Foto ${selectedImage + 1}`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                          <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm">
                            <Images className="h-4 w-4" />Foto {selectedImage + 1} de {imageUrls.length}
                          </span>
                        </div>
                        {imageUrls.length > 1 && <div
                          className={`hidden gap-1 lg:grid ${imageUrls.length >= 5 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-1'}`}
                          style={imageUrls.length < 5 ? { gridTemplateRows: `repeat(${imageUrls.length - 1}, minmax(0, 1fr))` } : undefined}
                        >
                          {imageUrls.slice(1, 5).map((url, index) => (
                            <button
                              type="button"
                              key={`${url}-${index}`}
                              className={`relative min-h-0 overflow-hidden bg-slate-100 ${selectedImage === index + 1 ? 'ring-4 ring-inset ring-primary' : ''}`}
                              onClick={() => setSelectedImage(index + 1)}
                            >
                              <img src={url} alt={`${property.title} - Miniatura ${index + 2}`} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                              {index === 3 && imageUrls.length > 5 && (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-semibold text-white">
                                  <Images className="mr-2 h-5 w-5" />+{imageUrls.length - 5} fotos
                                </span>
                              )}
                            </button>
                          ))}
                        </div>}
                      </div>
                    ) : (
                      <div className="flex min-h-80 items-center justify-center bg-muted">
                        <div className="text-center text-muted-foreground">
                          <Building2 className="mx-auto mb-3 h-16 w-16 opacity-30" />
                          <p>Esta propiedad todavía no tiene fotografías</p>
                        </div>
                      </div>
                    )}

                    {imageUrls.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto border-t bg-background p-3">
                        {imageUrls.map((url, index) => (
                          <button
                            type="button"
                            key={`${url}-thumbnail-${index}`}
                            className={`h-20 w-28 flex-none overflow-hidden rounded-lg border-2 bg-muted transition ${selectedImage === index ? 'border-primary shadow-sm' : 'border-transparent opacity-75 hover:opacity-100'}`}
                            onClick={() => setSelectedImage(index)}
                            aria-label={`Mostrar foto ${index + 1}`}
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-8 p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-7">
                        <div>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">{propertyTypeLabels[property.propertyType] || property.propertyType}</Badge>
                            <Badge variant="outline">{propertyStatusLabels[property.status] || property.status}</Badge>
                            {property.forSale && <Badge className="bg-violet-600 hover:bg-violet-600">En venta</Badge>}
                            {property.forRent !== false && <Badge className="bg-teal-600 hover:bg-teal-600">En alquiler</Badge>}
                          </div>
                          <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{property.title}</h1>
                          <p className="mt-3 flex items-start gap-2 text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4 flex-none" />
                            <span>{[property.address, property.neighborhood, property.district, property.province].filter(Boolean).join(', ')}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                          {[
                            { icon: BedDouble, label: 'Recámaras', value: property.bedrooms },
                            { icon: Bath, label: 'Baños', value: property.bathrooms },
                            { icon: Car, label: 'Estacionamientos', value: property.parkingSpaces },
                            { icon: Ruler, label: 'Área total', value: `${property.totalArea} m²` },
                            { icon: Layers3, label: 'Área construida', value: property.builtArea ? `${property.builtArea} m²` : 'No indicada' },
                          ].map(item => {
                            const Icon = item.icon
                            return (
                              <div key={item.label} className="rounded-xl border bg-muted/25 p-4">
                                <Icon className="mb-3 h-5 w-5 text-primary" />
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                <p className="mt-1 font-semibold">{item.value}</p>
                              </div>
                            )
                          })}
                        </div>

                        {(property.description || property.saleDescription) && (
                          <div>
                            <h2 className="text-xl font-semibold">Descripción</h2>
                            <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">
                              {property.description || property.saleDescription}
                            </p>
                          </div>
                        )}

                        {features.length > 0 && (
                          <div>
                            <h2 className="text-xl font-semibold">Amenidades y características</h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {features.map(feature => (
                                <div key={feature} className="flex items-center gap-3 rounded-lg border p-3">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-4 w-4" /></span>
                                  <span className="font-medium">{feature}</span>
                                </div>
                              ))}
                            </div>
                            {property.hasSocialArea && property.socialAreaDescription && (
                              <p className="mt-3 rounded-lg bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">{property.socialAreaDescription}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <aside className="space-y-4">
                        <Card className="border-primary/20 bg-primary/[0.03]">
                          <CardContent className="space-y-5 p-5">
                            {property.forSale && (
                              <div>
                                <p className="text-sm text-muted-foreground">Precio de venta</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-primary">{formatCurrency(property.salePrice || 0)}</p>
                              </div>
                            )}
                            {property.forRent !== false && (
                              <div className={property.forSale ? 'border-t pt-4' : ''}>
                                <p className="text-sm text-muted-foreground">Alquiler mensual</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-primary">{formatCurrency(property.monthlyRent)}</p>
                                {property.depositAmount > 0 && <p className="mt-2 text-sm text-muted-foreground">Depósito: {formatCurrency(property.depositAmount)}</p>}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base"><Home className="mr-2 inline h-4 w-4" />Detalles adicionales</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            {property.buildingName && <DetailRow label="Edificio / PH" value={property.buildingName} />}
                            {property.floorNumber != null && <DetailRow label="Piso" value={String(property.floorNumber)} />}
                            {property.corregimiento && <DetailRow label="Corregimiento" value={property.corregimiento} />}
                            <DetailRow label="Finca" value={property.fincaNumber || 'No registrada'} />
                          </CardContent>
                        </Card>

                        {(property.phContactName || property.phContactPhone || property.phContactEmail) && (
                          <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-base">Contacto del PH</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                              {property.phContactName && <DetailRow label="Contacto" value={property.phContactName} />}
                              {property.phContactPhone && <DetailRow label="Teléfono" value={property.phContactPhone} />}
                              {property.phContactEmail && <DetailRow label="Correo" value={property.phContactEmail} />}
                            </CardContent>
                          </Card>
                        )}
                      </aside>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 border-t pt-8">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wider text-primary">Área privada</p>
                    <h2 className="mt-1 text-2xl font-semibold">Gestión de la propiedad</h2>
                    <p className="mt-1 text-muted-foreground">Administración financiera, contractual y operativa.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="pb-2"><CardDescription>Contratos vigentes</CardDescription><CardTitle>{property.summary?.activeContractsCount || 0}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Pagos pendientes</CardDescription><CardTitle>{formatCurrency(property.summary?.totalPendingPayments || 0)}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Gastos registrados</CardDescription><CardTitle>{formatCurrency(property.summary?.totalExpenses || 0)}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Soportes abiertos</CardDescription><CardTitle>{property.summary?.openTicketsCount || 0}</CardTitle></CardHeader></Card>
                  </div>

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
                </section>
              </>
            )}
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  )
}
