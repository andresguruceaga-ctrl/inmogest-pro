import ExcelJS from 'exceljs'

export type ImportKind = 'expense' | 'tenantPayment' | 'ownerPayment'

export interface ImportIssue {
  sheet: string
  row: number
  message: string
}

export interface ParsedImportRow {
  kind: ImportKind
  sheet: string
  row: number
  data: Record<string, string | number | boolean | Date | null>
}

const sheetDefinitions = [
  { name: 'Gastos', kind: 'expense' as const },
  { name: 'Pagos inquilinos', kind: 'tenantPayment' as const },
  { name: 'Pagos propietario', kind: 'ownerPayment' as const },
]

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value
  if (value && typeof value === 'object') {
    if ('result' in value) return value.result
    if ('text' in value) return value.text
    if ('richText' in value) return value.richText.map(part => part.text).join('')
  }
  return value
}

export function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number' && value > 0) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000))
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value !== 'string' || !value.trim()) return null
  const text = value.trim()
  const local = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (local) {
    const date = new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]))
    return date.getFullYear() === Number(local[3]) && date.getMonth() === Number(local[2]) - 1 && date.getDate() === Number(local[1]) ? date : null
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseImportBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toUpperCase()
  if (['SI', 'SÍ', 'TRUE', '1', 'YES'].includes(normalized)) return true
  if (['NO', 'FALSE', '0'].includes(normalized)) return false
  return normalized ? null : false
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function amount(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function parseFinancialWorkbook(buffer: Buffer): Promise<{ rows: ParsedImportRow[]; issues: ImportIssue[] }> {
  const workbook = new ExcelJS.Workbook()
  // ExcelJS types its input as ArrayBuffer while the route receives a Node
  // Buffer. Copying to a Uint8Array also prevents sharing a mutable view.
  await workbook.xlsx.load(Uint8Array.from(buffer).buffer)
  const rows: ParsedImportRow[] = []
  const issues: ImportIssue[] = []

  for (const definition of sheetDefinitions) {
    const sheet = workbook.getWorksheet(definition.name)
    if (!sheet) {
      issues.push({ sheet: definition.name, row: 0, message: `Falta la hoja "${definition.name}".` })
      continue
    }

    const headers = new Map<string, number>()
    sheet.getRow(4).eachCell((cell, column) => headers.set(cell.text.trim(), column))

    // rowCount is the last populated row index; actualRowCount only counts
    // non-empty rows and fails when the template leaves spacer rows above data.
    for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber)
      const raw: Record<string, unknown> = {}
      for (const [header, column] of headers) raw[header] = cellValue(row.getCell(column))
      if (Object.values(raw).every(value => text(value) === '')) continue

      const rowIssues: string[] = []
      let data: ParsedImportRow['data']

      if (definition.kind === 'expense') {
        const expenseAmount = amount(raw.monto)
        const expenseDate = parseExcelDate(raw.fechaGasto)
        const paidByAdmin = parseImportBoolean(raw.pagadoPorAdministrador)
        const reimbursed = parseImportBoolean(raw.reembolsadoPorPropietario)
        if (!text(raw.propertyId)) rowIssues.push('propertyId es obligatorio')
        if (!text(raw.titulo)) rowIssues.push('titulo es obligatorio')
        if (!['MANTENIMIENTO_PH', 'SEGURO', 'SERVICIOS_BASICOS', 'REPARACION', 'SERVICIO_TECNICO', 'IMPUESTOS', 'COMISION_ADMIN', 'OTROS'].includes(text(raw.categoria).toUpperCase())) rowIssues.push('categoria no valida')
        if (!['FIJO', 'VARIABLE'].includes(text(raw.tipo).toUpperCase())) rowIssues.push('tipo no valido')
        if (!expenseAmount) rowIssues.push('monto debe ser mayor que cero')
        if (!expenseDate) rowIssues.push('fechaGasto no es valida')
        if (paidByAdmin === null) rowIssues.push('pagadoPorAdministrador debe ser SI o NO')
        if (reimbursed === null) rowIssues.push('reembolsadoPorPropietario debe ser SI o NO')
        data = {
          propertyId: text(raw.propertyId), title: text(raw.titulo), description: text(raw.descripcion) || null,
          category: text(raw.categoria).toUpperCase(), expenseType: text(raw.tipo).toUpperCase(), amount: expenseAmount ?? 0,
          expenseDate: expenseDate ?? new Date(0), invoiceNumber: text(raw.numeroFactura) || null,
          invoiceDate: parseExcelDate(raw.fechaFactura), supplier: text(raw.proveedor) || null,
          paidByAdmin: paidByAdmin ?? false, reimbursedByOwner: reimbursed ?? false,
        }
      } else if (definition.kind === 'tenantPayment') {
        const paymentAmount = amount(raw.monto)
        const dueDate = parseExcelDate(raw.fechaVencimiento)
        const paidAt = parseExcelDate(raw.fechaPago)
        const status = text(raw.estado).toUpperCase() || 'PAGADO'
        if (!text(raw.propertyId)) rowIssues.push('propertyId es obligatorio')
        if (!text(raw.userId)) rowIssues.push('userId es obligatorio')
        if (!['ALQUILER', 'DEPOSITO', 'MANTENIMIENTO', 'COMISION', 'OTROS'].includes(text(raw.tipoPago).toUpperCase())) rowIssues.push('tipoPago no valido')
        if (!paymentAmount) rowIssues.push('monto debe ser mayor que cero')
        if (!['PENDIENTE', 'PAGADO', 'ATRASADO', 'PARCIAL', 'CANCELADO'].includes(status)) rowIssues.push('estado no valido')
        if (!dueDate) rowIssues.push('fechaVencimiento no es valida')
        if (status === 'PAGADO' && !paidAt) rowIssues.push('fechaPago es obligatoria cuando el estado es PAGADO')
        data = {
          propertyId: text(raw.propertyId), userId: text(raw.userId), paymentType: text(raw.tipoPago).toUpperCase(),
          amount: paymentAmount ?? 0, referenceNumber: text(raw.numeroReferencia) || null,
          paymentMethod: text(raw.metodoPago).toUpperCase() || null, status, dueDate: dueDate ?? new Date(0),
          paidAt, contractId: text(raw.contractId) || null,
        }
      } else {
        const ownerAmount = amount(raw.monto)
        const paymentDate = parseExcelDate(raw.fechaPago)
        if (!text(raw.ownerId)) rowIssues.push('ownerId es obligatorio')
        if (!ownerAmount) rowIssues.push('monto debe ser mayor que cero')
        if (!paymentDate) rowIssues.push('fechaPago no es valida')
        data = {
          ownerId: text(raw.ownerId), propertyId: text(raw.propertyId) || null, amount: ownerAmount ?? 0,
          paymentDate: paymentDate ?? new Date(0), paymentMethod: text(raw.metodoPago).toUpperCase() || null,
          referenceNumber: text(raw.numeroReferencia) || null, notes: text(raw.notas) || null,
        }
      }

      if (rowIssues.length) {
        issues.push(...rowIssues.map(message => ({ sheet: definition.name, row: rowNumber, message })))
      } else {
        rows.push({ kind: definition.kind, sheet: definition.name, row: rowNumber, data })
      }
    }
  }

  return { rows, issues }
}
