import jsPDF from 'jspdf'
import { buildOwnerStatements } from '@/lib/owner-statement'

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
    contractNumber: string
    contractType: string
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
  dueDate?: string | null
  createdAt: string
  property: { id: string; title: string; address: string }
}

export interface OwnerBalanceData {
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
    method: string | null
    reference?: string | null
    notes?: string | null
    property?: { id: string; title: string } | null
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
  SERVICIOS_BASICOS: 'Servicios Basicos',
  REPARACION: 'Reparacion',
  SERVICIO_TECNICO: 'Servicio Tecnico',
  IMPUESTOS: 'Impuestos',
  COMISION_ADMIN: 'Comision Admin',
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
  doc.text('Periodo: ' + safeText(period), margin, yPosition)
  doc.text('Generado: ' + new Date().toLocaleDateString('es-PA'), pageWidth - margin - 50, yPosition)
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
    data.properties.forEach((property) => {
      
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
      
      doc.text('Propiedad: ' + safeText(property.propertyTitle), margin + 5, yPosition)
      yPosition += 6
      doc.text('Direccion: ' + safeText(property.address), margin + 5, yPosition)
      yPosition += 6
      doc.text('Provincia: ' + safeText(property.province), margin + 5, yPosition)
      yPosition += 6
      doc.text('Alquiler Mensual: ' + formatCurrency(property.monthlyRent || 0), margin + 5, yPosition)
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
        doc.text('Nombre: ' + safeText(property.owner.name), margin + 5, yPosition)
        yPosition += 6
        if (property.owner.email) {
          doc.text('Email: ' + safeText(property.owner.email), margin + 5, yPosition)
          yPosition += 6
        }
        if (property.owner.phone) {
          doc.text('Telefono: ' + safeText(property.owner.phone), margin + 5, yPosition)
          yPosition += 6
        }
      } else {
        doc.text('Nombre: No registrado', margin + 5, yPosition)
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
        doc.text('Nombre: ' + safeText(property.tenant.name), margin + 5, yPosition)
        yPosition += 6
        if (property.tenant.email) {
          doc.text('Email: ' + safeText(property.tenant.email), margin + 5, yPosition)
          yPosition += 6
        }
        if (property.tenant.phone) {
          doc.text('Telefono: ' + safeText(property.tenant.phone), margin + 5, yPosition)
          yPosition += 6
        }
      } else {
        doc.text('Sin inquilino registrado', margin + 5, yPosition)
        yPosition += 6
      }
      yPosition += 8

      // ========== INFORMACION DEL CONTRATO ==========
      checkNewPage(55)
      
      doc.setFillColor(234, 179, 8)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACION DEL CONTRATO', margin + 3, yPosition + 6)
      yPosition += 14

      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      if (property.contract) {
        doc.text('Numero: ' + safeText(property.contract.contractNumber || property.contract.id), margin + 5, yPosition)
        yPosition += 6
        doc.text('Tipo: ' + (property.contract.contractType === 'ARRENDAMIENTO' ? 'Arrendamiento' : 'Administracion'), margin + 5, yPosition)
        yPosition += 6
        doc.text('Fecha de Inicio: ' + formatDate(property.contract.startDate), margin + 5, yPosition)
        yPosition += 6
        doc.text('Fecha de Fin: ' + formatDate(property.contract.endDate), margin + 5, yPosition)
        yPosition += 6
        doc.text('Alquiler Mensual: ' + formatCurrency(property.contract.monthlyAmount || 0), margin + 5, yPosition)
        yPosition += 6
        doc.text('Deposito: ' + formatCurrency(property.contract.deposit || 0), margin + 5, yPosition)
        yPosition += 6
        doc.text('Estado: ' + (property.contract.status || 'N/A'), margin + 5, yPosition)
        yPosition += 8
      } else {
        doc.text('Sin contrato vigente', margin + 5, yPosition)
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

    const chartHeight = 65
    const chartWidth = pageWidth - 2 * margin
    const barGap = 3
    const totalBarSpace = chartWidth - 20
    const barWidth = totalBarSpace / 24
    const maxValue = Math.max(
      ...data.monthlyData.map(d => Math.max(d.grossIncome || 0, d.totalExpenses || 0)),
      1
    )

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(margin + 5, yPosition, margin + 5, yPosition + chartHeight)
    doc.line(margin + 5, yPosition + chartHeight, margin + chartWidth - 5, yPosition + chartHeight)

    data.monthlyData.forEach((month, index) => {
      const x = margin + 10 + index * (barWidth * 2 + barGap)
      
      const incomeHeight = Math.max(((month.grossIncome || 0) / maxValue) * (chartHeight - 15), 0)
      const expenseHeight = Math.max(((month.totalExpenses || 0) / maxValue) * (chartHeight - 15), 0)

      if (incomeHeight > 0) {
        doc.setFillColor(52, 211, 153)
        doc.rect(x, yPosition + chartHeight - incomeHeight - 5, barWidth, incomeHeight, 'F')
      }

      if (expenseHeight > 0) {
        doc.setFillColor(248, 113, 113)
        doc.rect(x + barWidth + 1, yPosition + chartHeight - expenseHeight - 5, barWidth, expenseHeight, 'F')
      }

      doc.setFontSize(6)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      const monthShort = safeText(month.monthName).substring(0, 3)
      doc.text(monthShort, x + barWidth, yPosition + chartHeight + 5, { align: 'center' })
    })

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

    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    
    doc.text('Titulo', margin + 3, yPosition + 5)
    doc.text('Propiedad', margin + 55, yPosition + 5)
    doc.text('Estado', margin + 110, yPosition + 5)
    doc.text('Prioridad', margin + 135, yPosition + 5)
    doc.text('Fecha estimada', pageWidth - margin - 25, yPosition + 5)
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
      doc.text(ticket.dueDate ? formatDate(ticket.dueDate) : 'Sin fecha', pageWidth - margin - 25, yPosition + 4)
      yPosition += 6
    })
    yPosition += 8
  }

  // ==================== RELACION DE GASTOS (OWNER BALANCE) ====================
  if (data.ownerBalance) {
    const ob = data.ownerBalance
    
    checkNewPage(60)
    
    doc.setFillColor(30, 58, 95)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('RELACION DE GASTOS - ADMINISTRADOR / PROPIETARIO', margin + 3, yPosition + 6)
    yPosition += 14

    // Pending Expenses Section
    if (ob.pendingExpenses && ob.pendingExpenses.length > 0) {
      doc.setFillColor(254, 226, 226)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
      
      doc.setTextColor(185, 28, 28)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('GASTOS PENDIENTES DE REEMBOLSO (Gestionados por Administrador)', margin + 3, yPosition + 5)
      yPosition += 10

      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F')
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      
      doc.text('Descripcion', margin + 3, yPosition + 4)
      doc.text('Propiedad', margin + 70, yPosition + 4)
      doc.text('Fecha', margin + 120, yPosition + 4)
      doc.text('Monto', pageWidth - margin - 25, yPosition + 4)
      yPosition += 7

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      
      ob.pendingExpenses.forEach((expense) => {
        checkNewPage(6)
        doc.setTextColor(60, 60, 60)
        
        doc.text(safeText(expense.description).substring(0, 28), margin + 3, yPosition + 4)
        doc.text(safeText(expense.property?.title).substring(0, 20), margin + 70, yPosition + 4)
        doc.text(formatDate(expense.date), margin + 120, yPosition + 4)
        doc.setTextColor(239, 68, 68)
        doc.text(formatCurrency(expense.amount), pageWidth - margin - 25, yPosition + 4)
        yPosition += 5
      })

      checkNewPage(8)
      doc.setDrawColor(180, 180, 180)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 4
      
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Total Gastos Pendientes:', margin + 70, yPosition + 4)
      doc.setTextColor(239, 68, 68)
      doc.text(formatCurrency(ob.totals.pending), pageWidth - margin - 25, yPosition + 4)
      yPosition += 10
    }

    // Owner Payments Section
    if (ob.ownerPayments && ob.ownerPayments.length > 0) {
      checkNewPage(40)
      
      doc.setFillColor(220, 252, 231)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F')
      
      doc.setTextColor(22, 101, 52)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('PAGOS REALIZADOS POR EL PROPIETARIO', margin + 3, yPosition + 5)
      yPosition += 10

      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F')
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      
      doc.text('Fecha', margin + 3, yPosition + 4)
      doc.text('Metodo', margin + 35, yPosition + 4)
      doc.text('Referencia', margin + 75, yPosition + 4)
      doc.text('Notas', margin + 110, yPosition + 4)
      doc.text('Monto', pageWidth - margin - 25, yPosition + 4)
      yPosition += 7

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      
      ob.ownerPayments.forEach((payment) => {
        checkNewPage(6)
        doc.setTextColor(60, 60, 60)
        
        doc.text(formatDate(payment.date), margin + 3, yPosition + 4)
        doc.text(safeText(payment.method || 'N/A').substring(0, 15), margin + 35, yPosition + 4)
        doc.text(safeText(payment.reference || '-').substring(0, 15), margin + 75, yPosition + 4)
        doc.text(safeText(payment.notes || '-').substring(0, 15), margin + 110, yPosition + 4)
        doc.setTextColor(34, 197, 94)
        doc.text(formatCurrency(payment.amount), pageWidth - margin - 25, yPosition + 4)
        yPosition += 5
      })

      checkNewPage(8)
      doc.setDrawColor(180, 180, 180)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 4
      
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Total Pagos Recibidos:', margin + 70, yPosition + 4)
      doc.setTextColor(34, 197, 94)
      doc.text(formatCurrency(ob.totals.payments), pageWidth - margin - 25, yPosition + 4)
      yPosition += 10
    }

    // Final Balance Box
    checkNewPage(35)
    
    doc.setFillColor(249, 250, 251)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'F')
    
    doc.setDrawColor(100, 100, 100)
    doc.setLineWidth(0.5)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'S')
    
    yPosition += 8
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 58, 95)
    doc.text('BALANCE FINAL', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    const balance = ob.totals.balance
    
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    doc.text('Gastos Pendientes: ' + formatCurrency(ob.totals.pending), margin + 15, yPosition)
    doc.text('Pagos Recibidos: ' + formatCurrency(ob.totals.payments), margin + 100, yPosition)
    yPosition += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    
    if (balance >= 0) {
      doc.setTextColor(22, 101, 52)
      doc.text('BALANCE A FAVOR DEL PROPIETARIO: ' + formatCurrency(balance), pageWidth / 2, yPosition, { align: 'center' })
    } else {
      doc.setTextColor(185, 28, 28)
      doc.text('SALDO PENDIENTE DE PAGO: ' + formatCurrency(Math.abs(balance)), pageWidth / 2, yPosition, { align: 'center' })
    }
    
    yPosition += 15
  }

  // ==================== FOOTER ====================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Pagina ' + i + ' de ' + totalPages + ' - Inmogest Pro - Reporte Financiero',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  return doc
}

