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
  owner?: { id: string; name: string }
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

interface ReportPDFParams {
  title: string
  period: string
  adminSummary?: string
  data: {
    totals: ReportTotals
    properties: ReportPropertyData[]
    monthlyData?: MonthlyData[]
    tickets?: TicketData[]
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

  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('es-PA')
    } catch {
      return 'N/A'
    }
  }

  const safeText = (text: string | undefined | null): string => {
    if (!text) return ''
    // Remove special characters that might cause issues
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

  try {
    // Header
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
    yPosition += 12

    // Admin Summary
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
      yPosition += 8
    }

    // Summary Cards
    checkNewPage(45)
    
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 40, 'F')
    
    yPosition += 8
    doc.setTextColor(30, 58, 95)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen General', margin + 5, yPosition)
    yPosition += 10

    // Summary grid
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
      const y = yPosition + row * 14

      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text(item.label, x, y)
      
      doc.setFontSize(10)
      doc.setTextColor(item.color[0], item.color[1], item.color[2])
      doc.setFont('helvetica', 'bold')
      doc.text(item.value, x, y + 6)
    })

    yPosition += 35

    // ITBMS Summary
    checkNewPage(25)
    
    doc.setTextColor(30, 58, 95)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen ITBMS', margin, yPosition)
    yPosition += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const itbmsCollected = data.totals?.itbmsCollected || 0
    const itbmsPaid = data.totals?.itbmsPaid || 0
    doc.text(`ITBMS Recaudado: ${formatCurrency(itbmsCollected)}`, margin + 5, yPosition)
    doc.text(`ITBMS Pagado: ${formatCurrency(itbmsPaid)}`, margin + 70, yPosition)
    doc.text(`Balance: ${formatCurrency(itbmsCollected - itbmsPaid)}`, margin + 130, yPosition)
    yPosition += 12

    // Properties Detail
    if (data.properties && data.properties.length > 0) {
      data.properties.forEach((property, propIndex) => {
        checkNewPage(60)

        // Property header
        doc.setFillColor(59, 130, 246)
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`${propIndex + 1}. ${safeText(property.propertyTitle)}`, margin + 3, yPosition + 6)
        yPosition += 12

        // Property info
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`Direccion: ${safeText(property.address)} | Provincia: ${safeText(property.province)}`, margin + 5, yPosition)
        if (property.owner) {
          doc.text(`Propietario: ${safeText(property.owner.name)}`, margin + 5, yPosition + 5)
        }
        yPosition += 12

        // Financial summary
        const propSummary = [
          { label: 'Ingresos', value: formatCurrency(property.grossIncome || 0), color: [34, 197, 94] },
          { label: 'Gastos Fijos', value: formatCurrency(property.fixedExpenses || 0), color: [249, 115, 22] },
          { label: 'Gastos Variables', value: formatCurrency(property.variableExpenses || 0), color: [239, 68, 68] },
          { label: 'Neto', value: formatCurrency(property.netIncome || 0), color: [59, 130, 246] },
        ]

        const propColWidth = (pageWidth - 2 * margin - 20) / 4
        propSummary.forEach((item, index) => {
          const x = margin + 5 + index * (propColWidth + 5)
          
          doc.setFillColor(249, 250, 251)
          doc.rect(x, yPosition, propColWidth, 15, 'F')
          
          doc.setFontSize(7)
          doc.setTextColor(100, 100, 100)
          doc.setFont('helvetica', 'normal')
          doc.text(item.label, x + 2, yPosition + 5)
          
          doc.setFontSize(9)
          doc.setTextColor(item.color[0], item.color[1], item.color[2])
          doc.setFont('helvetica', 'bold')
          doc.text(item.value, x + 2, yPosition + 11)
        })
        yPosition += 20

        // Expenses details
        if (property.expensesDetails) {
          // Fixed expenses
          if (property.expensesDetails.fixed && property.expensesDetails.fixed.length > 0) {
            checkNewPage(20)
            
            doc.setTextColor(249, 115, 22)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.text(`Gastos Fijos (${property.expensesDetails.fixed.length})`, margin + 5, yPosition)
            yPosition += 6

            property.expensesDetails.fixed.forEach((expense) => {
              checkNewPage(6)
              doc.setFontSize(7)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(80, 80, 80)
              const category = categoryLabels[expense.category] || expense.category || 'N/A'
              doc.text(`- ${safeText(expense.description)} - ${formatCurrency(expense.amount)} (${category})`, margin + 8, yPosition)
              yPosition += 5
            })
            yPosition += 4
          }

          // Variable expenses
          if (property.expensesDetails.variable && property.expensesDetails.variable.length > 0) {
            checkNewPage(20)
            
            doc.setTextColor(239, 68, 68)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.text(`Gastos Variables (${property.expensesDetails.variable.length})`, margin + 5, yPosition)
            yPosition += 6

            property.expensesDetails.variable.forEach((expense) => {
              checkNewPage(6)
              doc.setFontSize(7)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(80, 80, 80)
              const category = categoryLabels[expense.category] || expense.category || 'N/A'
              doc.text(`- ${safeText(expense.description)} - ${formatCurrency(expense.amount)} (${category})`, margin + 8, yPosition)
              yPosition += 5
            })
            yPosition += 6
          }
        }

        yPosition += 6
      })
    }

    // Monthly Data (for yearly reports)
    if (data.monthlyData && data.monthlyData.length > 0) {
      checkNewPage(50)
      
      doc.setFillColor(168, 85, 247)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Evolucion Mensual', margin + 3, yPosition + 6)
      yPosition += 14

      // Table header
      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      
      const tableCols = ['Mes', 'Ingresos', 'Gastos Fijos', 'Gastos Variables', 'Neto']
      const colWidths = [30, 35, 35, 35, 35]
      let xPos = margin + 3
      tableCols.forEach((col, i) => {
        doc.text(col, xPos, yPosition + 5)
        xPos += colWidths[i]
      })
      yPosition += 8

      // Table rows
      doc.setFont('helvetica', 'normal')
      data.monthlyData.forEach((month) => {
        checkNewPage(6)
        
        doc.setFontSize(7)
        doc.setTextColor(60, 60, 60)
        
        xPos = margin + 3
        doc.text(safeText(month.monthName), xPos, yPosition + 4)
        xPos += colWidths[0]
        doc.text(formatCurrency(month.grossIncome), xPos, yPosition + 4)
        xPos += colWidths[1]
        doc.text(formatCurrency(month.fixedExpenses), xPos, yPosition + 4)
        xPos += colWidths[2]
        doc.text(formatCurrency(month.variableExpenses), xPos, yPosition + 4)
        xPos += colWidths[3]
        const netIncome = month.netIncome || 0
        doc.setTextColor(netIncome >= 0 ? 34 : 239, netIncome >= 0 ? 197 : 68, netIncome >= 0 ? 94 : 68)
        doc.text(formatCurrency(netIncome), xPos, yPosition + 4)
        
        yPosition += 6
      })
      yPosition += 8
    }

    // Tickets
    if (data.tickets && data.tickets.length > 0) {
      checkNewPage(30)
      
      doc.setFillColor(139, 92, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Tickets de Soporte (${data.tickets.length})`, margin + 3, yPosition + 6)
      yPosition += 12

      data.tickets.forEach((ticket) => {
        checkNewPage(15)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(60, 60, 60)
        doc.text(`- ${safeText(ticket.title)}`, margin + 5, yPosition)
        yPosition += 5
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100)
        doc.text(`Propiedad: ${safeText(ticket.property?.title)} | Estado: ${ticket.status || 'N/A'} | Prioridad: ${ticket.priority || 'N/A'}`, margin + 5, yPosition)
        yPosition += 4
        const desc = safeText(ticket.description || '').substring(0, 80)
        if (desc) {
          doc.text(desc, margin + 5, yPosition)
        }
        yPosition += 7
      })
    }

    // Footer
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Pagina ${i} de ${totalPages} - Inmogest Pro`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    return doc
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

// Keep the contract PDF function
export async function generateContractPDF(data: {
  contract: {
    id: string
    startDate: string
    endDate: string
    monthlyRent: number
    deposit: number
    status: string
    property: {
      name: string
      address: string
    }
    tenant: {
      name: string
      email: string
      phone?: string
      dni?: string
    }
    owner?: {
      name: string
      email: string
      phone?: string
    }
  }
}): Promise<Buffer> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  const safeText = (text: string | undefined | null): string => {
    if (!text) return ''
    return text.replace(/[^\x00-\xFF]/g, '').substring(0, 200)
  }

  // Header
  doc.setFontSize(20)
  doc.text('CONTRATO DE ARRENDAMIENTO', pageWidth / 2, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-PA')}`, pageWidth / 2, 30, { align: 'center' })
  
  // Property Info
  doc.setFontSize(12)
  doc.text('INFORMACION DE LA PROPIEDAD', 14, 45)
  doc.setFontSize(10)
  doc.text(`Propiedad: ${safeText(data.contract.property.name)}`, 14, 55)
  doc.text(`Direccion: ${safeText(data.contract.property.address)}`, 14, 62)
  
  // Tenant Info
  doc.setFontSize(12)
  doc.text('INFORMACION DEL INQUILINO', 14, 77)
  doc.setFontSize(10)
  doc.text(`Nombre: ${safeText(data.contract.tenant.name)}`, 14, 87)
  doc.text(`Email: ${safeText(data.contract.tenant.email)}`, 14, 94)
  if (data.contract.tenant.phone) {
    doc.text(`Telefono: ${safeText(data.contract.tenant.phone)}`, 14, 101)
  }
  if (data.contract.tenant.dni) {
    doc.text(`DNI: ${safeText(data.contract.tenant.dni)}`, 14, 108)
  }
  
  // Contract Details
  doc.setFontSize(12)
  doc.text('DETALLES DEL CONTRATO', 14, 123)
  doc.setFontSize(10)
  doc.text(`Fecha de Inicio: ${new Date(data.contract.startDate).toLocaleDateString('es-PA')}`, 14, 133)
  doc.text(`Fecha de Fin: ${new Date(data.contract.endDate).toLocaleDateString('es-PA')}`, 14, 140)
  doc.text(`Alquiler Mensual: $${(data.contract.monthlyRent || 0).toFixed(2)}`, 14, 147)
  doc.text(`Deposito: $${(data.contract.deposit || 0).toFixed(2)}`, 14, 154)
  doc.text(`Estado: ${data.contract.status || 'N/A'}`, 14, 161)
  
  // Owner Info
  if (data.contract.owner) {
    doc.setFontSize(12)
    doc.text('INFORMACION DEL PROPIETARIO', 14, 176)
    doc.setFontSize(10)
    doc.text(`Nombre: ${safeText(data.contract.owner.name)}`, 14, 186)
    doc.text(`Email: ${safeText(data.contract.owner.email)}`, 14, 193)
    if (data.contract.owner.phone) {
      doc.text(`Telefono: ${safeText(data.contract.owner.phone)}`, 14, 200)
    }
  }
  
  return Buffer.from(doc.output('arraybuffer'))
}
