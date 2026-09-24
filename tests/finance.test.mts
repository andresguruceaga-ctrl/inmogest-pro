import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateFinancialTotals,
  normalizeExpenseAmounts,
  sumExpenseAmounts,
} from '../src/lib/finance.ts'

test('un gasto nunca agrega ITBMS', () => {
  assert.deepEqual(normalizeExpenseAmounts(125.5), {
    amount: 125.5,
    itbmsAmount: 0,
    totalAmount: 125.5,
  })
})

test('los totales ignoran ITBMS historico almacenado', () => {
  const expenses = [
    { amount: 100, itbmsAmount: 7, totalAmount: 107 },
    { amount: 50, itbmsAmount: 3.5, totalAmount: 53.5 },
  ]

  assert.equal(sumExpenseAmounts(expenses), 150)
})

test('el reporte financiero resta solo el importe base de los gastos', () => {
  const totals = calculateFinancialTotals(
    [{ totalAmount: 1000 }, { totalAmount: 500 }],
    [
      { amount: 200, itbmsAmount: 14, totalAmount: 214 },
      { amount: 100, itbmsAmount: 7, totalAmount: 107 },
    ]
  )

  assert.deepEqual(totals, {
    grossIncome: 1500,
    totalExpenses: 300,
    netIncome: 1200,
    expensesItbms: 0,
  })
})
