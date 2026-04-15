import jsPDF from 'jspdf'
import { format } from 'date-fns'

interface PropertyData {
  id: string
  name: string
  address: string
  propertyType: string
  status: string
  owner?: {
    name: string
    email: string
    phone?: string
  }
  tenant?: {
    name: string
    email: string
    phone?: string
  }
}

interface IncomeData {
  id: string
  description: string
  amount: number
  date: string
  category: string
  property?: {
    name: string
  }
}

interface ExpenseData {
  id: string
  description: string
  amount: number
  date: string
  category: string
  property?: {
    name: string
  }
  paidByAdmin: boolean
  reimbursedByOwner: boolean
  reimbursedAt?: string
}

interface TicketData {
  id: string
  ticketNumber: string
  subject: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  property?: {
    name: string
  }
  user?: {
    name: string
    email: string
  }
}

interface OwnerPaymentData {
  id: string
  amount: number
  paymentDate: string
  paymentMethod?: string
  referenceNumber?: string
  notes?: string
  owner?: {
    name: string
    email: string
  }
}

interface OwnerBalanceData {
  ownerId: string
  ownerName: string
  ownerEmail: string
  ownerPhone?: string
  pendingExpenses: ExpenseData[]
  totalPending: number
  totalReimbursed: number
  ownerPayments: OwnerPaymentData[]
  totalPayments: number
  balance: number // positivo = saldo a favor, negativo = debe dinero
}

interface ReportPDFData {
  generatedAt: string
  generatedBy: string
  dateRange?: {
    start: string
    end: string
  }
  properties?: PropertyData[]
  incomes?: IncomeData[]
  expenses?: ExpenseData[]
  tickets?: TicketData[]
  ownerBalances?: OwnerBalanceData[]
  summary?: {
    totalProperties: number
    totalIncome: number
    totalExpenses: number
    netIncome: number
    totalTickets: number
    openTickets: number
    totalPendingExpenses: number
    totalOwnerPayments: number
    totalOwnerBalance: number
  }
}

