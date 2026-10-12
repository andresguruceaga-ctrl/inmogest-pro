ALTER TABLE "Contract" ADD COLUMN "recurringSupports" TEXT;

ALTER TABLE "SupportTicket" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN "contractId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "automationKey" TEXT;

CREATE INDEX "SupportTicket_automationKey_idx" ON "SupportTicket"("automationKey");
CREATE INDEX "SupportTicket_contractId_idx" ON "SupportTicket"("contractId");
CREATE INDEX "SupportTicket_dueDate_idx" ON "SupportTicket"("dueDate");
