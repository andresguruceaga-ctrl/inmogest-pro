'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Building2, MapPin, Bed, Bath, Car, Ruler, DollarSign, 
  ChevronLeft, ChevronRight, Download, Loader2, FileText,
  User, Phone, Mail, Calendar, Home, Layers, MessageSquare, Tag
} from 'lucide-react'
import jsPDF from 'jspdf'
import { useToast } from '@/hooks/use-toast'

interface Property {
  id: string
  title: string
  description?: string | null
  propertyType: string
  province: string
  district: string
  corregimiento?: string | null
  neighborhood?: string | null
  address: string
  buildingName?: string | null
  totalArea: number
  builtArea?: number | null
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  floorNumber?: number | null
  fincaNumber: string
  tomoNumber?: string | null
  folioNumber?: string | null
  asientoNumber?: string | null
  monthlyRent: number
  itbmsRate: number
  depositAmount: number
  status: string
  mainImage?: string | null
  images?: string | null
  comments?: string | null
  forSale?: boolean
  salePrice?: number | null
  saleDescription?: string | null
  forRent?: boolean
  owner?: { id: string; name: string; email: string; phone?: string | null } | null
  tenant?: { id: string; name: string; email: string; phone?: string | null } | null
}

interface PropertyDetailDialogProps {
  property: Property | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const propertyTypes: Record<string, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  LOCAL_COMERCIAL: 'Local Comercial',
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  TERRENO: 'Terreno',
  PH: 'PH',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DISPONIBLE: { label: 'Disponible', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  OCUPADA: { label: 'Ocupada', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  MANTENIMIENTO: { label: 'Mantenimiento', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  INACTIVA: { label: 'Inactiva', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

export function PropertyDetailDialog({ property, open, onOpenChange }: PropertyDetailDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (property) {
      const urls: string[] = []
      if (property.mainImage) {
        urls.push(property.mainImage)
      }
      if (property.images) {
        try {
          const parsed = JSON.parse(property.images)
          for (const url of parsed) {
            if (url !== property.mainImage) {
              urls.push(url)
            }
          }
        } catch (e) {
          console.error('Error parsing images:', e)
        }
      }
      setImageUrls(urls)
      setCurrentImageIndex(0)
    }
  }, [property])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)
  }

  const generatePropertyPDF = async () => {
    if (!property) return

    setLoading(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 20

      // Header
      doc.setFontSize(22)
      doc.setTextColor(40, 40, 40)
      doc.text('InmoGest Pro', 14, y)
      y += 10

      doc.setFontSize(16)
      doc.text(property.title, 14, y)
      y += 8

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-PA')}`, 14, y)
      y += 15

      // Main Image
      if (imageUrls.length > 0) {
        try {
          const mainImageUrl = imageUrls[0]
          // For external URLs, we need to handle CORS
          if (mainImageUrl.startsWith('http') || mainImageUrl.startsWith('/')) {
            // Add image placeholder info
            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            doc.text('[Foto principal de la propiedad]', 14, y)
            y += 5
            
            // Draw a placeholder rectangle
            doc.setDrawColor(200, 200, 200)
            doc.setFillColor(245, 245, 245)
            doc.roundedRect(14, y, pageWidth - 28, 60, 3, 3, 'FD')
            doc.setFontSize(12)
            doc.setTextColor(150, 150, 150)
            doc.text('Ver fotos en la aplicación', pageWidth / 2, y + 32, { align: 'center' })
            y += 70
          }
        } catch (e) {
          console.error('Error adding image to PDF:', e)
        }
      }

      // Property Info Section
      doc.setFontSize(14)
      doc.setTextColor(40, 40, 40)
      doc.text('Información General', 14, y)
      y += 8

      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      
      const infoLines = [
        `Tipo: ${propertyTypes[property.propertyType] || property.propertyType}`,
        `Estado: ${statusLabels[property.status]?.label || property.status}`,
        `Área Total: ${property.totalArea} m²`,
        property.builtArea ? `Área Construida: ${property.builtArea} m²` : null,
        `Recámaras: ${property.bedrooms}`,
        `Baños: ${property.bathrooms}`,
        `Estacionamientos: ${property.parkingSpaces}`,
        property.floorNumber ? `Piso: ${property.floorNumber}` : null,
      ].filter(Boolean)

      infoLines.forEach(line => {
        doc.text(line, 14, y)
        y += 6
      })

      y += 5

      // Location Section
      doc.setFontSize(14)
      doc.setTextColor(40, 40, 40)
      doc.text('Ubicación', 14, y)
      y += 8

      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      
      const locationLines = [
        `Dirección: ${property.address}`,
        `Distrito: ${property.district}`,
        `Provincia: ${property.province}`,
        property.neighborhood ? `Barrio: ${property.neighborhood}` : null,
        property.buildingName ? `Edificio: ${property.buildingName}` : null,
      ].filter(Boolean)

      locationLines.forEach(line => {
        doc.text(line, 14, y)
        y += 6
      })

      y += 5

      // Legal Info Section
      doc.setFontSize(14)
      doc.setTextColor(40, 40, 40)
      doc.text('Información Legal', 14, y)
      y += 8

      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      
      const legalLines = [
        `Finca N°: ${property.fincaNumber}`,
        property.tomoNumber ? `Tomo: ${property.tomoNumber}` : null,
        property.folioNumber ? `Folio: ${property.folioNumber}` : null,
        property.asientoNumber ? `Asiento: ${property.asientoNumber}` : null,
      ].filter(Boolean)

      legalLines.forEach(line => {
        doc.text(line, 14, y)
        y += 6
      })

      y += 5

      // Financial Info Section
      doc.setFontSize(14)
      doc.setTextColor(40, 40, 40)
      doc.text('Información Financiera', 14, y)
      y += 8

      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      
      const financialLines = [
        `Alquiler Mensual: ${formatCurrency(property.monthlyRent)}`,
        `ITBMS: ${property.itbmsRate}%`,
        `Alquiler + ITBMS: ${formatCurrency(property.monthlyRent * (1 + property.itbmsRate / 100))}`,
        `Depósito: ${formatCurrency(property.depositAmount)}`,
      ]

      financialLines.forEach(line => {
        doc.text(line, 14, y)
        y += 6
      })

      y += 5

      // Owner/Tenant Info
      if (property.owner || property.tenant) {
        // Check if we need a new page
        if (y > 220) {
          doc.addPage()
          y = 20
        }

        if (property.owner) {
          doc.setFontSize(14)
          doc.setTextColor(40, 40, 40)
          doc.text('Propietario', 14, y)
          y += 8

          doc.setFontSize(10)
          doc.setTextColor(60, 60, 60)
          doc.text(`Nombre: ${property.owner.name}`, 14, y)
          y += 6
          doc.text(`Email: ${property.owner.email}`, 14, y)
          y += 6
          if (property.owner.phone) {
            doc.text(`Teléfono: ${property.owner.phone}`, 14, y)
            y += 6
          }
          y += 5
        }

        if (property.tenant) {
          doc.setFontSize(14)
          doc.setTextColor(40, 40, 40)
          doc.text('Inquilino', 14, y)
          y += 8

          doc.setFontSize(10)
          doc.setTextColor(60, 60, 60)
          doc.text(`Nombre: ${property.tenant.name}`, 14, y)
          y += 6
          doc.text(`Email: ${property.tenant.email}`, 14, y)
          y += 6
          if (property.tenant.phone) {
            doc.text(`Teléfono: ${property.tenant.phone}`, 14, y)
            y += 6
          }
        }
      }

      // Description
      if (property.description && y < 240) {
        y += 5
        doc.setFontSize(14)
        doc.setTextColor(40, 40, 40)
        doc.text('Descripción', 14, y)
        y += 8

        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)
        const splitDescription = doc.splitTextToSize(property.description, pageWidth - 28)
        doc.text(splitDescription, 14, y)
      }

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `InmoGest Pro - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      // Download
      const fileName = `propiedad_${property.title.toLowerCase().replace(/\s+/g, '_')}.pdf`
      doc.save(fileName)

      toast({
        title: 'PDF descargado',
        description: 'El documento ha sido generado exitosamente.',
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!property) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{property.title}</DialogTitle>
          <DialogDescription>
            {propertyTypes[property.propertyType] || property.propertyType} • {property.address}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Gallery */}
          {imageUrls.length > 0 && (
            <div className="relative">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={imageUrls[currentImageIndex]}
                  alt={`${property.title} - Foto ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {imageUrls.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {imageUrls.map((_, index) => (
                      <button
                        key={index}
                        className={`h-2 w-2 rounded-full transition-all ${
                          index === currentImageIndex 
                            ? 'bg-white w-4' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Thumbnail strip */}
              {imageUrls.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                  {imageUrls.map((url, index) => (
                    <button
                      key={index}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-primary' 
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img
                        src={url}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status and Actions */}
          <div className="flex items-center justify-between">
            <Badge className={statusLabels[property.status]?.color}>
              {statusLabels[property.status]?.label || property.status}
            </Badge>
            <Button variant="outline" onClick={generatePropertyPDF} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar PDF
            </Button>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ruler className="h-4 w-4" />
                  <span className="text-sm">Área Total</span>
                </div>
                <p className="text-xl font-bold mt-1">{property.totalArea} m²</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bed className="h-4 w-4" />
                  <span className="text-sm">Recámaras</span>
                </div>
                <p className="text-xl font-bold mt-1">{property.bedrooms}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bath className="h-4 w-4" />
                  <span className="text-sm">Baños</span>
                </div>
                <p className="text-xl font-bold mt-1">{property.bathrooms}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span className="text-sm">Estacionamientos</span>
                </div>
                <p className="text-xl font-bold mt-1">{property.parkingSpaces}</p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Info */}
          <Card className="bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Alquiler Mensual</span>
              </div>
              <div className="mt-1">
                <p className="text-2xl font-bold">{formatCurrency(property.monthlyRent)}</p>
                <p className="text-sm text-muted-foreground">
                  + ITBMS ({property.itbmsRate}%): {formatCurrency(property.monthlyRent * (1 + property.itbmsRate / 100))}/mes
                </p>
              </div>
              {property.depositAmount > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Depósito: {formatCurrency(property.depositAmount)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ubicación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Dirección</p>
                <p>{property.address}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Provincia</p>
                <p>{property.province}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Distrito</p>
                <p>{property.district}</p>
              </div>
              {property.neighborhood && (
                <div>
                  <p className="text-muted-foreground">Barrio</p>
                  <p>{property.neighborhood}</p>
                </div>
              )}
              {property.buildingName && (
                <div>
                  <p className="text-muted-foreground">Edificio</p>
                  <p>{property.buildingName}</p>
                </div>
              )}
              {property.floorNumber && (
                <div>
                  <p className="text-muted-foreground">Piso</p>
                  <p>{property.floorNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Legal Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Información Legal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Finca N°</p>
                <p>{property.fincaNumber}</p>
              </div>
              {property.tomoNumber && (
                <div>
                  <p className="text-muted-foreground">Tomo</p>
                  <p>{property.tomoNumber}</p>
                </div>
              )}
              {property.folioNumber && (
                <div>
                  <p className="text-muted-foreground">Folio</p>
                  <p>{property.folioNumber}</p>
                </div>
              )}
              {property.asientoNumber && (
                <div>
                  <p className="text-muted-foreground">Asiento</p>
                  <p>{property.asientoNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Owner and Tenant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {property.owner && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Propietario
                </h3>
                <div className="text-sm space-y-2">
                  <p className="font-medium">{property.owner.name}</p>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {property.owner.email}
                  </p>
                  {property.owner.phone && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {property.owner.phone}
                    </p>
                  )}
                </div>
              </div>
            )}
            {property.tenant && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Inquilino
                </h3>
                <div className="text-sm space-y-2">
                  <p className="font-medium">{property.tenant.name}</p>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {property.tenant.email}
                  </p>
                  {property.tenant.phone && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {property.tenant.phone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Home className="h-4 w-4" />
                Descripción
              </h3>
              <p className="text-sm text-muted-foreground">{property.description}</p>
            </div>
          )}

          {/* Comments */}
          {property.comments && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentarios
              </h3>
              <p className="text-sm text-muted-foreground">{property.comments}</p>
            </div>
          )}

          {/* Sale/Rent Interest */}
          {(property.forSale || property.forRent !== false) && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Disponibilidad
              </h3>
              <div className="flex flex-wrap gap-2">
                {property.forRent !== false && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    Disponible para Alquiler
                  </Badge>
                )}
                {property.forSale && (
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                    Disponible para Venta
                  </Badge>
                )}
              </div>
              
              {property.forSale && property.salePrice && (
                <Card className="bg-purple-500/5 mt-3">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Precio de Venta</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(property.salePrice)}</p>
                    {property.saleDescription && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {property.saleDescription}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
