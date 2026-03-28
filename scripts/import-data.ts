import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

// Use new Vercel Postgres connection (will be updated with new credentials)
const prisma = new PrismaClient()

async function importData() {
  console.log('🔄 Importando datos a Vercel Postgres...\n')

  try {
    // Import Users first (needed for foreign keys)
    if (fs.existsSync('scripts/data-users.json')) {
      const users = JSON.parse(fs.readFileSync('scripts/data-users.json', 'utf-8'))
      console.log(`📝 Importando ${users.length} usuarios...`)
      for (const user of users) {
        await prisma.user.upsert({
          where: { id: user.id },
          update: user,
          create: user
        })
      }
      console.log('✅ Usuarios importados')
    }

    // Import Properties
    if (fs.existsSync('scripts/data-properties.json')) {
      const properties = JSON.parse(fs.readFileSync('scripts/data-properties.json', 'utf-8'))
      console.log(`📝 Importando ${properties.length} propiedades...`)
      for (const prop of properties) {
        await prisma.property.upsert({
          where: { id: prop.id },
          update: prop,
          create: prop
        })
      }
      console.log('✅ Propiedades importadas')
    }

    // Import Contracts
    if (fs.existsSync('scripts/data-contracts.json')) {
      const contracts = JSON.parse(fs.readFileSync('scripts/data-contracts.json', 'utf-8'))
      console.log(`📝 Importando ${contracts.length} contratos...`)
      for (const contract of contracts) {
        await prisma.contract.upsert({
          where: { id: contract.id },
          update: contract,
          create: contract
        })
      }
      console.log('✅ Contratos importados')
    }

    // Import Payments
    if (fs.existsSync('scripts/data-payments.json')) {
      const payments = JSON.parse(fs.readFileSync('scripts/data-payments.json', 'utf-8'))
      console.log(`📝 Importando ${payments.length} pagos...`)
      for (const payment of payments) {
        await prisma.payment.upsert({
          where: { id: payment.id },
          update: payment,
          create: payment
        })
      }
      console.log('✅ Pagos importados')
    }

    // Import Expenses
    if (fs.existsSync('scripts/data-expenses.json')) {
      const expenses = JSON.parse(fs.readFileSync('scripts/data-expenses.json', 'utf-8'))
      console.log(`📝 Importando ${expenses.length} gastos...`)
      for (const expense of expenses) {
        await prisma.expense.upsert({
          where: { id: expense.id },
          update: expense,
          create: expense
        })
      }
      console.log('✅ Gastos importados')
    }

    // Import Support Tickets
    if (fs.existsSync('scripts/data-tickets.json')) {
      const tickets = JSON.parse(fs.readFileSync('scripts/data-tickets.json', 'utf-8'))
      console.log(`📝 Importando ${tickets.length} tickets...`)
      for (const ticket of tickets) {
        await prisma.supportTicket.upsert({
          where: { id: ticket.id },
          update: ticket,
          create: ticket
        })
      }
      console.log('✅ Tickets importados')
    }

    // Import Documents
    if (fs.existsSync('scripts/data-documents.json')) {
      const documents = JSON.parse(fs.readFileSync('scripts/data-documents.json', 'utf-8'))
      console.log(`📝 Importando ${documents.length} documentos...`)
      for (const doc of documents) {
        await prisma.document.upsert({
          where: { id: doc.id },
          update: doc,
          create: doc
        })
      }
      console.log('✅ Documentos importados')
    }

    // Import Financial Reports
    if (fs.existsSync('scripts/data-reports.json')) {
      const reports = JSON.parse(fs.readFileSync('scripts/data-reports.json', 'utf-8'))
      console.log(`📝 Importando ${reports.length} reportes...`)
      for (const report of reports) {
        await prisma.financialReport.upsert({
          where: { id: report.id },
          update: report,
          create: report
        })
      }
      console.log('✅ Reportes importados')
    }

    console.log('\n🎉 Migración completada exitosamente!')
    
  } catch (error) {
    console.error('❌ Error importando:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importData()
