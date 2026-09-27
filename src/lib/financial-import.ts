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

export interface FinancialWorkbookData {
  expenses: Array<{
    id: string
    propertyId: string
    propertyName: string
    title: string
    description: string | null
    category: string
    expenseType: string
    amount: number
    expenseDate: Date
    invoiceNumber: string | null
    invoiceDate: Date | null
    supplier: string | null
    paidByAdmin: boolean
    reimbursedByOwner: boolean
  }>
  tenantPayments: Array<{
    id: string
    propertyId: string
    propertyName: string
    userId: string
    tenantName: string
    contractId: string | null
    paymentType: string
    amount: number
    referenceNumber: string | null
    paymentMethod: string | null
    status: string
    dueDate: Date
    paidAt: Date | null
  }>
  ownerPayments: Array<{
    id: string
    ownerId: string
    ownerName: string
    propertyId: string | null
    propertyName: string | null
    amount: number
    paymentDate: Date
    paymentMethod: string | null
    referenceNumber: string | null
    notes: string | null
  }>
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

function normalizedText(value: unknown): string {
  return text(value).toUpperCase().replace(/\s+/g, ' ')
}

function normalizedDate(value: unknown): string {
  const date = value instanceof Date ? value : parseExcelDate(value)
  if (!date || Number.isNaN(date.getTime())) return ''
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function normalizedAmount(value: unknown): string {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : ''
}

export function financialImportFingerprint(kind: ImportKind, data: Record<string, unknown>): string {
  const common = [kind, normalizedText(data.propertyId), normalizedAmount(data.amount)]
  if (kind === 'expense') {
    return [...common, normalizedText(data.title), normalizedText(data.category), normalizedText(data.expenseType),
      normalizedDate(data.expenseDate), normalizedText(data.invoiceNumber), normalizedText(data.supplier)].join('|')
  }
  if (kind === 'tenantPayment') {
    return [...common, normalizedText(data.userId), normalizedText(data.contractId), normalizedText(data.paymentType),
      normalizedText(data.referenceNumber), normalizedDate(data.dueDate), normalizedDate(data.paidAt), normalizedText(data.status)].join('|')
  }
  return [...common, normalizedText(data.ownerId), normalizedDate(data.paymentDate), normalizedText(data.paymentMethod),
    normalizedText(data.referenceNumber), normalizedText(data.notes)].join('|')
}

export function financialImportRecordKey(row: ParsedImportRow): string | null {
  const recordId = text(row.data.recordId)
  return recordId ? `${row.kind}|${recordId}` : null
}

export function financialImportReferenceKey(row: ParsedImportRow): string | null {
  const propertyId = text(row.data.propertyId)
  if (row.kind === 'expense' && row.data.invoiceNumber) {
    return `expense-ref|${propertyId}|${text(row.data.invoiceNumber)}`
  }
  if (row.kind === 'tenantPayment' && row.data.referenceNumber) {
    return `tenant-ref|${propertyId}|${text(row.data.userId)}|${text(row.data.referenceNumber)}`
  }
  if (row.kind === 'ownerPayment' && row.data.referenceNumber) {
    return `owner-ref|${text(row.data.ownerId)}|${text(row.data.referenceNumber)}`
  }
  return null
}

export function partitionFinancialImportRows(
  rows: ParsedImportRow[],
  existing: { recordKeys: Set<string>; referenceKeys: Set<string>; fingerprints: Set<string> },
): { newRows: ParsedImportRow[]; skipped: number } {
  const seen = new Set<string>()
  const newRows: ParsedImportRow[] = []
  let skipped = 0

  for (const row of rows) {
    const recordKey = financialImportRecordKey(row)
    const referenceKey = financialImportReferenceKey(row)
    const fingerprint = financialImportFingerprint(row.kind, row.data)
    const keys = [recordKey, referenceKey, fingerprint].filter((value): value is string => Boolean(value))
    if ((recordKey && existing.recordKeys.has(recordKey)) ||
      (referenceKey && existing.referenceKeys.has(referenceKey)) ||
      existing.fingerprints.has(fingerprint) || keys.some(key => seen.has(key))) {
      skipped += 1
      continue
    }
    keys.forEach(key => seen.add(key))
    newRows.push(row)
  }

  return { newRows, skipped }
}

const headerFill = '126B73'
const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } }
const titleFont = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }

