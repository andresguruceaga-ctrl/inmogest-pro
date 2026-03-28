import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

// Use Supabase connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.megswukieallaguhmjbh:inmogest-pro@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
    }
  }
})

async function exportData() {
  console.log('🔄 Exportando datos de Supabase...\n')

  try {
    // Export Users
    const users = await prisma.user.findMany()
    console.log(`✅ Users: ${users.length} registros`)
    fs.writeFileSync('scripts/data-users.json', JSON.stringify(users, null, 2))

    // Export Properties
    const properties = await prisma.property.findMany()
    console.log(`✅ Properties: ${properties.length} registros`)
    fs.writeFileSync('scripts/data-properties.json', JSON.stringify(properties, null, 2))

    // Export Contracts
    const contracts = await prisma.contract.findMany()
    console.log(`✅ Contracts: ${contracts.length} registros`)
    fs.writeFileSync('scripts/data-contracts.json', JSON.stringify(contracts, null, 2))

    // Export Payments
    const payments = await prisma.payment.findMany()
    console.log(`✅ Payments: ${payments.length} registros`)
    fs.writeFileSync('scripts/data-payments.json', JSON.stringify(payments, null, 2))

    // Export Expenses
    const expenses = await prisma.expense.findMany()
    console.log(`✅ Expenses: ${expenses.length} registros`)
    fs.writeFileSync('scripts/data-expenses.json', JSON.stringify(expenses, null, 2))

    // Export Support Tickets
    const tickets = await prisma.supportTicket.findMany()
    console.log(`✅ Support Tickets: ${tickets.length} registros`)
    fs.writeFileSync('scripts/data-tickets.json', JSON.stringify(tickets, null, 2))

    // Export Documents
    const documents = await prisma.document.findMany()
    console.log(`✅ Documents: ${documents.length} registros`)
    fs.writeFileSync('scripts/data-documents.json', JSON.stringify(documents, null, 2))

    // Export Notifications
    const notifications = await prisma.notification.findMany()
    console.log(`✅ Notifications: ${notifications.length} registros`)
    fs.writeFileSync('scripts/data-notifications.json', JSON.stringify(notifications, null, 2))

    // Export Financial Reports
    const reports = await prisma.financialReport.findMany()
    console.log(`✅ Financial Reports: ${reports.length} registros`)
    fs.writeFileSync('scripts/data-reports.json', JSON.stringify(reports, null, 2))

    console.log('\n🎉 Exportación completada!')
    console.log('📁 Archivos guardados en /scripts/')
    
  } catch (error) {
    console.error('❌ Error exportando:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportData()
