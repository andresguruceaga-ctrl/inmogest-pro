import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ExcelJS from 'exceljs'
import { parseExcelDate, parseFinancialWorkbook, parseImportBoolean } from '../src/lib/financial-import.ts'

test('normaliza fechas de Excel y valores SI/NO', () => {
  const date = parseExcelDate('31/08/2026')
  assert.deepEqual(date && [date.getFullYear(), date.getMonth() + 1, date.getDate()], [2026, 8, 31])
  assert.equal(parseExcelDate('31/02/2026'), null)
  assert.equal(parseImportBoolean('Sí'), true)
  assert.equal(parseImportBoolean('NO'), false)
  assert.equal(parseImportBoolean('quizá'), null)
})

test('analiza las tres hojas financieras sin sumar ITBMS', async () => {
  const workbook = new ExcelJS.Workbook()
  const sheets = [
    {
      name: 'Gastos',
      headers: ['propertyId', 'titulo', 'descripcion', 'categoria', 'tipo', 'monto', 'fechaGasto', 'numeroFactura', 'fechaFactura', 'proveedor', 'pagadoPorAdministrador', 'reembolsadoPorPropietario'],
      values: ['prop-1', 'Plomería', '', 'REPARACION', 'VARIABLE', 125, '31/08/2026', 'FAC-10', '', 'Proveedor', 'SI', 'NO'],
    },
    {
      name: 'Pagos inquilinos',
      headers: ['propertyId', 'userId', 'contractId', 'tipoPago', 'monto', 'numeroReferencia', 'metodoPago', 'estado', 'fechaVencimiento', 'fechaPago'],
      values: ['prop-1', 'tenant-1', 'contract-1', 'ALQUILER', 900, 'TRX-20', 'TRANSFERENCIA', 'PAGADO', '01/08/2026', '01/08/2026'],
    },
    {
      name: 'Pagos propietario',
      headers: ['ownerId', 'propertyId', 'monto', 'fechaPago', 'metodoPago', 'numeroReferencia', 'notas'],
      values: ['owner-1', 'prop-1', 125, '31/08/2026', 'TRANSFERENCIA', 'OWN-30', 'Reembolso'],
    },
  ]

  for (const definition of sheets) {
    const sheet = workbook.addWorksheet(definition.name)
    sheet.getRow(4).values = definition.headers
    sheet.getRow(5).values = definition.values
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const result = await parseFinancialWorkbook(buffer)

  assert.deepEqual(result.issues, [])
  assert.equal(result.rows.length, 3)
  assert.equal(result.rows[0].kind, 'expense')
  assert.equal(result.rows[0].data.amount, 125)
  assert.equal(result.rows[0].data.paidByAdmin, true)
  assert.equal('itbmsAmount' in result.rows[0].data, false)
})

test('la plantilla publicada es compatible con el importador', async () => {
  const file = new URL('../public/plantillas/plantilla-importacion-financiera.xlsx', import.meta.url)
  const result = await parseFinancialWorkbook(await readFile(file))

  assert.deepEqual(result, { rows: [], issues: [] })
})
