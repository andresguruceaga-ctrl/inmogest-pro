import jsPDF from 'jspdf'

export interface PropertyPDFData {
  title: string
  description?: string | null
  propertyType: string
  province: string
  district: string
  corregimiento?: string | null
  neighborhood?: string | null
  address: string
  buildingName?: string | null
  hasTerrace?: boolean
  hasBalcony?: boolean
  hasDen?: boolean
  hasSocialArea?: boolean
  socialAreaDescription?: string | null
  hasMaidRoomBathroom?: boolean
  phContactName?: string | null
  phContactPhone?: string | null
  phContactEmail?: string | null
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
  depositAmount: number
  status: string
  mainImage?: string | null
  images?: string | null
  comments?: string | null
  forSale?: boolean
  salePrice?: number | null
  saleDescription?: string | null
  forRent?: boolean
  owner?: { name: string; email: string; phone?: string | null } | null
  tenant?: { name: string; email: string; phone?: string | null } | null
}

const PROPERTY_TYPES: Record<string, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  LOCAL_COMERCIAL: 'Local comercial',
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  TERRENO: 'Terreno',
  PH: 'PH',
}

const STATUS_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADA: 'Ocupada',
  MANTENIMIENTO: 'Mantenimiento',
  INACTIVA: 'Inactiva',
}

