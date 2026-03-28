import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportPDFData {
  title: string
  period: string
  adminSummary?: string
  data: {
    totals: {
      grossIncome: number
      fixedExpenses: number
      variableExpenses: number
      totalExpenses: number
      netIncome: number
      itbmsCollected: number
      itbmsPaid: number
      propertiesCount?: number
      avgOccupancy?: number
      avgMonthlyIncome?: number
    }
    properties: Array<{
      propertyId: string
      propertyTitle: string
      propertyType?: string
      address: string
      province?: string
      district?: string
      totalArea?: number
      bedrooms?: number
      bathrooms?: number
      parkingSpaces?: number
      grossIncome: number
      fixedExpenses: number
      variableExpenses: number
      totalExpenses: number
      netIncome: number
      owner?: { id: string; name: string; email?: string; phone?: string } | null
      tenant?: { id: string; name: string; email?: string; phone?: string } | null
      contract?: {
        id: string
        contractNumber: string
        startDate: Date | string
        endDate: Date | string
        monthlyAmount: number
        status: string
        progress?: number
      } | null
      expensesDetails?: {
        fixed: Array<{ id: string; description: string; amount: number; date: string; category: string }>
        variable: Array<{ id: string; description: string; amount: number; date: string; category: string }>
      }
      paymentsDetails?: Array<{ id: string; amount: number; date: string; type: string; tenant?: string }>
    }>
    monthlyData?: Array<{
      month: number
      monthName: string
      grossIncome: number
      fixedExpenses: number
      variableExpenses: number
      totalExpenses: number
      netIncome: number
    }>
    tickets?: Array<{
      id: string
      title: string
      description: string
      category: string | null
      status: string
      priority: string
      createdAt: string
      property: { id: string; title: string; address: string }
    }>
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

const propertyTypeLabels: Record<string, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  LOCAL_COMERCIAL: 'Local Comercial',
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  TERRENO: 'Terreno',
  PH: 'PH',
}

export function generateReportPDF(report: ReportPDFData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 20

  // Header
  doc.setFontSize(22)
  doc.setTextColor(40, 40, 40)
  doc.text('InmoGest Pro', 14, y)
  y += 10

  doc.setFontSize(16)
  doc.text(report.title, 14, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${report.period}`, 14, y)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PA')}`, 14, y + 6)
  y += 18

  // Property Details Section (for single property or multiple)
  const properties = report.data.properties
  
  if (properties.length === 1) {
    // Single property - show detailed info
    const prop = properties[0]
    
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Información de la Propiedad', 14, y)
    y += 8

    // Property details in two columns
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    
    const propDetails = [
      ['Título:', prop.propertyTitle],
      ['Tipo:', propertyTypeLabels[prop.propertyType || ''] || prop.propertyType || 'N/A'],
      ['Dirección:', prop.address],
      ['Distrito:', prop.district || 'N/A'],
      ['Provincia:', prop.province || 'N/A'],
    ]
    
    propDetails.forEach(([label, value]) => {
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(label, 14, y)
      doc.setTextColor(40, 40, 40)
      doc.text(String(value), 50, y)
      y += 5
    })
    
    // Characteristics row
    y += 3
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('Área:', 14, y)
    doc.setTextColor(40, 40, 40)
    doc.text(`${prop.totalArea || 0} m²`, 35, y)
    
    doc.setTextColor(100, 100, 100)
    doc.text('Recámaras:', 65, y)
    doc.setTextColor(40, 40, 40)
    doc.text(String(prop.bedrooms || 0), 95, y)
    
    doc.setTextColor(100, 100, 100)
    doc.text('Baños:', 110, y)
    doc.setTextColor(40, 40, 40)
    doc.text(String(prop.bathrooms || 0), 130, y)
    
    doc.setTextColor(100, 100, 100)
    doc.text('Parqueos:', 145, y)
    doc.setTextColor(40, 40, 40)
    doc.text(String(prop.parkingSpaces || 0), 170, y)
    
    y += 10
    
    // Owner information
    if (prop.owner) {
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.text('Datos del Propietario', 14, y)
      y += 6
      
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text('Nombre:', 14, y)
      doc.setTextColor(40, 40, 40)
      doc.text(prop.owner.name, 40, y)
      y += 5
      
      if (prop.owner.email) {
        doc.setTextColor(100, 100, 100)
        doc.text('Email:', 14, y)
        doc.setTextColor(40, 40, 40)
        doc.text(prop.owner.email, 40, y)
        y += 5
      }
      
      if (prop.owner.phone) {
        doc.setTextColor(100, 100, 100)
        doc.text('Teléfono:', 14, y)
        doc.setTextColor(40, 40, 40)
        doc.text(prop.owner.phone, 40, y)
        y += 5
      }
    }
    
    y += 8
    
    // Tenant information
    if (prop.tenant) {
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.text('Datos del Inquilino', 14, y)
      y += 6
      
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text('Nombre:', 14, y)
      doc.setTextColor(40, 40, 40)
      doc.text(prop.tenant.name, 40, y)
      y += 5
      
      if (prop.tenant.email) {
        doc.setTextColor(100, 100, 100)
        doc.text('Email:', 14, y)
        doc.setTextColor(40, 40, 40)
        doc.text(prop.tenant.email, 40, y)
        y += 5
      }
      
      if (prop.tenant.phone) {
        doc.setTextColor(100, 100, 100)
        doc.text('Teléfono:', 14, y)
        doc.setTextColor(40, 40, 40)
        doc.text(prop.tenant.phone, 40, y)
        y += 5
      }
    }
    
    y += 8
    
    // Contract information with progress bar
    if (prop.contract) {
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.text('Datos del Contrato', 14, y)
      y += 6
      
      const contract = prop.contract
      const startDate = new Date(contract.startDate)
      const endDate = new Date(contract.endDate)
      const today = new Date()
      
      // Calculate progress
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const elapsedDays = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      const progress = contract.progress ?? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
      
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text('Contrato N°:', 14, y)
      doc.setTextColor(40, 40, 40)
      doc.text(contract.contractNumber, 45, y)
      y += 5
      
      doc.setTextColor(100, 100, 100)
      doc.text('Inicio:', 14, y)
      doc.setTextColor(40, 40, 40)
      doc.text(startDate.toLocaleDateString('es-PA'), 45, y)
      
      doc.setTextColor(100, 100, 100)
      doc.text('Fin:', 100, y)
      doc.setTextColor(40, 40, 40)
      doc.text(endDate.toLocaleDateString('es-PA'), 115, y)
      y += 5
      
      doc.setTextColor(100, 100, 100)
      doc.text('Canon:', 14, y)
      doc.setTextColor(40, 40, 40)
      doc.text(formatCurrency(contract.monthlyAmount), 40, y)
      
      doc.setTextColor(100, 100, 100)
      doc.text('Estado:', 100, y)
      doc.setTextColor(40, 40, 40)
      doc.text(contract.status, 125, y)
      y += 8
      
      // Progress bar - centered on page
      doc.setTextColor(100, 100, 100)
      doc.text('Progreso del contrato:', 14, y)
      y += 5
      
      const barHeight = 10
      const barWidth = 120  // Reduced to fit text properly
      const barX = 14  // Left margin
      
      // Background bar
      doc.setFillColor(230, 230, 230)
      doc.roundedRect(barX, y, barWidth, barHeight, 2, 2, 'F')
      
      // Progress fill
      const progressWidth = (progress / 100) * barWidth
      if (progress > 0) {
        const progressColor = progress < 50 ? [34, 197, 94] : progress < 80 ? [249, 115, 22] : [239, 68, 68]
        doc.setFillColor(progressColor[0], progressColor[1], progressColor[2])
        doc.roundedRect(barX, y, Math.max(2, progressWidth), barHeight, 2, 2, 'F')
      }
      
      // Progress text inside the bar
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      const progressText = `${progress.toFixed(1)}%`
      const textWidth = doc.getTextWidth(progressText)
      doc.text(progressText, barX + barWidth / 2 - textWidth / 2, y + 7)
      
      // Days remaining text after the bar
      const remainingDays = Math.max(0, totalDays - elapsedDays)
      doc.setTextColor(100, 100, 100)
      doc.text(`(${remainingDays} días restantes)`, barX + barWidth + 5, y + 7)
      
      y += barHeight + 5
    }
    
    y += 10
  } else if (properties.length > 1) {
    // Multiple properties - show summary table
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Propiedades Incluidas en el Reporte', 14, y)
    y += 8

    // Properties table with owner info
    const propertiesData = properties.map(prop => [
      prop.propertyTitle,
      prop.address,
      prop.owner?.name || 'N/A',
      prop.owner?.phone || 'N/A',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Propiedad', 'Dirección', 'Propietario', 'Teléfono']],
      body: propertiesData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 55 },
        2: { cellWidth: 40 },
        3: { cellWidth: 35 },
      },
    })

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 15 || 100
  }

  // Summary Section
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text('Resumen General', 14, y)
  y += 8

  const summaryData = [
    ['Ingresos Brutos', formatCurrency(report.data.totals.grossIncome)],
    ['Gastos Fijos', formatCurrency(report.data.totals.fixedExpenses)],
    ['Gastos Variables', formatCurrency(report.data.totals.variableExpenses)],
    ['Total Gastos', formatCurrency(report.data.totals.totalExpenses)],
    ['Ingreso Neto', formatCurrency(report.data.totals.netIncome)],
    ['ITBMS Recaudado', formatCurrency(report.data.totals.itbmsCollected)],
    ['ITBMS Pagado', formatCurrency(report.data.totals.itbmsPaid)],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'right' },
    },
  })

  // Get the final Y position after the table
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 15 || 100

  // Admin Summary Section (optional)
  if (report.adminSummary && report.adminSummary.trim()) {
    // Check if we need a new page
    if (y > pageHeight - 80) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Resumen del Administrador', 14, y)
    y += 8

    // Draw a light background box for the summary
    const summaryLines = doc.splitTextToSize(report.adminSummary, pageWidth - 28)
    const boxHeight = Math.min(summaryLines.length * 5 + 10, 60)
    
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(14, y, pageWidth - 28, boxHeight, 3, 3, 'F')
    
    // Add border
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, y, pageWidth - 28, boxHeight, 3, 3, 'S')
    
    // Add text
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    
    // Truncate text if too long to fit in box
    const maxLines = Math.floor((boxHeight - 8) / 5)
    const displayLines = summaryLines.slice(0, maxLines)
    
    displayLines.forEach((line: string, index: number) => {
      doc.text(line, 17, y + 6 + index * 5)
    })
    
    if (summaryLines.length > maxLines) {
      doc.text('...', 17, y + 6 + (maxLines - 1) * 5 + 5)
    }
    
    y += boxHeight + 10
  }

  // Properties Financial Breakdown
  if (properties.length > 1) {
    // Check if we need a new page
    if (y > pageHeight - 80) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Desglose Financiero por Propiedad', 14, y)
    y += 4

    const propertiesData = properties.map(prop => [
      prop.propertyTitle,
      prop.address,
      formatCurrency(prop.grossIncome),
      formatCurrency(prop.totalExpenses),
      formatCurrency(prop.netIncome),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Propiedad', 'Dirección', 'Ingresos', 'Gastos', 'Neto']],
      body: propertiesData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
    })
  }

  // Monthly Data Section (if yearly report)
  if (report.data.monthlyData && report.data.monthlyData.length > 0) {
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 15 || 150
    
    // Check if we need a new page
    if (y > pageHeight - 120) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Evaluación Mensual', 14, y)
    y += 4

    // Draw improved bar chart with values
    const chartX = 14
    const chartWidth = pageWidth - 28
    const chartHeight = 80
    const barWidth = chartWidth / 12 - 4

    // Find max value for scaling
    const maxValue = Math.max(...report.data.monthlyData.map(d => Math.max(d.grossIncome, d.totalExpenses)))

    // Draw chart background
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(chartX, y, chartWidth, chartHeight, 2, 2, 'F')
    
    // Draw grid lines
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.3)
    for (let i = 0; i <= 4; i++) {
      const gridY = y + 10 + (chartHeight - 20) * (i / 4)
      doc.line(chartX + 5, gridY, chartX + chartWidth - 5, gridY)
    }

    // Draw bars with values
    report.data.monthlyData.forEach((data, index) => {
      const barX = chartX + 5 + index * (chartWidth / 12)
      const incomeHeight = maxValue > 0 ? (data.grossIncome / maxValue) * (chartHeight - 25) : 0
      const expenseHeight = maxValue > 0 ? (data.totalExpenses / maxValue) * (chartHeight - 25) : 0

      // Income bar (green)
      doc.setFillColor(34, 197, 94)
      doc.rect(barX, y + chartHeight - incomeHeight - 15, barWidth / 2 - 1, incomeHeight, 'F')

      // Expense bar (red)
      doc.setFillColor(239, 68, 68)
      doc.rect(barX + barWidth / 2, y + chartHeight - expenseHeight - 15, barWidth / 2 - 1, expenseHeight, 'F')
      
      // Month label
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      const monthLabel = data.monthName.slice(0, 3)
      const labelWidth = doc.getTextWidth(monthLabel)
      doc.text(monthLabel, barX + barWidth / 2 - labelWidth / 2, y + chartHeight - 3)
      
      // Show values on top of bars if they're significant
      if (data.grossIncome > 0) {
        doc.setFontSize(6)
        doc.setTextColor(34, 197, 94)
        const incomeText = formatCurrency(data.grossIncome)
        doc.text(incomeText, barX, y + chartHeight - incomeHeight - 17, { maxWidth: barWidth / 2 })
      }
    })

    // Legend
    doc.setFontSize(8)
    doc.setFillColor(34, 197, 94)
    doc.rect(chartX + 5, y + chartHeight + 5, 8, 4, 'F')
    doc.setTextColor(60, 60, 60)
    doc.text('Ingresos', chartX + 15, y + chartHeight + 8)

    doc.setFillColor(239, 68, 68)
    doc.rect(chartX + 55, y + chartHeight + 5, 8, 4, 'F')
    doc.text('Gastos', chartX + 65, y + chartHeight + 8)

    y += chartHeight + 20

    // Monthly data table with values
    const monthlyDataRows = report.data.monthlyData.map(m => [
      m.monthName.slice(0, 3),
      formatCurrency(m.grossIncome),
      formatCurrency(m.fixedExpenses),
      formatCurrency(m.variableExpenses),
      formatCurrency(m.netIncome),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Mes', 'Ingresos', 'Gastos Fijos', 'Gastos Variables', 'Neto']],
      body: monthlyDataRows,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
      },
    })
  }

  // Expense Details Section
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 15 || 200

  // Check if we need a new page for expenses
  if (y > pageHeight - 80) {
    doc.addPage()
    y = 20
  }

  // Aggregate all expenses from all properties
  const allFixedExpenses: Array<{ description: string; amount: number; date: string; category: string; property: string }> = []
  const allVariableExpenses: Array<{ description: string; amount: number; date: string; category: string; property: string }> = []

  properties.forEach(prop => {
    if (prop.expensesDetails) {
      prop.expensesDetails.fixed.forEach(e => {
        allFixedExpenses.push({ ...e, property: prop.propertyTitle })
      })
      prop.expensesDetails.variable.forEach(e => {
        allVariableExpenses.push({ ...e, property: prop.propertyTitle })
      })
    }
  })

  // Fixed Expenses Details
  if (allFixedExpenses.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Detalle de Gastos Fijos', 14, y)
    y += 4

    const fixedExpensesData = allFixedExpenses.map(e => [
      e.description,
      e.property,
      categoryLabels[e.category] || e.category,
      formatCurrency(e.amount),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Descripción', 'Propiedad', 'Categoría', 'Monto']],
      body: fixedExpensesData,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30, halign: 'right' },
      },
    })

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 10 || 100
  }

  // Variable Expenses Details
  if (allVariableExpenses.length > 0) {
    // Check if we need a new page
    if (y > pageHeight - 80) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Detalle de Gastos Variables', 14, y)
    y += 4

    const variableExpensesData = allVariableExpenses.map(e => [
      e.description,
      e.property,
      categoryLabels[e.category] || e.category,
      formatCurrency(e.amount),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Descripción', 'Propiedad', 'Categoría', 'Monto']],
      body: variableExpensesData,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30, halign: 'right' },
      },
    })

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 10 || 100
  }

  // Income Details Section
  const allPayments: Array<{ amount: number; date: string; type: string; tenant?: string; property: string }> = []
  properties.forEach(prop => {
    if (prop.paymentsDetails) {
      prop.paymentsDetails.forEach(p => {
        allPayments.push({ ...p, property: prop.propertyTitle })
      })
    }
  })

  if (allPayments.length > 0) {
    // Check if we need a new page
    if (y > pageHeight - 80) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Detalle de Ingresos', 14, y)
    y += 4

    const paymentsData = allPayments.map(p => [
      p.property,
      p.tenant || 'N/A',
      formatCurrency(p.amount),
      new Date(p.date).toLocaleDateString('es-PA'),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Propiedad', 'Inquilino', 'Monto', 'Fecha']],
      body: paymentsData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' },
      },
    })
  }

  // Tickets Section
  if (report.data.tickets && report.data.tickets.length > 0) {
    // Check if we need a new page
    if (y > pageHeight - 80) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('Tickets de Soporte', 14, y)
    y += 4

    const statusLabels: Record<string, string> = {
      ABIERTO: 'Abierto',
      EN_PROCESO: 'En Proceso',
      RESUELTO: 'Resuelto',
      CERRADO: 'Cerrado',
    }

    const priorityLabels: Record<string, string> = {
      BAJA: 'Baja',
      MEDIA: 'Media',
      ALTA: 'Alta',
      URGENTE: 'Urgente',
    }

    const ticketsData = report.data.tickets.map(t => [
      t.property.title,
      t.title,
      t.description.substring(0, 50) + (t.description.length > 50 ? '...' : ''),
      statusLabels[t.status] || t.status,
      priorityLabels[t.priority] || t.priority,
      t.createdAt,
    ])

    autoTable(doc, {
      startY: y,
      head: [['Propiedad', 'Título', 'Descripción', 'Estado', 'Prioridad', 'Fecha']],
      body: ticketsData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
      },
    })
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `InmoGest Pro - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  return doc
}

export function generateContractPDF(contract: {
  contractNumber: string
  property: { title: string; address: string; province: string }
  owner: { name: string; email: string }
  tenant: { name: string; email: string }
  startDate: Date
  endDate: Date
  monthlyRent: number
  depositAmount?: number
}): jsPDF {
  const doc = new jsPDF()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Contrato de Arrendamiento', 14, 20)
  
  doc.setFontSize(12)
  doc.text(`Contrato N°: ${contract.contractNumber}`, 14, 35)
  
  doc.setFontSize(11)
  const content = [
    '',
    `Propiedad: ${contract.property.title}`,
    `Dirección: ${contract.property.address}, ${contract.property.province}`,
    '',
    'PARTES:',
    `Arrendador: ${contract.owner.name}`,
    `Email: ${contract.owner.email}`,
    '',
    `Arrendatario: ${contract.tenant.name}`,
    `Email: ${contract.tenant.email}`,
    '',
    'TÉRMINOS DEL CONTRATO:',
    `Fecha de Inicio: ${new Date(contract.startDate).toLocaleDateString('es-PA')}`,
    `Fecha de Finalización: ${new Date(contract.endDate).toLocaleDateString('es-PA')}`,
    `Canon de Arrendamiento Mensual: ${formatCurrency(contract.monthlyRent)}`,
    contract.depositAmount ? `Depósito en Garantía: ${formatCurrency(contract.depositAmount)}` : '',
    '',
    'Este contrato está sujeto a las leyes de la República de Panamá.',
  ]
  
  let y = 45
  content.forEach(line => {
    doc.text(line, 14, y)
    y += 7
  })
  
  // Signatures
  doc.text('________________________', 40, pageHeight - 30)
  doc.text('Arrendador', 50, pageHeight - 22)
  doc.text('________________________', 140, pageHeight - 30)
  doc.text('Arrendatario', 150, pageHeight - 22)
  
  return doc
}

export function generatePaymentReceiptPDF(payment: {
  id: string
  amount: number
  itbmsAmount: number
  totalAmount: number
  paymentType: string
  paymentMethod: string
  paidAt: Date | string
  referenceNumber?: string | null
  property: { title: string; address: string }
  user: { name: string; email: string }
}): jsPDF {
  const doc = new jsPDF()
  
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Recibo de Pago', 14, 20)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Recibo N°: ${payment.id.slice(0, 8).toUpperCase()}`, 14, 30)
  doc.text(`Fecha: ${new Date(payment.paidAt).toLocaleDateString('es-PA')}`, 14, 36)
  
  doc.setFontSize(12)
  doc.setTextColor(40, 40, 40)
  
  const content = [
    '',
    'DATOS DEL PAGO:',
    `Inquilino: ${payment.user.name}`,
    `Email: ${payment.user.email}`,
    '',
    `Propiedad: ${payment.property.title}`,
    `Dirección: ${payment.property.address}`,
    '',
    'DETALLE DEL PAGO:',
    `Tipo: ${payment.paymentType}`,
    `Método: ${payment.paymentMethod}`,
    payment.referenceNumber ? `Referencia: ${payment.referenceNumber}` : '',
    '',
    `Monto Base: ${formatCurrency(payment.amount)}`,
    `ITBMS (7%): ${formatCurrency(payment.itbmsAmount)}`,
    `Total: ${formatCurrency(payment.totalAmount)}`,
  ]
  
  let y = 45
  content.forEach(line => {
    if (line) doc.text(line, 14, y)
    y += 7
  })
  
  return doc
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
