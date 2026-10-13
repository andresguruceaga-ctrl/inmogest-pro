import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fixedExpenseAutomationKey,
  isRecurringExpenseActiveForPeriod,
  isRecurringExpenseDue,
  monthlyAutomationDates,
  runMonthlyAutomation,
  tenantPaymentAutomationKey,
} from '../src/lib/monthly-automation.ts'
import type { PrismaClient } from '@prisma/client'

test('programa el alquiler para el día 7 y el gasto fijo para el día 30', () => {
  const dates = monthlyAutomationDates(new Date('2026-10-30T15:00:00.000Z'))

  assert.equal(dates.period, '2026-10')
  assert.equal(dates.tenantPaymentDueDate.toISOString().slice(0, 10), '2026-10-07')
  assert.equal(dates.fixedExpenseDate.toISOString().slice(0, 10), '2026-10-30')
  assert.equal(dates.canCreateFixedExpenses, true)
})

test('en febrero usa el último día disponible', () => {
  const beforeClosing = monthlyAutomationDates(new Date('2028-02-28T15:00:00.000Z'))
  const atClosing = monthlyAutomationDates(new Date('2028-02-29T15:00:00.000Z'))

  assert.equal(beforeClosing.fixedExpenseDate.toISOString().slice(0, 10), '2028-02-29')
  assert.equal(beforeClosing.canCreateFixedExpenses, false)
  assert.equal(atClosing.canCreateFixedExpenses, true)
})

test('las claves mensuales impiden duplicar cada registro automático', () => {
  assert.equal(
    fixedExpenseAutomationKey('expense-template-1', '2026-10'),
    'fixed-expense:expense-template-1:2026-10'
  )
  assert.equal(
    tenantPaymentAutomationKey('contract-1', '2026-10'),
    'tenant-rent:contract-1:2026-10'
  )
})

test('respeta frecuencias mensuales, trimestrales, cuatrimestrales, semestrales y anuales', () => {
  const createdAt = new Date('2026-01-15T15:00:00.000Z')

  assert.equal(isRecurringExpenseDue(createdAt, 1, { year: 2026, month: 2 }), true)
  assert.equal(isRecurringExpenseDue(createdAt, 3, { year: 2026, month: 4 }), true)
  assert.equal(isRecurringExpenseDue(createdAt, 4, { year: 2026, month: 5 }), true)
  assert.equal(isRecurringExpenseDue(createdAt, 6, { year: 2026, month: 7 }), true)
  assert.equal(isRecurringExpenseDue(createdAt, 12, { year: 2027, month: 1 }), true)
  assert.equal(isRecurringExpenseDue(createdAt, 3, { year: 2026, month: 3 }), false)
})

test('respeta las fechas de inicio y finalización de un gasto recurrente', () => {
  const start = new Date('2026-03-01T12:00:00.000Z')
  const end = new Date('2026-08-31T23:59:59.999Z')

  assert.equal(isRecurringExpenseActiveForPeriod(start, end, new Date('2026-02-01T12:00:00.000Z'), new Date('2026-02-28T12:00:00.000Z')), false)
  assert.equal(isRecurringExpenseActiveForPeriod(start, end, new Date('2026-08-01T12:00:00.000Z'), new Date('2026-08-31T12:00:00.000Z')), true)
  assert.equal(isRecurringExpenseActiveForPeriod(start, end, new Date('2026-09-01T12:00:00.000Z'), new Date('2026-09-30T12:00:00.000Z')), false)
})

test('una segunda ejecución no duplica gastos ni pagos', async () => {
  const paymentKeys = new Set<string>()
  const expenseKeys = new Set<string>()
  const fakePrisma = {
    contract: {
      findMany: async () => [{
        id: 'contract-1',
        contractNumber: 'ARR-1',
        monthlyAmount: 1200,
        propertyId: 'property-1',
        tenantId: 'tenant-1',
      }],
    },
    payment: {
      findMany: async ({ where }: { where: { automationKey: { in: string[] } } }) =>
        where.automationKey.in.filter(key => paymentKeys.has(key)).map(automationKey => ({ automationKey })),
      create: async ({ data }: { data: { automationKey: string } }) => {
        paymentKeys.add(data.automationKey)
        return data
      },
    },
    recurringExpense: {
      findMany: async () => [{
        id: 'recurring-1',
        title: 'Mantenimiento',
        description: null,
        category: 'MANTENIMIENTO_PH',
        amount: 150,
        frequencyMonths: 1,
        paidByAdmin: true,
        propertyId: 'property-1',
        createdAt: new Date('2026-10-01T15:00:00.000Z'),
      }],
    },
    expense: {
      findMany: async ({ where }: { where: { automationKey: { in: string[] } } }) =>
        where.automationKey.in.filter(key => expenseKeys.has(key)).map(automationKey => ({ automationKey })),
      create: async ({ data }: { data: { automationKey: string } }) => {
        expenseKeys.add(data.automationKey)
        return data
      },
    },
  } as unknown as PrismaClient

  const first = await runMonthlyAutomation(fakePrisma, new Date('2026-10-30T15:00:00.000Z'))
  const second = await runMonthlyAutomation(fakePrisma, new Date('2026-10-30T15:00:00.000Z'))

  assert.deepEqual(
    { expenses: first.fixedExpensesCreated, payments: first.tenantPaymentsCreated },
    { expenses: 1, payments: 1 }
  )
  assert.deepEqual(
    { expenses: second.fixedExpensesCreated, payments: second.tenantPaymentsCreated },
    { expenses: 0, payments: 0 }
  )
})
