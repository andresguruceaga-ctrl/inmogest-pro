export interface ExpenseAmount {
  amount: number
}

export interface PaymentTotal {
  totalAmount: number
}

export function normalizeExpenseAmounts(amount: number) {
  return {
    amount,
    itbmsAmount: 0,
    totalAmount: amount,
  }
}

export function sumExpenseAmounts(expenses: readonly ExpenseAmount[]) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

export function calculateFinancialTotals(
  payments: readonly PaymentTotal[],
  expenses: readonly ExpenseAmount[]
) {
  const grossIncome = payments.reduce((sum, payment) => sum + payment.totalAmount, 0)
  const totalExpenses = sumExpenseAmounts(expenses)

  return {
    grossIncome,
    totalExpenses,
    netIncome: grossIncome - totalExpenses,
    expensesItbms: 0,
  }
}
