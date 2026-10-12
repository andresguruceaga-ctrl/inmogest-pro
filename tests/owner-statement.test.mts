import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOwnerStatements } from '../src/lib/owner-statement.ts'

test('combina gastos y pagos por fecha con signos y balance acumulado', () => {
  const statements = buildOwnerStatements({
    pendingExpenses: [
      { id: 'g2', description: 'Seguro', amount: 40, date: '2026-02-01', category: 'SEGURO', property: { id: 'p1', title: 'PH Uno' } },
      { id: 'g1', description: 'Mantenimiento', amount: 100, date: '2026-01-01', category: 'MANTENIMIENTO_PH', property: { id: 'p1', title: 'PH Uno' } },
    ],
    ownerPayments: [
      { id: 'a1', amount: 75, date: '2026-01-15', method: 'TRANSFERENCIA', property: { id: 'p1', title: 'PH Uno' } },
    ],
  })

  assert.deepEqual(statements[0].movements.map(item => ({ type: item.type, signed: item.signedAmount, balance: item.balance })), [
    { type: 'GASTO', signed: -100, balance: -100 },
    { type: 'PAGO', signed: 75, balance: -25 },
    { type: 'GASTO', signed: -40, balance: -65 },
  ])
  assert.equal(statements[0].balance, -65)
})

test('mantiene estados de cuenta independientes por propiedad', () => {
  const statements = buildOwnerStatements({
    pendingExpenses: [
      { id: 'g1', description: 'Gasto A', amount: 20, date: '2026-01-01', category: 'OTROS', property: { id: 'a', title: 'Propiedad A' } },
      { id: 'g2', description: 'Gasto B', amount: 50, date: '2026-01-01', category: 'OTROS', property: { id: 'b', title: 'Propiedad B' } },
    ],
    ownerPayments: [
      { id: 'p1', amount: 10, date: '2026-01-02', method: null, property: { id: 'a', title: 'Propiedad A' } },
    ],
  })

  assert.deepEqual(statements.map(item => [item.property.id, item.balance]), [['a', -10], ['b', -50]])
})
