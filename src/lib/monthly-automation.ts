import type { PrismaClient } from '@prisma/client'

const PANAMA_TIME_ZONE = 'America/Panama'

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export interface MonthlyAutomationResult {
  period: string
  fixedExpensesCreated: number
  tenantPaymentsCreated: number
  fixedExpensesPendingUntil: string | null
}

function datePartsInPanama(now: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value)

  return { year: value('year'), month: value('month'), day: value('day') }
}

function utcCalendarDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function monthlyAutomationDates(now = new Date()) {
  const current = datePartsInPanama(now)
  const expenseDay = Math.min(30, daysInMonth(current.year, current.month))

  return {
    current,
    period: `${current.year}-${String(current.month).padStart(2, '0')}`,
    monthStart: utcCalendarDate(current.year, current.month, 1),
    monthEnd: utcCalendarDate(current.year, current.month, daysInMonth(current.year, current.month)),
    tenantPaymentDueDate: utcCalendarDate(current.year, current.month, 7),
    fixedExpenseDate: utcCalendarDate(current.year, current.month, expenseDay),
    canCreateFixedExpenses: current.day >= expenseDay,
  }
}

export function fixedExpenseAutomationKey(recurringExpenseId: string, period: string) {
  return `fixed-expense:${recurringExpenseId}:${period}`
}

export function tenantPaymentAutomationKey(contractId: string, period: string) {
  return `tenant-rent:${contractId}:${period}`
}

export async function runMonthlyAutomation(
  prisma: PrismaClient,
  now = new Date()
): Promise<MonthlyAutomationResult> {
  const dates = monthlyAutomationDates(now)
  let fixedExpensesCreated = 0
  let tenantPaymentsCreated = 0

  const contracts = await prisma.contract.findMany({
    where: {
      contractType: 'ARRENDAMIENTO',
      status: 'VIGENTE',
      tenantId: { not: null },
      startDate: { lte: dates.monthEnd },
      endDate: { gte: dates.monthStart },
      property: { isActive: true },
    },
    select: {
      id: true,
      contractNumber: true,
      monthlyAmount: true,
      propertyId: true,
      tenantId: true,
    },
  })

  const paymentKeys = contracts.map(contract =>
    tenantPaymentAutomationKey(contract.id, dates.period)
  )
  const existingPayments = paymentKeys.length
    ? await prisma.payment.findMany({
        where: { automationKey: { in: paymentKeys } },
        select: { automationKey: true },
      })
    : []
  const existingPaymentKeys = new Set(existingPayments.map(payment => payment.automationKey))

  for (const contract of contracts) {
    if (!contract.tenantId) continue
    const automationKey = tenantPaymentAutomationKey(contract.id, dates.period)
    if (existingPaymentKeys.has(automationKey)) continue

    await prisma.payment.create({
      data: {
        paymentType: 'ALQUILER',
        amount: contract.monthlyAmount,
        itbmsAmount: 0,
        totalAmount: contract.monthlyAmount,
        referenceNumber: null,
        paymentMethod: null,
        status: 'PENDIENTE',
        paidAt: null,
        dueDate: dates.tenantPaymentDueDate,
        receiptImage: null,
        propertyId: contract.propertyId,
        userId: contract.tenantId,
        contractId: contract.id,
        automationKey,
      },
    })
    tenantPaymentsCreated += 1
  }

  if (dates.canCreateFixedExpenses) {
    const recurringExpenses = await prisma.recurringExpense.findMany({
      where: { isActive: true, property: { isActive: true } },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        amount: true,
        paidByAdmin: true,
        propertyId: true,
      },
    })
    const expenseKeys = recurringExpenses.map(expense =>
      fixedExpenseAutomationKey(expense.id, dates.period)
    )
    const existingExpenses = expenseKeys.length
      ? await prisma.expense.findMany({
          where: { automationKey: { in: expenseKeys } },
          select: { automationKey: true },
        })
      : []
    const existingExpenseKeys = new Set(existingExpenses.map(expense => expense.automationKey))

    for (const recurring of recurringExpenses) {
      const automationKey = fixedExpenseAutomationKey(recurring.id, dates.period)
      if (existingExpenseKeys.has(automationKey)) continue

      await prisma.expense.create({
        data: {
          title: recurring.title,
          description: recurring.description,
          category: recurring.category,
          expenseType: 'FIJO',
          amount: recurring.amount,
          itbmsAmount: 0,
          totalAmount: recurring.amount,
          invoiceNumber: null,
          invoiceDate: null,
          supplier: null,
          invoiceImage: null,
          workEvidence: null,
          expenseDate: dates.fixedExpenseDate,
          paidByAdmin: recurring.paidByAdmin,
          reimbursedByOwner: false,
          reimbursedAt: null,
          propertyId: recurring.propertyId,
          recurringExpenseId: recurring.id,
          automationKey,
        },
      })
      fixedExpensesCreated += 1
    }
  }

  return {
    period: dates.period,
    fixedExpensesCreated,
    tenantPaymentsCreated,
    fixedExpensesPendingUntil: dates.canCreateFixedExpenses
      ? null
      : dates.fixedExpenseDate.toISOString().slice(0, 10),
  }
}