export async function generateReportPDF(data: ReportPDFData): Promise<Buffer> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, options: {
    maxWidth?: number
    fontSize?: number
    fontStyle?: 'normal' | 'bold' | 'italic'
    align?: 'left' | 'center' | 'right'
    color?: [number, number, number]
  } = {}) => {
    const { maxWidth = pageWidth - 2 * margin, fontSize = 10, fontStyle = 'normal', align = 'left', color = [0, 0, 0] } = options
    
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', fontStyle)
    doc.setTextColor(color[0], color[1], color[2])
    
    const lines = doc.splitTextToSize(text, maxWidth)
    
    lines.forEach((line: string, index: number) => {
      if (y + index * (fontSize * 0.5) > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, x, y + index * (fontSize * 0.5))
    })
    
    return y + lines.length * (fontSize * 0.5)
  }

  // Helper to check if we need a new page
  const checkNewPage = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Header
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Inmogest Pro', margin, 25)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Reporte de Administracion', margin, 35)
  
  yPosition = 55

  // Generation info
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(10)
  doc.text(`Generado: ${format(new Date(data.generatedAt), 'dd/MM/yyyy HH:mm')}`, margin, yPosition)
  doc.text(`Por: ${data.generatedBy}`, pageWidth - margin - 50, yPosition)
  yPosition += 10

  if (data.dateRange) {
    doc.text(`Periodo: ${format(new Date(data.dateRange.start), 'dd/MM/yyyy')} - ${format(new Date(data.dateRange.end), 'dd/MM/yyyy')}`, margin, yPosition)
    yPosition += 10
  }

  // Summary section
  if (data.summary) {
    checkNewPage(60)
    
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 55, 'F')
    
    yPosition += 10
    doc.setTextColor(30, 64, 175)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen General', margin + 5, yPosition)
    yPosition += 12

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    
    const summaryData = [
      `Propiedades: ${data.summary.totalProperties}`,
      `Ingresos Totales: $${data.summary.totalIncome.toFixed(2)}`,
      `Gastos Totales: $${data.summary.totalExpenses.toFixed(2)}`,
      `Ingreso Neto: $${data.summary.netIncome.toFixed(2)}`,
      `Tickets: ${data.summary.totalTickets} (${data.summary.openTickets} abiertos)`,
    ]

    summaryData.forEach((text, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      doc.text(text, margin + 5 + col * 85, yPosition + row * 8)
    })
    
    yPosition += 30
    
    // Owner balance summary
    if (data.ownerBalances && data.ownerBalances.length > 0) {
      doc.setTextColor(30, 64, 175)
      doc.setFont('helvetica', 'bold')
      doc.text('Relacion de Gastos:', margin + 5, yPosition)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(`Gastos Pendientes: $${data.summary.totalPendingExpenses.toFixed(2)}`, margin + 5, yPosition + 8)
      doc.text(`Pagos de Propietarios: $${data.summary.totalOwnerPayments.toFixed(2)}`, margin + 100, yPosition + 8)
      const balanceColor = data.summary.totalOwnerBalance >= 0 ? [34, 197, 94] : [239, 68, 68]
      doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2])
      doc.text(`Balance General: $${Math.abs(data.summary.totalOwnerBalance).toFixed(2)} ${data.summary.totalOwnerBalance >= 0 ? '(a favor)' : '(por cobrar)'}`, margin + 5, yPosition + 16)
    }
    
    yPosition += 25
  }

  // Properties section
  if (data.properties && data.properties.length > 0) {
    checkNewPage(30)
    
    doc.setFillColor(30, 64, 175)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F')
    doc.text('Propiedades', margin + 5, yPosition + 7)
    yPosition += 15

    data.properties.forEach((property, index) => {
      checkNewPage(25)
      
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`${index + 1}. ${property.name}`, margin, yPosition)
      yPosition += 6
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Direccion: ${property.address}`, margin + 5, yPosition)
      yPosition += 5
      doc.text(`Tipo: ${property.propertyType} | Estado: ${property.status}`, margin + 5, yPosition)
      yPosition += 5
      
      if (property.owner) {
        doc.text(`Propietario: ${property.owner.name} (${property.owner.email})`, margin + 5, yPosition)
        yPosition += 5
      }
      
      if (property.tenant) {
        doc.text(`Inquilino: ${property.tenant.name} (${property.tenant.email})`, margin + 5, yPosition)
        yPosition += 5
      }
      
      yPosition += 5
    })
  }

  // Incomes section
  if (data.incomes && data.incomes.length > 0) {
    checkNewPage(30)
    
    doc.setFillColor(34, 197, 94)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F')
    doc.text('Ingresos', margin + 5, yPosition + 7)
    yPosition += 15

    data.incomes.forEach((income, index) => {
      checkNewPage(15)
      
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      const incomeText = `${index + 1}. ${income.description} - $${income.amount.toFixed(2)}`
      doc.text(incomeText, margin, yPosition)
      
      const dateText = format(new Date(income.date), 'dd/MM/yyyy')
      doc.text(dateText, pageWidth - margin - 25, yPosition)
      
      yPosition += 5
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Categoria: ${income.category}${income.property ? ` | Propiedad: ${income.property.name}` : ''}`, margin + 5, yPosition)
      yPosition += 8
    })
    
    // Income total
    yPosition += 5
    const totalIncome = data.incomes.reduce((sum, inc) => sum + inc.amount, 0)
    doc.setTextColor(34, 197, 94)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Ingresos: $${totalIncome.toFixed(2)}`, margin, yPosition)
    yPosition += 15
  }

  // Expenses section
  if (data.expenses && data.expenses.length > 0) {
    checkNewPage(30)
    
    doc.setFillColor(239, 68, 68)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F')
    doc.text('Gastos', margin + 5, yPosition + 7)
    yPosition += 15

    data.expenses.forEach((expense, index) => {
      checkNewPage(15)
      
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      const expenseText = `${index + 1}. ${expense.description} - $${expense.amount.toFixed(2)}`
      doc.text(expenseText, margin, yPosition)
      
      const dateText = format(new Date(expense.date), 'dd/MM/yyyy')
      doc.text(dateText, pageWidth - margin - 25, yPosition)
      
      yPosition += 5
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      let statusText = `Categoria: ${expense.category}`
      if (expense.paidByAdmin) {
        statusText += ' | Pagado por Admin'
        if (expense.reimbursedByOwner) {
          statusText += ' (Reembolsado)'
        } else {
          statusText += ' (Pendiente reembolso)'
        }
      }
      doc.text(statusText, margin + 5, yPosition)
      yPosition += 8
    })
    
    // Expense total
    yPosition += 5
    const totalExpense = data.expenses.reduce((sum, exp) => sum + exp.amount, 0)
    doc.setTextColor(239, 68, 68)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Gastos: $${totalExpense.toFixed(2)}`, margin, yPosition)
    yPosition += 15
  }

  // Tickets section
  if (data.tickets && data.tickets.length > 0) {
    checkNewPage(30)
    
    doc.setFillColor(168, 85, 247)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F')
    doc.text('Tickets de Soporte', margin + 5, yPosition + 7)
    yPosition += 15

    data.tickets.forEach((ticket, index) => {
      checkNewPage(20)
      
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`${index + 1}. Ticket #${ticket.ticketNumber}: ${ticket.subject}`, margin, yPosition)
      yPosition += 5
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      
      const statusColors: Record<string, [number, number, number]> = {
        'OPEN': [239, 68, 68],
        'IN_PROGRESS': [234, 179, 8],
        'RESOLVED': [34, 197, 94],
        'CLOSED': [107, 114, 128]
      }
      const priorityColors: Record<string, [number, number, number]> = {
        'LOW': [107, 114, 128],
        'MEDIUM': [234, 179, 8],
        'HIGH': [249, 115, 22],
        'URGENT': [239, 68, 68]
      }
      
      doc.setTextColor(60, 60, 60)
      doc.text(`Estado: ${ticket.status} | Prioridad: ${ticket.priority}`, margin + 5, yPosition)
      yPosition += 4
      
      if (ticket.property) {
        doc.text(`Propiedad: ${ticket.property.name}`, margin + 5, yPosition)
        yPosition += 4
      }
      
      if (ticket.user) {
        doc.text(`Creado por: ${ticket.user.name} (${ticket.user.email})`, margin + 5, yPosition)
        yPosition += 4
      }
      
      doc.text(`Creado: ${format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}`, margin + 5, yPosition)
      yPosition += 8
    })
    
    yPosition += 5
  }

  // Owner Balances section (Relación de Gastos)
  if (data.ownerBalances && data.ownerBalances.length > 0) {
    checkNewPage(30)
    
    doc.setFillColor(59, 130, 246)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F')
    doc.text('Relacion de Gastos con Propietarios', margin + 5, yPosition + 7)
    yPosition += 15

    data.ownerBalances.forEach((ownerBalance, index) => {
      checkNewPage(50)
      
      // Owner header
      doc.setTextColor(30, 64, 175)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${index + 1}. ${ownerBalance.ownerName}`, margin, yPosition)
      yPosition += 5
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Email: ${ownerBalance.ownerEmail}${ownerBalance.ownerPhone ? ` | Tel: ${ownerBalance.ownerPhone}` : ''}`, margin + 5, yPosition)
      yPosition += 8
      
      // Balance summary box
      const boxColor = ownerBalance.balance >= 0 ? [220, 252, 231] : [254, 226, 226]
      doc.setFillColor(boxColor[0], boxColor[1], boxColor[2])
      doc.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 15, 'F')
      
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.text(`Pendiente: $${ownerBalance.totalPending.toFixed(2)} | Reembolsado: $${ownerBalance.totalReimbursed.toFixed(2)} | Pagos: $${ownerBalance.totalPayments.toFixed(2)}`, margin + 10, yPosition + 6)
      
      const balanceTextColor = ownerBalance.balance >= 0 ? [22, 163, 74] : [220, 38, 38]
      doc.setTextColor(balanceTextColor[0], balanceTextColor[1], balanceTextColor[2])
      doc.text(`Balance: $${Math.abs(ownerBalance.balance).toFixed(2)} ${ownerBalance.balance >= 0 ? '(Saldo a favor)' : '(Debe)'}`, margin + 10, yPosition + 12)
      yPosition += 20

      // Pending expenses
      if (ownerBalance.pendingExpenses.length > 0) {
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Gastos Pendientes de Reembolso:', margin + 5, yPosition)
        yPosition += 5
        
        ownerBalance.pendingExpenses.forEach((expense, idx) => {
          checkNewPage(8)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(80, 80, 80)
          doc.text(`  ${idx + 1}. ${expense.description} - $${expense.amount.toFixed(2)} (${format(new Date(expense.date), 'dd/MM/yyyy')})`, margin + 5, yPosition)
          yPosition += 5
        })
        yPosition += 3
      }

      // Owner payments
      if (ownerBalance.ownerPayments.length > 0) {
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Pagos Realizados:', margin + 5, yPosition)
        yPosition += 5
        
        ownerBalance.ownerPayments.forEach((payment, idx) => {
          checkNewPage(8)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(80, 80, 80)
          const methodText = payment.paymentMethod ? ` [${payment.paymentMethod}]` : ''
          const refText = payment.referenceNumber ? ` Ref: ${payment.referenceNumber}` : ''
          doc.text(`  ${idx + 1}. $${payment.amount.toFixed(2)} - ${format(new Date(payment.paymentDate), 'dd/MM/yyyy')}${methodText}${refText}`, margin + 5, yPosition)
          yPosition += 5
        })
        yPosition += 3
      }

      yPosition += 8
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

  return Buffer.from(doc.output('arraybuffer'))
}
