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
  if (loadedImages[0]) {
    addImageContained(doc, loadedImages[0], margin, 22, 164, 132)
  } else {
    doc.setFillColor(243, 246, 248)
    doc.roundedRect(margin, 22, 164, 132, 3, 3, 'F')
    doc.setTextColor(120, 130, 138)
    doc.setFontSize(13)
    doc.text('Propiedad sin fotografías', margin + 82, 90, { align: 'center' })
  }

  const infoX = 190
  let y = 28
  doc.setTextColor(22, 42, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(23)
  const titleLines = doc.splitTextToSize(property.title, pageWidth - infoX - margin)
  doc.text(titleLines, infoX, y)
  y += titleLines.length * 9 + 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(92, 105, 112)
  const location = [property.address, property.neighborhood, property.district, property.province]
    .filter(Boolean)
    .join(', ')
  const locationLines = doc.splitTextToSize(location, pageWidth - infoX - margin)
  doc.text(locationLines, infoX, y)
  y += locationLines.length * 5 + 8

  doc.setTextColor(14, 116, 144)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  if (property.forSale && property.salePrice) {
    doc.text(`${formatCurrency(property.salePrice)} · Venta`, infoX, y)
    y += 10
  }
  if (property.forRent !== false) {
    doc.text(`${formatCurrency(property.monthlyRent)} · Alquiler mensual`, infoX, y)
    y += 10
  }

  y += 4
  doc.setFillColor(243, 248, 249)
  doc.roundedRect(infoX, y, pageWidth - infoX - margin, 30, 3, 3, 'F')
  doc.setFontSize(12)
  doc.setTextColor(22, 42, 50)
  doc.text(`${property.bedrooms} recámaras`, infoX + 7, y + 12)
  doc.text(`${property.bathrooms} baños`, infoX + 49, y + 12)
  doc.text(`${property.parkingSpaces} estacionamientos`, infoX + 88, y + 12)
  doc.text(`${property.totalArea} m²`, infoX + 7, y + 23)
  if (property.builtArea) doc.text(`${property.builtArea} m² construidos`, infoX + 49, y + 23)
  y += 41

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Descripción', infoX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(72, 84, 91)
  const description = property.description || property.saleDescription || 'Sin descripción registrada.'
  const descriptionLines = doc.splitTextToSize(description, pageWidth - infoX - margin)
  doc.text(descriptionLines.slice(0, 8), infoX, y)

  doc.setFontSize(8)
  doc.setTextColor(115, 125, 130)
  doc.text(`${imageUrls.length} foto${imageUrls.length === 1 ? '' : 's'} · Generado ${new Date().toLocaleDateString('es-PA')}`, margin, pageHeight - 8)

  doc.addPage('a4', 'landscape')
  addBrand()
  doc.setTextColor(22, 42, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Ficha completa de la propiedad', margin, 27)

  const columns = [margin, 104, 194]
  const sectionWidth = 78
  const sections: Array<{ title: string; lines: string[] }> = [
    {
      title: 'Información general',
      lines: [
        `Tipo: ${PROPERTY_TYPES[property.propertyType] || property.propertyType}`,
        `Estado: ${STATUS_LABELS[property.status] || property.status}`,
        `Área total: ${property.totalArea} m²`,
        property.builtArea ? `Área construida: ${property.builtArea} m²` : '',
        `Recámaras: ${property.bedrooms}`,
        `Baños: ${property.bathrooms}`,
        `Estacionamientos: ${property.parkingSpaces}`,
        property.floorNumber != null ? `Piso: ${property.floorNumber}` : '',
      ].filter(Boolean),
    },
    {
      title: 'Ubicación',
      lines: [
        `Dirección: ${property.address}`,
        property.buildingName ? `Edificio/PH: ${property.buildingName}` : '',
        property.neighborhood ? `Sector: ${property.neighborhood}` : '',
        property.corregimiento ? `Corregimiento: ${property.corregimiento}` : '',
        `Distrito: ${property.district}`,
        `Provincia: ${property.province}`,
      ].filter(Boolean),
    },
    {
      title: 'Precio y disponibilidad',
      lines: [
        property.forSale ? `Venta: ${formatCurrency(property.salePrice || 0)}` : '',
        property.forRent !== false ? `Alquiler mensual: ${formatCurrency(property.monthlyRent)}` : '',
        property.depositAmount ? `Depósito: ${formatCurrency(property.depositAmount)}` : '',
        property.saleDescription || '',
      ].filter(Boolean),
    },
    {
      title: 'Características',
      lines: [
        property.hasTerrace ? 'Terraza' : '',
        property.hasBalcony ? 'Balcón' : '',
        property.hasDen ? 'Den' : '',
        property.hasMaidRoomBathroom ? 'Cuarto y baño de empleada' : '',
        property.hasSocialArea ? `Área social${property.socialAreaDescription ? `: ${property.socialAreaDescription}` : ''}` : '',
      ].filter(Boolean),
    },
    {
      title: 'Información registral',
      lines: [
        `Finca: ${property.fincaNumber || 'No registrada'}`,
        property.tomoNumber ? `Tomo: ${property.tomoNumber}` : '',
        property.folioNumber ? `Folio: ${property.folioNumber}` : '',
        property.asientoNumber ? `Asiento: ${property.asientoNumber}` : '',
      ].filter(Boolean),
    },
    {
      title: 'Contacto del PH',
      lines: [
        property.phContactName || '',
        property.phContactPhone || '',
        property.phContactEmail || '',
      ].filter(Boolean),
    },
    {
      title: 'Propietario',
      lines: property.owner
        ? [property.owner.name, property.owner.email, property.owner.phone || ''].filter(Boolean)
        : ['Sin propietario asignado'],
    },
    {
      title: 'Inquilino actual',
      lines: property.tenant
        ? [property.tenant.name, property.tenant.email, property.tenant.phone || ''].filter(Boolean)
        : ['Sin inquilino asignado'],
    },
  ]

  sections.forEach((section, index) => {
    const column = index % 3
    const row = Math.floor(index / 3)
    const sectionX = columns[column]
    const sectionY = 39 + row * 52
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(14, 116, 144)
    doc.text(section.title, sectionX, sectionY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(55, 68, 75)
    let lineY = sectionY + 6
    section.lines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, sectionWidth)
      doc.text(wrapped, sectionX, lineY)
      lineY += wrapped.length * 4.3
    })
  })

  if (property.comments) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(14, 116, 144)
    doc.text('Comentarios', margin, 196)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(55, 68, 75)
    doc.text(doc.splitTextToSize(property.comments, contentWidth), margin, 202)
  }

  const narrativeSections = [
    { title: 'Descripción completa', text: property.description },
    { title: 'Información de venta', text: property.saleDescription },
    { title: 'Área social', text: property.socialAreaDescription },
    { title: 'Comentarios', text: property.comments },
  ].filter((section): section is { title: string; text: string } => Boolean(section.text))

  if (narrativeSections.length > 0) {
    doc.addPage('a4', 'landscape')
    addBrand()
    let narrativeY = 28

    narrativeSections.forEach(section => {
      const lines: string[] = doc.splitTextToSize(section.text, contentWidth)
      const requiredHeight = 12 + lines.length * 4.8

      if (narrativeY + requiredHeight > pageHeight - 14) {
        doc.addPage('a4', 'landscape')
        addBrand()
        narrativeY = 28
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(14, 116, 144)
      doc.text(section.title, margin, narrativeY)
      narrativeY += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(55, 68, 75)

      for (const line of lines) {
        if (narrativeY > pageHeight - 14) {
          doc.addPage('a4', 'landscape')
          addBrand()
          narrativeY = 28
        }
        doc.text(line, margin, narrativeY)
        narrativeY += 4.8
      }
      narrativeY += 7
    })
  }

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
