-- Plantillas de gastos fijos configuradas por propiedad.
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Expense"
ADD COLUMN "recurringExpenseId" TEXT,
ADD COLUMN "automationKey" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "automationKey" TEXT;

CREATE UNIQUE INDEX "Expense_automationKey_key" ON "Expense"("automationKey");
CREATE UNIQUE INDEX "Payment_automationKey_key" ON "Payment"("automationKey");
CREATE INDEX "Expense_recurringExpenseId_idx" ON "Expense"("recurringExpenseId");
CREATE INDEX "RecurringExpense_propertyId_idx" ON "RecurringExpense"("propertyId");
CREATE INDEX "RecurringExpense_isActive_idx" ON "RecurringExpense"("isActive");

ALTER TABLE "RecurringExpense"
ADD CONSTRAINT "RecurringExpense_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_recurringExpenseId_fkey"
FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
