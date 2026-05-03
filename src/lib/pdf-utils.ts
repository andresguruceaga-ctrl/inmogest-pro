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
  tenant?: { id: string; name: string } | null
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
      checkNewPage(40)
      
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
      } else {
        doc.text(`Nombre: No registrado`, margin + 5, yPosition)
        yPosition += 6
      }
      yPosition += 8

      // ========== DATOS DEL INQUILINO ==========
      checkNewPage(40)
      
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
        doc.text(`Fecha de Inicio: ${formatDate(property.contract.startDate)}`, margin + 5, yPosition)
        yPosition += 6
        doc.text(`Fecha de Fin: ${formatDate(property.contract.endDate)}`, margin + 5, yPosition)
        yPosition += 6
        doc.text(`Alquiler Mensual: ${formatCurrency(property.contract.monthlyAmount || 0)}`, margin + 5, yPosition)
        yPosition += 6
        doc.text(`Deposito: ${formatCurrency(property.contract.deposit || 0)}`, margin + 5, yPosition)
        yPosition += 6
        doc.text(`Estado: ${property.contract.status || 'N/A'}`, margin + 5, yPosition)
        yPosition += 8
      } else {
        doc.text(`Sin contrato vigente`, margin + 5, yPosition)
        yPosition += 8
      }
      yPosition += 8
    })
  }

  // ==================== GRAFICO EVOLUCION MENSUAL ====================
  if (data.monthlyData && data.monthlyData.length > 0) {
    checkNewPage(90)
    
    doc.setFillColor(30, 58, 95)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('EVOLUCION MENSUAL - GRAFICO', margin + 3, yPosition + 6)
    yPosition += 15

    // Draw bar chart
    const chartHeight = 65
    const chartWidth = pageWidth - 2 * margin
    const barGap = 3
    const totalBarSpace = chartWidth - 20
    const barWidth = totalBarSpace / 24 // 12 months * 2 bars each
    const maxValue = Math.max(
      ...data.monthlyData.map(d => Math.max(d.grossIncome || 0, d.totalExpenses || 0)),
      1
    )

    // Y axis line
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(margin + 5, yPosition, margin + 5, yPosition + chartHeight)
    
    // X axis line
    doc.line(margin + 5, yPosition + chartHeight, margin + chartWidth - 5, yPosition + chartHeight)

    // Bars
    data.monthlyData.forEach((month, index) => {
      const x = margin + 10 + index * (barWidth * 2 + barGap)
      
      const incomeHeight = Math.max(((month.grossIncome || 0) / maxValue) * (chartHeight - 15), 0)
      const expenseHeight = Math.max(((month.totalExpenses || 0) / maxValue) * (chartHeight - 15), 0)

      // Income bar (green)
      if (incomeHeight > 0) {
        doc.setFillColor(52, 211, 153)
        doc.rect(x, yPosition + chartHeight - incomeHeight - 5, barWidth, incomeHeight, 'F')
      }

      // Expense bar (red)
      if (expenseHeight > 0) {
        doc.setFillColor(248, 113, 113)
        doc.rect(x + barWidth + 1, yPosition + chartHeight - expenseHeight - 5, barWidth, expenseHeight, 'F')
      }

      // Month label
      doc.setFontSize(6)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      const monthShort = safeText(month.monthName).substring(0, 3)
      doc.text(monthShort, x + barWidth, yPosition + chartHeight + 5, { align: 'center' })
    })

    // Legend
    yPosition += chartHeight + 15
    doc.setFontSize(8)
    doc.setFillColor(52, 211, 153)
    doc.rect(margin + 30, yPosition - 3, 10, 5, 'F')
    doc.setTextColor(60, 60, 60)
    doc.text('Ingresos', margin + 45, yPosition)

    doc.setFillColor(248, 113, 113)
    doc.rect(margin + 90, yPosition - 3, 10, 5, 'F')
    doc.text('Gastos', margin + 105, yPosition)
    yPosition += 12
  }

  // ==================== DETALLE DE PAGOS ====================
  if (data.properties && data.properties.length > 0) {
    const allPayments: Array<{ amount: number; date: string; tenant?: string; propertyTitle: string }> = []
    
    data.properties.forEach(prop => {
      if (prop.paymentsDetails && prop.paymentsDetails.length > 0) {
        prop.paymentsDetails.forEach(payment => {
          allPayments.push({
            ...payment,
            propertyTitle: prop.propertyTitle
          })
        })
      }
    })

    if (allPayments.length > 0) {
      checkNewPage(45)
      
      doc.setFillColor(34, 197, 94)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLE DE PAGOS DE INQUILINOS', margin + 3, yPosition + 6)
      yPosition += 14

      // Table header
      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      
      doc.text('Fecha', margin + 3, yPosition + 5)
      doc.text('Propiedad', margin + 30, yPosition + 5)
      doc.text('Inquilino', margin + 90, yPosition + 5)
      doc.text('Monto', pageWidth - margin - 30, yPosition + 5)
      yPosition += 8

      let totalPayments = 0
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      
      allPayments.forEach((payment) => {
        checkNewPage(6)
        doc.setTextColor(60, 60, 60)
        
        const dateStr = payment.date ? new Date(payment.date).toLocaleDateString('es-PA') : 'N/A'
        doc.text(dateStr, margin + 3, yPosition + 4)
        doc.text(safeText(payment.propertyTitle).substring(0, 25), margin + 30, yPosition + 4)
        doc.text(safeText(payment.tenant || 'N/A').substring(0, 20), margin + 90, yPosition + 4)
        doc.text(formatCurrency(payment.amount), pageWidth - margin - 30, yPosition + 4)
        
        totalPayments += payment.amount || 0
        yPosition += 6
      })

      // Total
      checkNewPage(10)
      doc.setDrawColor(180, 180, 180)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 5
      
      doc.setFont('helvetica', 'bold')
      doc.text('Total Pagos:', margin + 90, yPosition + 4)
      doc.setTextColor(34, 197, 94)
      doc.text(formatCurrency(totalPayments), pageWidth - margin - 30, yPosition + 4)
      yPosition += 12
    }
  }

  // ==================== DETALLE DE GASTOS ====================
  if (data.properties && data.properties.length > 0) {
    const allFixed: Array<{ description: string; amount: number; date: string; category: string; propertyTitle: string }> = []
    const allVariable: Array<{ description: string; amount: number; date: string; category: string; propertyTitle: string }> = []
    
    data.properties.forEach(prop => {
      if (prop.expensesDetails) {
        if (prop.expensesDetails.fixed) {
          prop.expensesDetails.fixed.forEach(e => {
            allFixed.push({ ...e, propertyTitle: prop.propertyTitle })
          })
        }
        if (prop.expensesDetails.variable) {
          prop.expensesDetails.variable.forEach(e => {
            allVariable.push({ ...e, propertyTitle: prop.propertyTitle })
          })
        }
      }
    })

    // Fixed Expenses
    if (allFixed.length > 0) {
      checkNewPage(45)
      
      doc.setFillColor(249, 115, 22)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('GASTOS FIJOS MENSUALES', margin + 3, yPosition + 6)
      yPosition += 14

      // Table header
      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      
      doc.text('Descripcion', margin + 3, yPosition + 5)
      doc.text('Propiedad', margin + 70, yPosition + 5)
      doc.text('Categoria', margin + 120, yPosition + 5)
      doc.text('Monto', pageWidth - margin - 25, yPosition + 5)
      yPosition += 8

      let totalFixed = 0
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      
      allFixed.forEach((expense) => {
        checkNewPage(6)
        doc.setTextColor(60, 60, 60)
        
        doc.text(safeText(expense.description).substring(0, 30), margin + 3, yPosition + 4)
        doc.text(safeText(expense.propertyTitle).substring(0, 20), margin + 70, yPosition + 4)
        doc.text(categoryLabels[expense.category] || expense.category || 'N/A', margin + 120, yPosition + 4)
        doc.text(formatCurrency(expense.amount), pageWidth - margin - 25, yPosition + 4)
        
        totalFixed += expense.amount || 0
        yPosition += 6
      })

      // Total
      checkNewPage(10)
      doc.setDrawColor(180, 180, 180)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 5
      
      doc.setFont('helvetica', 'bold')
      doc.text('Total Gastos Fijos:', margin + 80, yPosition + 4)
      doc.setTextColor(249, 115, 22)
      doc.text(formatCurrency(totalFixed), pageWidth - margin - 25, yPosition + 4)
      yPosition += 12
    }

    // Variable Expenses
    if (allVariable.length > 0) {
      checkNewPage(45)
      
      doc.setFillColor(239, 68, 68)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('GASTOS VARIABLES MENSUALES', margin + 3, yPosition + 6)
      yPosition += 14

      // Table header
      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      
      doc.text('Descripcion', margin + 3, yPosition + 5)
      doc.text('Propiedad', margin + 70, yPosition + 5)
      doc.text('Categoria', margin + 120, yPosition + 5)
      doc.text('Monto', pageWidth - margin - 25, yPosition + 5)
      yPosition += 8

      let totalVariable = 0
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      
      allVariable.forEach((expense) => {
        checkNewPage(6)
        doc.setTextColor(60, 60, 60)
        
        doc.text(safeText(expense.description).substring(0, 30), margin + 3, yPosition + 4)
        doc.text(safeText(expense.propertyTitle).substring(0, 20), margin + 70, yPosition + 4)
        doc.text(categoryLabels[expense.category] || expense.category || 'N/A', margin + 120, yPosition + 4)
        doc.text(formatCurrency(expense.amount), pageWidth - margin - 25, yPosition + 4)
        
        totalVariable += expense.amount || 0
        yPosition += 6
      })

      // Total
      checkNewPage(10)
      doc.setDrawColor(180, 180, 180)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 5
      
      doc.setFont('helvetica', 'bold')
      doc.text('Total Gastos Variables:', margin + 80, yPosition + 4)
      doc.setTextColor(239, 68, 68)
      doc.text(formatCurrency(totalVariable), pageWidth - margin - 25, yPosition + 4)
      yPosition += 12
    }
  }

  // ==================== TICKETS DE SOPORTE ====================
  if (data.tickets && data.tickets.length > 0) {
    checkNewPage(45)
    
    doc.setFillColor(139, 92, 246)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('TICKETS DE SOPORTE', margin + 3, yPosition + 6)
    yPosition += 14

    // Table header
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    
    doc.text('Titulo', margin + 3, yPosition + 5)
    doc.text('Propiedad', margin + 55, yPosition + 5)
    doc.text('Estado', margin + 110, yPosition + 5)
    doc.text('Prioridad', margin + 135, yPosition + 5)
    doc.text('Fecha', pageWidth - margin - 25, yPosition + 5)
    yPosition += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    
    data.tickets.forEach((ticket) => {
      checkNewPage(8)
      doc.setTextColor(60, 60, 60)
      
      doc.text(safeText(ticket.title).substring(0, 22), margin + 3, yPosition + 4)
      doc.text(safeText(ticket.property?.title).substring(0, 20), margin + 55, yPosition + 4)
      doc.text(ticket.status || 'N/A', margin + 110, yPosition + 4)
      doc.text(ticket.priority || 'N/A', margin + 135, yPosition + 4)
      doc.text(formatDate(ticket.createdAt), pageWidth - margin - 25, yPosition + 4)
      yPosition += 6
    })
    yPosition += 8
  }

  // ==================== BALANCE RELACION DE GASTOS ====================
  checkNewPage(55)
  
  doc.setFillColor(30, 58, 95)
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('BALANCE - RELACION DE GASTOS', margin + 3, yPosition + 6)
  yPosition += 14

  const totalGastos = (data.totals?.fixedExpenses || 0) + (data.totals?.variableExpenses || 0)
  const totalPagos = data.totals?.grossIncome || 0
  const balance = totalPagos - totalGastos

  // Balance box
  doc.setFillColor(249, 250, 251)
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 35, 'F')
  yPosition += 8

  doc.setFontSize(9)
  
  // Gastos row
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'normal')
  doc.text('Gastos Totales:', margin + 10, yPosition)
  doc.setTextColor(239, 68, 68)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(totalGastos), margin + 100, yPosition)
  yPosition += 10

  // Pagos row
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'normal')
  doc.text('Pagos Recibidos:', margin + 10, yPosition)
  doc.setTextColor(34, 197, 94)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(totalPagos), margin + 100, yPosition)
  yPosition += 10

  // Separator line
  doc.setDrawColor(180, 180, 180)
  doc.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition)
  yPosition += 5

  // Balance row
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'normal')
  doc.text('Balance:', margin + 10, yPosition)
  
  if (balance >= 0) {
    doc.setTextColor(34, 197, 94)
  } else {
    doc.setTextColor(239, 68, 68)
  }
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(balance), margin + 100, yPosition)
  
  yPosition += 5
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  if (balance >= 0) {
    doc.text('(Saldo a favor de la administracion)', margin + 120, yPosition)
  } else {
    doc.text('(Saldo pendiente de cobro)', margin + 120, yPosition)
  }

  yPosition += 15

  // ==================== FOOTER ====================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Pagina ${i} de ${totalPages} - Inmogest Pro - Reporte Financiero`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  return doc
}

// Contract PDF function
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
