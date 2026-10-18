import type { PrismaClient, TicketPriority } from '@prisma/client'

export type ResponsibleParty = 'INQUILINO' | 'PROPIETARIO' | 'ADMINISTRADOR'

export interface RecurringSupportInput {
  title: string
  description?: string
  category?: string
  priority?: TicketPriority
  responsibleParty: ResponsibleParty
  frequencyMonths: number
  firstDate: string
}

export interface ContractBackfillResult {
  expensesCreated: number
  paymentsCreated: number
  paymentsUpdated: number
  supportTicketsCreated: number
}

function fixedExpenseAutomationKey(recurringExpenseId: string, period: string) {
  return `fixed-expense:${recurringExpenseId}:${period}`
}

function tenantPaymentAutomationKey(contractId: string, period: string) {
  return `tenant-rent:${contractId}:${period}`
}

function atUtcNoon(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12))
}

function monthPeriod(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthsBetween(start: Date, end: Date) {
  const months: Date[] = []
  let year = start.getUTCFullYear()
  let month = start.getUTCMonth()
  const lastYear = end.getUTCFullYear()
  const lastMonth = end.getUTCMonth()

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    months.push(atUtcNoon(year, month, 1))
    month += 1
    if (month === 12) {
      month = 0
      year += 1
    }
  }

  return months
}

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function dateInMonth(month: Date, day: number) {
  return atUtcNoon(
    month.getUTCFullYear(),
    month.getUTCMonth(),
    Math.min(day, daysInUtcMonth(month.getUTCFullYear(), month.getUTCMonth()))
  )
}

function endOfUtcMonth(month: Date) {
  return dateInMonth(month, daysInUtcMonth(month.getUTCFullYear(), month.getUTCMonth()))
}

export function parseRecurringSupports(value: string | null | undefined): RecurringSupportInput[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(item =>
      item && typeof item.title === 'string' && item.title.trim() &&
      ['INQUILINO', 'PROPIETARIO', 'ADMINISTRADOR'].includes(item.responsibleParty) &&
      Number.isInteger(item.frequencyMonths) && item.frequencyMonths > 0 &&
      typeof item.firstDate === 'string'
    )
  } catch {
    return []
  }
}

export function isMonthOnSchedule(firstDate: Date, frequencyMonths: number, month: Date) {
  const elapsed = (month.getUTCFullYear() - firstDate.getUTCFullYear()) * 12
    + month.getUTCMonth() - firstDate.getUTCMonth()
  return elapsed >= 0 && elapsed % frequencyMonths === 0
}

export function recurringSupportAutomationKey(contractId: string, index: number, period: string) {
  return `contract-support:${contractId}:${index}:${period}`
}

export function recurringSupportDueDates(
  firstDate: Date,
  frequencyMonths: number,
  contractStart: Date,
  contractEnd: Date
) {
  if (Number.isNaN(firstDate.getTime()) || frequencyMonths < 1 || contractStart > contractEnd) return []

  return monthsBetween(firstDate, contractEnd)
    .filter((month, index) => (index + 1) % frequencyMonths === 0)
    .map(endOfUtcMonth)
    .filter(dueDate => dueDate >= contractStart && dueDate <= contractEnd)
}