export function getPropertyImageUrls(property: Pick<PropertyPDFData, 'mainImage' | 'images'>) {
  const urls: string[] = []
  if (property.mainImage) urls.push(property.mainImage)

  if (property.images) {
    try {
      const parsed: unknown = JSON.parse(property.images)
      if (Array.isArray(parsed)) {
        parsed.forEach(value => {
          if (typeof value === 'string' && value.trim()) urls.push(value)
        })
      }
    } catch {
      // Una lista histórica mal formada no debe impedir abrir la propiedad.
    }
  }

  return [...new Set(urls)]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0)
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar la imagen (${response.status})`)

  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })
}

function addImageContained(
  doc: jsPDF,
  imageData: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const properties = doc.getImageProperties(imageData)
  const scale = Math.min(maxWidth / properties.width, maxHeight / properties.height)
  const width = properties.width * scale
  const height = properties.height * scale
  const left = x + (maxWidth - width) / 2
  const top = y + (maxHeight - height) / 2
  const imageFormat = imageData.startsWith('data:image/png') ? 'PNG' : 'JPEG'

  doc.setFillColor(243, 246, 248)
  doc.roundedRect(x, y, maxWidth, maxHeight, 2, 2, 'F')
  doc.addImage(imageData, imageFormat, left, top, width, height, undefined, 'FAST')
}

export async function downloadPropertyPDF(property: PropertyPDFData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  const imageUrls = getPropertyImageUrls(property)
  const loadedImages: string[] = []

  for (const url of imageUrls) {
    try {
      loadedImages.push(await imageUrlToDataUrl(url))
    } catch (error) {
      console.error('No se pudo incluir una foto en el PDF:', error)
    }
  }

  const addBrand = () => {
    doc.setFillColor(14, 116, 144)
    doc.rect(0, 0, pageWidth, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(14, 116, 144)
    doc.text('INMOGEST PRO', margin, 15)
  }

  addBrand()

  const photoX = margin
  const photoY = 22
  const photoWidth = 104
  const photoHeight = 72
  if (loadedImages[0]) {
    addImageContained(doc, loadedImages[0], photoX, photoY, photoWidth, photoHeight)
  } else {
    doc.setFillColor(243, 246, 248)
    doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 3, 3, 'F')
    doc.setTextColor(120, 130, 138)
    doc.setFontSize(11)
    doc.text('Propiedad sin fotografías', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' })
  }

  const infoX = 127
  const infoWidth = pageWidth - infoX - margin
  let infoY = 27
  doc.setTextColor(22, 42, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  const titleLines = doc.splitTextToSize(property.title, infoWidth)
  doc.text(titleLines, infoX, infoY)
  infoY += titleLines.length * 7.5 + 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(92, 105, 112)
  const location = [property.address, property.neighborhood, property.corregimiento, property.district, property.province]
    .filter(Boolean)
    .join(', ')
  const locationLines = doc.splitTextToSize(location, infoWidth)
  doc.text(locationLines, infoX, infoY)
  infoY += locationLines.length * 4.2 + 5

  doc.setTextColor(14, 116, 144)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  if (property.forSale && property.salePrice) {
    doc.text(`${formatCurrency(property.salePrice)} · Venta`, infoX, infoY)
    infoY += 7
  }
  if (property.forRent !== false) {
    doc.text(`${formatCurrency(property.monthlyRent)} · Alquiler mensual`, infoX, infoY)
    infoY += 7
  }

  infoY += 3
  doc.setFillColor(243, 248, 249)
  doc.roundedRect(infoX, infoY, infoWidth, 26, 3, 3, 'F')
  doc.setFontSize(10)
  doc.setTextColor(22, 42, 50)
  doc.text(`${property.bedrooms} recámaras`, infoX + 6, infoY + 10)
  doc.text(`${property.bathrooms} baños`, infoX + 43, infoY + 10)
  doc.text(`${property.parkingSpaces} estacionamientos`, infoX + 76, infoY + 10)
  doc.text(`${property.totalArea} m² totales`, infoX + 6, infoY + 20)
  if (property.builtArea) doc.text(`${property.builtArea} m² construidos`, infoX + 43, infoY + 20)
  if (property.floorNumber != null) doc.text(`Piso ${property.floorNumber}`, infoX + 92, infoY + 20)

  const typeAndStatus = `${PROPERTY_TYPES[property.propertyType] || property.propertyType} · ${STATUS_LABELS[property.status] || property.status}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(14, 116, 144)
  doc.text(typeAndStatus, photoX, 102)

  const features = [
    property.hasTerrace ? 'Terraza' : '',
    property.hasBalcony ? 'Balcón' : '',
    property.hasDen ? 'Den' : '',
    property.hasMaidRoomBathroom ? 'CDE' : '',
    property.hasSocialArea ? 'Área social' : '',
  ].filter(Boolean)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(55, 68, 75)
  doc.text(features.length > 0 ? features.join(' · ') : 'Sin amenidades adicionales registradas', photoX, 109)
  if (property.buildingName) doc.text(`Edificio/PH: ${property.buildingName}`, photoX, 116)

  const descriptionParts = [
    property.description || '',
    property.saleDescription ? `Información de venta: ${property.saleDescription}` : '',
    property.hasSocialArea && property.socialAreaDescription ? `Área social: ${property.socialAreaDescription}` : '',
  ].filter(Boolean)
  const description = descriptionParts.join('\n\n') || 'Sin descripción registrada.'
  const descriptionY = 128
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(22, 42, 50)
  doc.text('Descripción', margin, descriptionY)

  let descriptionFontSize = 9
  let descriptionLines: string[] = []
  do {
    doc.setFontSize(descriptionFontSize)
    descriptionLines = doc.splitTextToSize(description, contentWidth)
    if (descriptionLines.length <= 16) break
    descriptionFontSize -= 0.5
  } while (descriptionFontSize >= 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(descriptionFontSize)
  doc.setTextColor(55, 68, 75)
  doc.text(descriptionLines.slice(0, 16), margin, descriptionY + 7, { lineHeightFactor: 1.15 })

  doc.setFontSize(8)
  doc.setTextColor(115, 125, 130)
  doc.text(`${imageUrls.length} foto${imageUrls.length === 1 ? '' : 's'} · Generado ${new Date().toLocaleDateString('es-PA')}`, margin, pageHeight - 8)

  loadedImages.forEach((image, index) => {
    doc.addPage('a4', 'landscape')
    addBrand()
    doc.setTextColor(22, 42, 50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(`${property.title} · Foto ${index + 1} de ${loadedImages.length}`, margin, 22)
    addImageContained(doc, image, margin, 29, contentWidth, pageHeight - 43)
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(125, 134, 140)
    doc.text(`InmoGest Pro · Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }

  const safeTitle = property.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  doc.save(`ficha-${safeTitle || 'propiedad'}.pdf`)
  return { includedPhotos: loadedImages.length, totalPhotos: imageUrls.length }
}