function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  instructions: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | Date | null>>,
  widths: number[],
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 4 }] })
  const lastColumn = sheet.getColumn(headers.length).letter
  sheet.mergeCells(`A1:${lastColumn}1`)
  sheet.mergeCells(`A2:${lastColumn}2`)
  sheet.getCell('A1').value = title
  sheet.getCell('A2').value = instructions
  sheet.getCell('A1').font = titleFont
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${headerFill}` } }
  sheet.getCell('A1').alignment = { vertical: 'middle' }
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } }
  sheet.getCell('A2').alignment = { wrapText: true, vertical: 'middle' }
  sheet.getRow(1).height = 28
  sheet.getRow(2).height = 34
  sheet.getRow(4).values = headers
  sheet.getRow(4).font = headerFont
  sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${headerFill}` } }
  sheet.getRow(4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  sheet.getRow(4).height = 30
  rows.forEach(row => sheet.addRow(row))
  sheet.columns.forEach((column, index) => { column.width = widths[index] || 18 })
  sheet.autoFilter = { from: 'A4', to: `${lastColumn}4` }
  for (let row = 5; row <= sheet.rowCount; row += 1) {
    sheet.getRow(row).alignment = { vertical: 'middle' }
    if (row % 2 === 0) sheet.getRow(row).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F8FA' } }
  }
  return sheet
}