export async function backfillContractRecords(
  prisma: PrismaClient,
  contractId: string,
  now = new Date()
): Promise<ContractBackfillResult> {
  const result: ContractBackfillResult = {
    expensesCreated: 0,
    paymentsCreated: 0,
    paymentsUpdated: 0,
    supportTicketsCreated: 0,
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      property: { include: { recurringExpenses: { where: { isActive: true } } } },
    },
  })
  if (!contract) return result

  const rangeEnd = new Date(Math.min(contract.endDate.getTime(), now.getTime()))
  const months = contract.startDate <= rangeEnd
    ? monthsBetween(contract.startDate, rangeEnd)
    : []

  const paymentUserId = contract.contractType === 'ARRENDAMIENTO'
    ? contract.tenantId
    : contract.ownerId
  if (paymentUserId) {
    for (const month of months) {
      const period = monthPeriod(month)
      const dueDate = dateInMonth(month, 7)
      const automationKey = tenantPaymentAutomationKey(contract.id, period)
      const existing = await prisma.payment.findUnique({ where: { automationKey } })
      const paymentType = contract.contractType === 'ARRENDAMIENTO' ? 'ALQUILER' : 'COMISION'
      const status = dueDate < now ? 'ATRASADO' : 'PENDIENTE'

      if (!existing) {
        await prisma.payment.create({
          data: {
            paymentType,
            amount: contract.monthlyAmount,
            itbmsAmount: 0,
            totalAmount: contract.monthlyAmount,
            status,
            dueDate,
            propertyId: contract.propertyId,
            userId: paymentUserId,
            contractId: contract.id,
            automationKey,
          },
        })
        result.paymentsCreated += 1
      } else if (existing.status === 'PENDIENTE' || existing.status === 'ATRASADO') {
        await prisma.payment.update({
          where: { id: existing.id },
          data: {
            paymentType,
            amount: contract.monthlyAmount,
            totalAmount: contract.monthlyAmount,
            dueDate,
            status,
            userId: paymentUserId,
          },
        })
        result.paymentsUpdated += 1
      }
    }
  }

  for (const recurring of contract.property.recurringExpenses) {
    const recurringStart = recurring.startsAt || contract.startDate
    for (const month of months) {
      if (!isMonthOnSchedule(recurringStart, recurring.frequencyMonths, month)) continue
      const expenseDate = dateInMonth(month, 1)
      if (
        endOfUtcMonth(month) < recurringStart ||
        (recurring.endsAt && expenseDate > recurring.endsAt)
      ) continue
      if (expenseDate > now) continue
      const automationKey = fixedExpenseAutomationKey(recurring.id, monthPeriod(month))
      const existing = await prisma.expense.findUnique({ where: { automationKey } })
      if (existing) continue
      await prisma.expense.create({
        data: {
          title: recurring.title,
          description: recurring.description,
          category: recurring.category,
          expenseType: 'FIJO',
          amount: recurring.amount,
          itbmsAmount: 0,
          totalAmount: recurring.amount,
          expenseDate,
          paidByAdmin: recurring.paidByAdmin,
          reimbursedByOwner: false,
          propertyId: contract.propertyId,
          recurringExpenseId: recurring.id,
          automationKey,
        },
      })
      result.expensesCreated += 1
    }
  }

  const supports = parseRecurringSupports(contract.recurringSupports)
  for (const [index, support] of supports.entries()) {
    const firstDate = new Date(`${support.firstDate}T12:00:00.000Z`)
    if (Number.isNaN(firstDate.getTime())) continue
    const responsibleUserId = support.responsibleParty === 'INQUILINO'
      ? contract.tenantId
      : support.responsibleParty === 'PROPIETARIO'
        ? contract.ownerId
        : contract.property.adminId
    if (!responsibleUserId) continue

    const dueDates = recurringSupportDueDates(
      firstDate,
      support.frequencyMonths,
      contract.startDate,
      contract.endDate
    )
    for (const dueDate of dueDates) {
      const automationKey = recurringSupportAutomationKey(contract.id, index, monthPeriod(dueDate))
      const existing = await prisma.supportTicket.findFirst({ where: { automationKey } })
      if (existing) continue
      await prisma.supportTicket.create({
        data: {
          title: support.title,
          description: support.description?.trim() || `Soporte recurrente del contrato ${contract.contractNumber}`,
          category: support.category?.trim() || 'Mantenimiento recurrente',
          priority: support.priority || 'MEDIA',
          status: 'ABIERTO',
          dueDate,
          contractId: contract.id,
          automationKey,
          propertyId: contract.propertyId,
          userId: responsibleUserId,
        },
      })
      result.supportTicketsCreated += 1
    }
  }

  return result
}
