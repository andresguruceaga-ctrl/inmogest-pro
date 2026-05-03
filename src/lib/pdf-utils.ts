import jsPDF from 'jspdf'

interface ReportPropertyData {
  propertyId: string
  propertyTitle: string
  address: string
  province: string
  monthlyRent: number
  grossIncome: number
  fixedExpenses: number
  variableExpenses: number
  totalExpenses: number
  netIncome: number
  itbmsCollected: number
  itbmsPaid: number
  occupancyRate: number
  paymentsCount: number
  expensesCount: number
  owner?: { id: string; name: string; email?: string; phone?: string }
  tenant?: { id: string; name: string; email?: string; phone?: string } | null
  contract?: {
    id: string
    startDate: string
    endDate: string
    monthlyAmount: number
    deposit: number
    status: string
  } | null
  expensesDetails?: {
    fixed: Array<{ id: string; description: string; amount: number; date: string; category: string }>
    variable: Array<{ id: string; description: string; amount: number; date: string; category: string }>
  }
  paymentsDetails?: Array<{ id: string; amount: number; date: string; type: string; tenant?: string }>
}

interface ReportTotals {
  grossIncome: number
  fixedExpenses: number
  variableExpenses: number
  totalExpenses: number
  netIncome: number
  itbmsCollected: number
  itbmsPaid: number
  propertiesCount: number
  avgOccupancy?: number
  avgMonthlyIncome?: number
}

interface MonthlyData {
  month: number
  monthName: string
  grossIncome: number
  fixedExpenses: number
  variableExpenses: number
  totalExpenses: number
  netIncome: number
}

interface TicketData {
  id: string
  title: string
  description: string
  category: string | null
  status: string
  priority: string
  createdAt: string
  property: { id: string; title: string; address: string }
}

interface OwnerBalanceData {
  pendingExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    property: { id: string; title: string }
  }>
  ownerPayments: Array<{
    id: string
    amount: number
    date: string
    method: string
    reference?: string
    notes?: string
  }>
  totals: {
    pending: number
    payments: number
    balance: number
  }
}

interface ReportPDFParams {
  title: string
  period: string
  adminSummary?: string
  data: {
    totals: ReportTotals
    properties: ReportPropertyData[]
    monthlyData?: MonthlyData[]
    tickets?: TicketData[]
    ownerBalance?: OwnerBalanceData | null
  }
}

const categoryLabels: Record<string, string> = {
  MANTENIMIENTO_PH: 'Mantenimiento PH',
  SEGURO: 'Seguro',
  SERVICIOS_BASICOS: 'Servicios Básicos',
  REPARACION: 'Reparación',
  SERVICIO_TECNICO: 'Servicio Técnico',
  IMPUESTOS: 'Impuestos',
  COMISION_ADMIN: 'Comisión Admin',
  OTROS: 'Otros',
}

