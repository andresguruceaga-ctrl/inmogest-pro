import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { parseFinancialWorkbook, type ImportIssue, type ParsedImportRow } from '@/lib/financial-import'

export const runtime = 'nodejs'

function rowLabel(row: ParsedImportRow): string {
  if (row.kind === 'expense') return String(row.data.title)
  return String(row.data.referenceNumber || row.data.notes || 'Sin referencia')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(['ADMIN'])
    if (!auth.ok) return auth.response

    const formData = await request.formData()
    const file = formData.get('file')
    const commit = formData.get('commit') === 'true'
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Seleccione un archivo Excel.' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ success: false, error: 'El archivo debe tener formato .xlsx.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'El archivo no puede superar 5 MB.' }, { status: 400 })
    }

    const parsed = await parseFinancialWorkbook(Buffer.from(await file.arrayBuffer()))
    const issues: ImportIssue[] = [...parsed.issues]
    const properties = await db.property.findMany({ select: { id: true, title: true, ownerId: true, tenantId: true } })
    const users = await db.user.findMany({ select: { id: true, name: true, role: true } })
    const contracts = await db.contract.findMany({ select: { id: true, propertyId: true, tenantId: true } })
    const propertyMap = new Map(properties.map(property => [property.id, property]))
    const userMap = new Map(users.map(user => [user.id, user]))
    const contractMap = new Map(contracts.map(contract => [contract.id, contract]))
    const seen = new Set<string>()

    const invoiceNumbers = parsed.rows
      .filter(row => row.kind === 'expense' && row.data.invoiceNumber)
      .map(row => String(row.data.invoiceNumber))
    const tenantReferences = parsed.rows
      .filter(row => row.kind === 'tenantPayment' && row.data.referenceNumber)
      .map(row => String(row.data.referenceNumber))
    const ownerReferences = parsed.rows
      .filter(row => row.kind === 'ownerPayment' && row.data.referenceNumber)
      .map(row => String(row.data.referenceNumber))
    const [existingExpenses, existingTenantPayments, existingOwnerPayments] = await Promise.all([
      invoiceNumbers.length
        ? db.expense.findMany({ where: { invoiceNumber: { in: invoiceNumbers } }, select: { propertyId: true, invoiceNumber: true } })
        : [],
      tenantReferences.length
        ? db.payment.findMany({ where: { referenceNumber: { in: tenantReferences } }, select: { propertyId: true, userId: true, referenceNumber: true } })
        : [],
      ownerReferences.length
        ? db.ownerPayment.findMany({ where: { referenceNumber: { in: ownerReferences } }, select: { ownerId: true, referenceNumber: true } })
        : [],
    ])
    const existingExpenseKeys = new Set(existingExpenses.map(expense => `${expense.propertyId}|${expense.invoiceNumber}`))
    const existingTenantPaymentKeys = new Set(existingTenantPayments.map(payment => `${payment.propertyId}|${payment.userId}|${payment.referenceNumber}`))
    const existingOwnerPaymentKeys = new Set(existingOwnerPayments.map(payment => `${payment.ownerId}|${payment.referenceNumber}`))

    for (const row of parsed.rows) {
      const propertyId = String(row.data.propertyId || '')
      const property = propertyId ? propertyMap.get(propertyId) : null
      if (propertyId && !property) issues.push({ sheet: row.sheet, row: row.row, message: 'propertyId no existe' })

      if (row.kind === 'tenantPayment') {
        const userId = String(row.data.userId)
        const user = userMap.get(userId)
        if (!user || user.role !== 'INQUILINO') issues.push({ sheet: row.sheet, row: row.row, message: 'userId no corresponde a un inquilino' })
        const contractId = row.data.contractId ? String(row.data.contractId) : null
        const contract = contractId ? contractMap.get(contractId) : null
        if (contractId && (!contract || contract.propertyId !== propertyId || contract.tenantId !== userId)) {
          issues.push({ sheet: row.sheet, row: row.row, message: 'contractId no corresponde a la propiedad y al inquilino' })
        } else if (!contractId && property && property.tenantId !== userId) {
          issues.push({ sheet: row.sheet, row: row.row, message: 'el inquilino no esta asignado a la propiedad' })
        }
      }

      if (row.kind === 'ownerPayment') {
        const ownerId = String(row.data.ownerId)
        const owner = userMap.get(ownerId)
        if (!owner || owner.role !== 'PROPIETARIO') issues.push({ sheet: row.sheet, row: row.row, message: 'ownerId no corresponde a un propietario' })
        if (property && property.ownerId !== ownerId) issues.push({ sheet: row.sheet, row: row.row, message: 'la propiedad no pertenece al propietario' })
      }

      if (row.kind === 'expense' && row.data.invoiceNumber && existingExpenseKeys.has(`${propertyId}|${row.data.invoiceNumber}`)) {
        issues.push({ sheet: row.sheet, row: row.row, message: 'ya existe un gasto con ese numero de factura para la propiedad' })
      }
      if (row.kind === 'tenantPayment' && row.data.referenceNumber && existingTenantPaymentKeys.has(`${propertyId}|${row.data.userId}|${row.data.referenceNumber}`)) {
        issues.push({ sheet: row.sheet, row: row.row, message: 'ya existe un pago del inquilino con ese numero de referencia' })
      }
      if (row.kind === 'ownerPayment' && row.data.referenceNumber && existingOwnerPaymentKeys.has(`${row.data.ownerId}|${row.data.referenceNumber}`)) {
        issues.push({ sheet: row.sheet, row: row.row, message: 'ya existe un pago del propietario con ese numero de referencia' })
      }

      const importDate = row.data.expenseDate || row.data.paymentDate || row.data.dueDate
      const dateKey = importDate instanceof Date ? importDate.toISOString() : ''
      const duplicateKey = `${row.kind}|${propertyId}|${row.data.userId || row.data.ownerId || ''}|${row.data.referenceNumber || row.data.invoiceNumber || ''}|${row.data.amount}|${dateKey}`
      if (seen.has(duplicateKey)) issues.push({ sheet: row.sheet, row: row.row, message: 'fila duplicada dentro del archivo' })
      seen.add(duplicateKey)
    }

    const summary = {
      expenses: parsed.rows.filter(row => row.kind === 'expense').length,
      tenantPayments: parsed.rows.filter(row => row.kind === 'tenantPayment').length,
      ownerPayments: parsed.rows.filter(row => row.kind === 'ownerPayment').length,
      total: parsed.rows.length,
    }

    if (issues.length || !commit) {
      return NextResponse.json({
        success: issues.length === 0,
        preview: true,
        canImport: issues.length === 0 && parsed.rows.length > 0,
        summary,
        issues,
        rows: parsed.rows.slice(0, 100).map(row => ({ kind: row.kind, sheet: row.sheet, row: row.row, label: rowLabel(row), amount: row.data.amount })),
      }, { status: issues.length && commit ? 400 : 200 })
    }

    await db.$transaction(async transaction => {
      for (const row of parsed.rows) {
        if (row.kind === 'expense') {
          await transaction.expense.create({ data: {
            title: String(row.data.title), description: row.data.description as string | null,
            category: row.data.category as never, expenseType: row.data.expenseType as never,
            amount: Number(row.data.amount), itbmsAmount: 0, totalAmount: Number(row.data.amount),
            invoiceNumber: row.data.invoiceNumber as string | null, invoiceDate: row.data.invoiceDate as Date | null,
            supplier: row.data.supplier as string | null, expenseDate: row.data.expenseDate as Date,
            propertyId: String(row.data.propertyId), paidByAdmin: Boolean(row.data.paidByAdmin),
            reimbursedByOwner: Boolean(row.data.reimbursedByOwner),
            reimbursedAt: row.data.reimbursedByOwner ? new Date() : null,
          } })
        } else if (row.kind === 'tenantPayment') {
          await transaction.payment.create({ data: {
            paymentType: row.data.paymentType as never, amount: Number(row.data.amount), itbmsAmount: 0,
            totalAmount: Number(row.data.amount), referenceNumber: row.data.referenceNumber as string | null,
            paymentMethod: row.data.paymentMethod as string | null, status: row.data.status as never,
            paidAt: row.data.paidAt as Date | null, dueDate: row.data.dueDate as Date,
            propertyId: String(row.data.propertyId), userId: String(row.data.userId),
            contractId: row.data.contractId as string | null,
          } })
        } else {
          await transaction.ownerPayment.create({ data: {
            ownerId: String(row.data.ownerId), propertyId: row.data.propertyId as string | null,
            amount: Number(row.data.amount), paymentDate: row.data.paymentDate as Date,
            paymentMethod: row.data.paymentMethod as string | null, referenceNumber: row.data.referenceNumber as string | null,
            notes: row.data.notes as string | null,
          } })
        }
      }
    })

    return NextResponse.json({ success: true, imported: summary, message: 'Importacion completada.' })
  } catch (error) {
    console.error('Error importing financial workbook:', error)
    return NextResponse.json({ success: false, error: 'No se pudo procesar el archivo Excel.' }, { status: 500 })
  }
}