export async function buildFinancialWorkbook(data: FinancialWorkbookData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'InmoGest Pro'
  workbook.created = new Date()

  const instructions = workbook.addWorksheet('Instrucciones')
  instructions.columns = [{ width: 22 }, { width: 92 }]
  instructions.mergeCells('A1:B1')
  instructions.getCell('A1').value = 'Plantilla de importación financiera'
  instructions.getCell('A1').font = titleFont
  instructions.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${headerFill}` } }
  instructions.getCell('A1').alignment = { vertical: 'middle' }
  instructions.getRow(1).height = 30
  instructions.getRow(3).values = ['Uso', 'La descarga incluye todos los registros actuales. Agregue los nuevos al final de cada hoja.']
  instructions.getRow(4).values = ['registroId', 'No modifique este valor en filas existentes. Al subir el archivo, esas filas se omiten automáticamente. Déjelo vacío en filas nuevas.']
  instructions.getRow(5).values = ['Importación', 'Primero se valida el archivo. Solo se guardan registros nuevos; los existentes y las filas repetidas se ignoran.']
  instructions.getRow(7).values = ['Hoja', 'Contenido']
  instructions.getRow(7).font = headerFont
  instructions.getRow(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${headerFill}` } }
  instructions.getRow(8).values = ['Gastos', 'Gastos pagados o no por el administrador. Los gastos nunca suman ITBMS.']
  instructions.getRow(9).values = ['Pagos inquilinos', 'Pagos y cuentas por cobrar relacionadas con inquilinos.']
  instructions.getRow(10).values = ['Pagos propietario', 'Abonos del propietario para la relación de gastos.']
  for (let row = 3; row <= 10; row += 1) {
    instructions.getRow(row).alignment = { vertical: 'middle', wrapText: true }
  }
  for (let row = 3; row <= 5; row += 1) {
    instructions.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF123B4A' } }
  }

  const expenseHeaders = ['registroId', 'propertyId', 'propiedad', 'titulo', 'descripcion', 'categoria', 'tipo', 'monto', 'fechaGasto', 'numeroFactura', 'fechaFactura', 'proveedor', 'pagadoPorAdministrador', 'reembolsadoPorPropietario']
  const expenseSheet = addDataSheet(workbook, 'Gastos', 'Gastos', 'Los registros existentes ya tienen registroId y serán ignorados al importar. Para gastos nuevos, deje registroId vacío.', expenseHeaders,
    data.expenses.map(item => [item.id, item.propertyId, item.propertyName, item.title, item.description, item.category, item.expenseType, item.amount, item.expenseDate, item.invoiceNumber, item.invoiceDate, item.supplier, item.paidByAdmin ? 'SI' : 'NO', item.reimbursedByOwner ? 'SI' : 'NO']),
    [28, 28, 30, 28, 38, 23, 14, 15, 16, 21, 16, 25, 25, 28])
  expenseSheet.getColumn('H').numFmt = '"$"#,##0.00'
  expenseSheet.getColumn('I').numFmt = 'dd/mm/yyyy'
  expenseSheet.getColumn('K').numFmt = 'dd/mm/yyyy'

  const tenantHeaders = ['registroId', 'propertyId', 'propiedad', 'userId', 'inquilino', 'contractId', 'tipoPago', 'monto', 'numeroReferencia', 'metodoPago', 'estado', 'fechaVencimiento', 'fechaPago']
  const tenantSheet = addDataSheet(workbook, 'Pagos inquilinos', 'Pagos de inquilinos', 'Los registros existentes ya tienen registroId y serán ignorados al importar. Para pagos nuevos, deje registroId vacío.', tenantHeaders,
    data.tenantPayments.map(item => [item.id, item.propertyId, item.propertyName, item.userId, item.tenantName, item.contractId, item.paymentType, item.amount, item.referenceNumber, item.paymentMethod, item.status, item.dueDate, item.paidAt]),
    [28, 28, 30, 28, 28, 28, 18, 15, 22, 20, 16, 18, 18])
  tenantSheet.getColumn('H').numFmt = '"$"#,##0.00'
  tenantSheet.getColumn('L').numFmt = 'dd/mm/yyyy'
  tenantSheet.getColumn('M').numFmt = 'dd/mm/yyyy'

  const ownerHeaders = ['registroId', 'ownerId', 'propietario', 'propertyId', 'propiedad', 'monto', 'fechaPago', 'metodoPago', 'numeroReferencia', 'notas']
  const ownerSheet = addDataSheet(workbook, 'Pagos propietario', 'Pagos del propietario', 'Los registros existentes ya tienen registroId y serán ignorados al importar. Para pagos nuevos, deje registroId vacío.', ownerHeaders,
    data.ownerPayments.map(item => [item.id, item.ownerId, item.ownerName, item.propertyId, item.propertyName, item.amount, item.paymentDate, item.paymentMethod, item.referenceNumber, item.notes]),
    [28, 28, 28, 28, 30, 15, 18, 20, 22, 40])
  ownerSheet.getColumn('F').numFmt = '"$"#,##0.00'
  ownerSheet.getColumn('G').numFmt = 'dd/mm/yyyy'

  const expenseValidationEnd = Math.max(200, data.expenses.length + 105)
  const tenantValidationEnd = Math.max(200, data.tenantPayments.length + 105)
  for (let row = 5; row <= expenseValidationEnd; row += 1) {
    expenseSheet.getCell(`F${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"MANTENIMIENTO_PH,SEGURO,SERVICIOS_BASICOS,REPARACION,SERVICIO_TECNICO,IMPUESTOS,COMISION_ADMIN,OTROS"'] }
    expenseSheet.getCell(`G${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"FIJO,VARIABLE"'] }
    expenseSheet.getCell(`M${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"SI,NO"'] }
    expenseSheet.getCell(`N${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"SI,NO"'] }
  }
  for (let row = 5; row <= tenantValidationEnd; row += 1) {
    tenantSheet.getCell(`G${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"ALQUILER,DEPOSITO,MANTENIMIENTO,COMISION,OTROS"'] }
    tenantSheet.getCell(`K${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"PENDIENTE,PAGADO,ATRASADO,PARCIAL,CANCELADO"'] }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
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
          recordId: text(raw.registroId) || null, propertyId: text(raw.propertyId), title: text(raw.titulo), description: text(raw.descripcion) || null,
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
          recordId: text(raw.registroId) || null, propertyId: text(raw.propertyId), userId: text(raw.userId), paymentType: text(raw.tipoPago).toUpperCase(),
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
          recordId: text(raw.registroId) || null, ownerId: text(raw.ownerId), propertyId: text(raw.propertyId) || null, amount: ownerAmount ?? 0,
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