export function generateOwnerBalancePDF(params: {
  title: string
  period: string
  data: OwnerBalanceData
}): jsPDF {
  const { title, period, data } = params
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = 46

  const safeText = (value: string | null | undefined) => (value || '').replace(/[^\x00-\xFF]/g, '')
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-PA', {
    style: 'currency', currency: 'USD',
  }).format(Number.isFinite(amount) ? amount : 0)
  const formatDate = (value: string) => new Date(value).toLocaleDateString('es-PA')

  const addHeader = () => {
    doc.setFillColor(18, 59, 74)
    doc.rect(0, 0, pageWidth, 34, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(safeText(title), margin, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Período: ${safeText(period)}`, margin, 25)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PA')}`, pageWidth - margin, 25, { align: 'right' })
  }
  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) {
      doc.addPage()
      addHeader()
      y = 43
      return true
    }
    return false
  }
  const sectionTitle = (text: string, color: [number, number, number]) => {
    ensureSpace(16)
    doc.setFillColor(...color)
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(safeText(text), margin + 4, y + 5.5)
    y += 12
  }

  addHeader()

  const cards = [
    { label: 'Gastos gestionados', value: data.totals.pending, color: [239, 107, 98] as [number, number, number] },
    { label: 'Abonos del propietario', value: data.totals.payments, color: [25, 165, 157] as [number, number, number] },
    { label: data.totals.balance >= 0 ? 'A favor del propietario' : 'Pendiente al administrador', value: Math.abs(data.totals.balance), color: [53, 120, 200] as [number, number, number] },
  ]
  const cardGap = 5
  const cardWidth = (contentWidth - cardGap * 2) / 3
  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + cardGap)
    doc.setFillColor(247, 249, 250)
    doc.setDrawColor(224, 229, 232)
    doc.roundedRect(x, y, cardWidth, 25, 2, 2, 'FD')
    doc.setTextColor(95, 105, 110)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(safeText(card.label), x + 4, y + 8)
    doc.setTextColor(...card.color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(formatCurrency(card.value), x + 4, y + 18)
  })
  y += 34

  const statements = buildOwnerStatements(data)
  const drawStatementHeader = () => {
    doc.setFillColor(240, 243, 245)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setTextColor(60, 70, 75)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.text('Fecha', margin + 3, y + 5)
    doc.text('Descripcion', margin + 30, y + 5)
    doc.text('Categoria', margin + 92, y + 5)
    doc.text('Monto', margin + 152, y + 5, { align: 'right' })
    doc.text('Balance', pageWidth - margin - 3, y + 5, { align: 'right' })
    y += 9
  }

  for (const statement of statements) {
    sectionTitle(`ESTADO DE CUENTA - ${statement.property.title}`, [18, 107, 115])
    drawStatementHeader()

    for (const movement of statement.movements) {
      const description = doc.splitTextToSize(safeText(movement.description), 56) as string[]
      const category = doc.splitTextToSize(
        safeText(movement.type === 'GASTO' ? categoryLabels[movement.category] || movement.category : movement.category),
        48
      ) as string[]
      const rowHeight = Math.max(8, Math.max(description.length, category.length) * 4 + 3)
      if (ensureSpace(rowHeight + 2)) drawStatementHeader()
      doc.setTextColor(55, 65, 70)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.2)
      doc.text(formatDate(movement.date), margin + 3, y + 4)
      doc.text(description, margin + 30, y + 4)
      doc.text(category, margin + 92, y + 4)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(movement.type === 'GASTO' ? [185, 28, 28] : [22, 130, 90]) as [number, number, number])
      doc.text(`${movement.type === 'GASTO' ? '-' : '+'}${formatCurrency(movement.amount)}`, margin + 152, y + 4, { align: 'right' })
      doc.setTextColor(...(movement.balance < 0 ? [185, 28, 28] : [22, 130, 90]) as [number, number, number])
      doc.text(formatCurrency(movement.balance), pageWidth - margin - 3, y + 4, { align: 'right' })
      y += rowHeight
      doc.setDrawColor(232, 235, 237)
      doc.line(margin, y, pageWidth - margin, y)
    }

    y += 4
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(55, 65, 70)
    doc.text(`Gastos: -${formatCurrency(statement.expenses)}`, margin + 3, y + 4)
    doc.text(`Pagos: +${formatCurrency(statement.payments)}`, margin + 70, y + 4)
    doc.setTextColor(...(statement.balance < 0 ? [185, 28, 28] : [22, 130, 90]) as [number, number, number])
    doc.text(`Balance: ${formatCurrency(statement.balance)}`, pageWidth - margin - 3, y + 4, { align: 'right' })
    y += 12
  }

  if (!statements.length) {
    sectionTitle('ESTADO DE CUENTA', [18, 107, 115])
    doc.setTextColor(100, 110, 115)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text('No hay movimientos registrados para la seleccion actual.', margin + 3, y + 5)
    y += 12
  }

  ensureSpace(38)
  y += 8
  doc.setFillColor(232, 246, 244)
  doc.setDrawColor(18, 107, 115)
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'FD')
  doc.setTextColor(18, 59, 74)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
    doc.text('BALANCE DE LA RELACIÓN', pageWidth / 2, y + 8, { align: 'center' })
  doc.setFontSize(13)
  doc.text(
    `${data.totals.balance >= 0 ? 'A favor del propietario' : 'Pendiente al administrador'}: ${formatCurrency(Math.abs(data.totals.balance))}`,
    pageWidth / 2, y + 19, { align: 'center' }
  )

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(220, 225, 228)
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13)
    doc.setTextColor(125, 135, 140)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Página ${page} de ${totalPages} - InmoGest Pro`, pageWidth / 2, pageHeight - 8, { align: 'center' })
  }

  return doc
}

// Contract PDF function
export async function generateContractPDF(data: {
  contract: {
    id: string
    contractNumber?: string
    contractType?: string
    startDate: string
    endDate: string
    monthlyRent: number
    deposit: number
    status: string
    terms?: string | null
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
}): Promise<jsPDF> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = 18

  const safeText = (text: string | undefined | null): string => {
    if (!text) return ''
    return text.replace(/[^\x00-\xFF]/g, '')
  }

  const addPage = () => {
    doc.addPage()
    y = 18
    doc.setTextColor(18, 107, 115)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('InmoGest Pro · Contrato', margin, 10)
  }

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) addPage()
  }

  const addSection = (title: string, entries: Array<[string, string | undefined | null]>) => {
    const rendered = entries.filter(([, value]) => value).map(([label, value]) => ({
      label,
      lines: doc.splitTextToSize(`${label}: ${safeText(value)}`, contentWidth - 8) as string[],
    }))
    const height = 11 + rendered.reduce((sum, entry) => sum + Math.max(6, entry.lines.length * 5), 0)
    ensureSpace(Math.min(height, pageHeight - 36))
    doc.setFillColor(232, 246, 244)
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
    doc.setTextColor(18, 107, 115)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(title, margin + 4, y + 5.5)
    y += 13
    doc.setTextColor(45, 55, 60)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    for (const entry of rendered) {
      for (const line of entry.lines) {
        ensureSpace(7)
        doc.text(line, margin + 4, y)
        y += 5
      }
      y += 1
    }
    y += 5
  }

  doc.setFillColor(18, 59, 74)
  doc.rect(0, 0, pageWidth, 38, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text(data.contract.contractType === 'ADMINISTRACION' ? 'CONTRATO DE ADMINISTRACION' : 'CONTRATO DE ARRENDAMIENTO', pageWidth / 2, 17, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(`Contrato ${safeText(data.contract.contractNumber || data.contract.id)} · Generado ${new Date().toLocaleDateString('es-PA')}`, pageWidth / 2, 27, { align: 'center' })
  y = 49

  addSection('PROPIEDAD', [
    ['Propiedad', data.contract.property.name],
    ['Direccion', data.contract.property.address],
  ])
  addSection('INQUILINO', [
    ['Nombre', data.contract.tenant.name],
    ['Email', data.contract.tenant.email],
    ['Telefono', data.contract.tenant.phone],
    ['Documento', data.contract.tenant.dni],
  ])
  addSection('CONDICIONES', [
    ['Fecha de inicio', new Date(data.contract.startDate).toLocaleDateString('es-PA')],
    ['Fecha de fin', new Date(data.contract.endDate).toLocaleDateString('es-PA')],
    ['Alquiler mensual', `$${(data.contract.monthlyRent || 0).toFixed(2)}`],
    ['Deposito', `$${(data.contract.deposit || 0).toFixed(2)}`],
    ['Estado', data.contract.status || 'N/A'],
  ])
  if (data.contract.owner) {
    addSection('PROPIETARIO', [
      ['Nombre', data.contract.owner.name],
      ['Email', data.contract.owner.email],
      ['Telefono', data.contract.owner.phone],
    ])
  }
  if (data.contract.terms?.trim()) addSection('TERMINOS Y OBSERVACIONES', [['Detalle', data.contract.terms]])

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(210, 218, 222)
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13)
    doc.setTextColor(120, 130, 135)
    doc.setFontSize(8)
    doc.text(`Pagina ${page} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
  }

  return doc
}