export function generateReportPDF(params: ReportPDFParams): jsPDF {
  const { title, period, adminSummary, data } = params
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPosition = margin

  const formatCurrency = (amount: number): string => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(safeAmount)
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('es-PA')
    } catch {
      return 'N/A'
    }
  }

  const safeText = (text: string | undefined | null): string => {
    if (!text) return ''
    return text.replace(/[^\x00-\xFF]/g, '').substring(0, 200)
  }

  const checkNewPage = (neededHeight: number): boolean => {
    if (yPosition + neededHeight > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // ==================== HEADER ====================
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, pageWidth, 35, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Inmogest Pro', margin, 18)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Reporte Financiero', margin, 28)

  yPosition = 45

  // Title and period
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(safeText(title), margin, yPosition)
  yPosition += 8

  doc.setTextColor(100, 100, 100)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${safeText(period)}`, margin, yPosition)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PA')}`, pageWidth - margin - 50, yPosition)
  yPosition += 15

  // ==================== ADMIN SUMMARY ====================
  if (adminSummary && adminSummary.trim()) {
    checkNewPage(30)
    
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
    
    doc.setTextColor(30, 58, 95)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen del Administrador', margin + 3, yPosition + 6)
    yPosition += 12

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    const lines = doc.splitTextToSize(safeText(adminSummary), pageWidth - 2 * margin)
    lines.forEach((line: string) => {
      checkNewPage(5)
      doc.text(line, margin, yPosition)
      yPosition += 5
    })
    yPosition += 10
  }

  // ==================== RESUMEN GENERAL ====================
  checkNewPage(50)
  
  doc.setFillColor(243, 244, 246)
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 45, 'F')
  
  yPosition += 8
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen General', margin + 5, yPosition)
  yPosition += 10

  const summaryItems = [
    { label: 'Ingresos Brutos', value: formatCurrency(data.totals?.grossIncome || 0), color: [34, 197, 94] },
    { label: 'Gastos Fijos', value: formatCurrency(data.totals?.fixedExpenses || 0), color: [249, 115, 22] },
    { label: 'Gastos Variables', value: formatCurrency(data.totals?.variableExpenses || 0), color: [239, 68, 68] },
    { label: 'Ingreso Neto', value: formatCurrency(data.totals?.netIncome || 0), color: [59, 130, 246] },
  ]

  const colWidth = (pageWidth - 2 * margin - 15) / 2
  summaryItems.forEach((item, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = margin + 5 + col * (colWidth + 10)
    const y = yPosition + row * 15

    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, x, y)
    
    doc.setFontSize(11)
    doc.setTextColor(item.color[0], item.color[1], item.color[2])
    doc.setFont('helvetica', 'bold')
    doc.text(item.value, x, y + 7)
  })

  yPosition += 40

  // ==================== PROPERTY DETAILS ====================
  if (data.properties && data.properties.length > 0) {
    data.properties.forEach((property, propIndex) => {
      
      // ========== DATOS DE LA PROPIEDAD ==========
      checkNewPage(55)
      
      doc.setFillColor(59, 130, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DATOS DE LA PROPIEDAD', margin + 3, yPosition + 6)
      yPosition += 14

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      doc.text(`Propiedad: ${safeText(property.propertyTitle)}`, margin + 5, yPosition)
      yPosition += 6
      doc.text(`Direccion: ${safeText(property.address)}`, margin + 5, yPosition)
      yPosition += 6
      doc.text(`Provincia: ${safeText(property.province)}`, margin + 5, yPosition)
      yPosition += 6
      doc.text(`Alquiler Mensual: ${formatCurrency(property.monthlyRent || 0)}`, margin + 5, yPosition)
      yPosition += 12

      // ========== DATOS DEL PROPIETARIO ==========
      checkNewPage(45)
      
      doc.setFillColor(34, 197, 94)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DATOS DEL PROPIETARIO', margin + 3, yPosition + 6)
      yPosition += 14

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      if (property.owner) {
        doc.text(`Nombre: ${safeText(property.owner.name)}`, margin + 5, yPosition)
        yPosition += 6
        if (property.owner.email) {
          doc.text(`Email: ${safeText(property.owner.email)}`, margin + 5, yPosition)
          yPosition += 6
        }
        if (property.owner.phone) {
          doc.text(`Telefono: ${safeText(property.owner.phone)}`, margin + 5, yPosition)
          yPosition += 6
        }
      } else {
        doc.text(`Nombre: No registrado`, margin + 5, yPosition)
        yPosition += 6
      }
      yPosition += 8

      // ========== DATOS DEL INQUILINO ==========
      checkNewPage(45)
      
      doc.setFillColor(168, 85, 247)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DATOS DEL INQUILINO', margin + 3, yPosition + 6)
      yPosition += 14

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      if (property.tenant) {
        doc.text(`Nombre: ${safeText(property.tenant.name)}`, margin + 5, yPosition)
        yPosition += 6
        if (property.tenant.email) {
          doc.text(`Email: ${safeText(property.tenant.email)}`, margin + 5, yPosition)
          yPosition += 6
        }
        if (property.tenant.phone) {
          doc.text(`Telefono: ${safeText(property.tenant.phone)}`, margin + 5, yPosition)
          yPosition += 6
        }
      } else {
        doc.text(`Sin inquilino registrado`, margin + 5, yPosition)
        yPosition += 6
      }
      yPosition += 8

      // ========== INFORMACION DEL CONTRATO DE ARRENDAMIENTO ==========
      checkNewPage(55)
      
      doc.setFillColor(234, 179, 8)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACION DEL CONTRATO DE ARRENDAMIENTO', margin + 3, yPosition + 6)
      yPosition += 14

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      if (property.contract) {
        doc.text(`Fecha de Inicio: ${formatDate
