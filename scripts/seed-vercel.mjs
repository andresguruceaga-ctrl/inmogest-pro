import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const adminEmail = process.env.DEMO_ADMIN_EMAIL || 'demo@inmogest.pro'
const adminPassword = process.env.DEMO_ADMIN_PASSWORD

if (!adminPassword) {
  console.log('Demo seed skipped: DEMO_ADMIN_PASSWORD is not configured.')
  await prisma.$disconnect()
  process.exit(0)
}

const passwordHash = await bcrypt.hash(adminPassword, 12)

async function upsertUser(email, name, role, phone) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, phone, isActive: true },
    create: { email, name, role, phone, isActive: true, password: passwordHash },
  })
}

async function upsertProperty(fincaNumber, data) {
  const existing = await prisma.property.findFirst({ where: { fincaNumber } })
  if (existing) {
    return prisma.property.update({ where: { id: existing.id }, data })
  }
  return prisma.property.create({ data: { ...data, fincaNumber } })
}

async function main() {
  const admin = await upsertUser(adminEmail, 'Administrador de Pruebas', 'ADMIN', '+507 6000-0001')
  const owner1 = await upsertUser('propietario.colores@inmogest.pro', 'Propietario Colores', 'PROPIETARIO', '+507 6000-0002')
  const owner2 = await upsertUser('propietario.quartier@inmogest.pro', 'Propietario Quartier', 'PROPIETARIO', '+507 6000-0003')
  const tenant1 = await upsertUser('inquilino.colores@inmogest.pro', 'Inquilino Colores', 'INQUILINO', '+507 6000-0004')
  const tenant2 = await upsertUser('inquilino.quartier@inmogest.pro', 'Inquilino Quartier', 'INQUILINO', '+507 6000-0005')

  const colores = await upsertProperty('DEMO-COLORES-001', {
    title: 'Colores de Bella Vista',
    description: 'Apartamento de demostración para validar contratos, pagos, gastos y reportes.',
    propertyType: 'APARTAMENTO', province: 'Panamá', district: 'Panamá',
    corregimiento: 'Bella Vista', neighborhood: 'Bella Vista',
    address: 'PH Colores de Bella Vista, apartamento de prueba', buildingName: 'Colores de Bella Vista',
    totalArea: 105, builtArea: 95, bedrooms: 2, bathrooms: 2, parkingSpaces: 1,
    floorNumber: 8, monthlyRent: 1450, itbmsRate: 0, depositAmount: 1450,
    status: 'OCUPADA', ownerId: owner1.id, adminId: admin.id, tenantId: tenant1.id,
  })

  const quartier = await upsertProperty('DEMO-QUARTIER-001', {
    title: 'PH Quartier',
    description: 'Apartamento de demostración para validar la automatización mensual y la relación de gastos.',
    propertyType: 'APARTAMENTO', province: 'Panamá', district: 'Panamá',
    corregimiento: 'San Francisco', neighborhood: 'San Francisco',
    address: 'PH Quartier, apartamento de prueba', buildingName: 'PH Quartier',
    totalArea: 125, builtArea: 112, bedrooms: 3, bathrooms: 2, parkingSpaces: 2,
    floorNumber: 12, monthlyRent: 1850, itbmsRate: 0, depositAmount: 1850,
    status: 'OCUPADA', ownerId: owner2.id, adminId: admin.id, tenantId: tenant2.id,
  })

  const contract1 = await prisma.contract.upsert({
    where: { contractNumber: 'DEMO-COLORES-2026' },
    update: { propertyId: colores.id, ownerId: owner1.id, tenantId: tenant1.id, monthlyAmount: 1450, itbmsAmount: 0 },
    create: { contractNumber: 'DEMO-COLORES-2026', contractType: 'ARRENDAMIENTO', startDate: new Date('2026-01-01'), endDate: new Date('2027-12-31'), monthlyAmount: 1450, itbmsAmount: 0, depositAmount: 1450, terms: 'Contrato de demostración para revisar su presentación en reportes.', status: 'VIGENTE', propertyId: colores.id, ownerId: owner1.id, tenantId: tenant1.id },
  })
  const contract2 = await prisma.contract.upsert({
    where: { contractNumber: 'DEMO-QUARTIER-2026' },
    update: { propertyId: quartier.id, ownerId: owner2.id, tenantId: tenant2.id, monthlyAmount: 1850, itbmsAmount: 0 },
    create: { contractNumber: 'DEMO-QUARTIER-2026', contractType: 'ARRENDAMIENTO', startDate: new Date('2026-02-01'), endDate: new Date('2027-12-31'), monthlyAmount: 1850, itbmsAmount: 0, depositAmount: 1850, terms: 'Contrato de demostración para validar impresión y PDF.', status: 'VIGENTE', propertyId: quartier.id, ownerId: owner2.id, tenantId: tenant2.id },
  })

  const recurring = [
    { propertyId: colores.id, title: 'Cuota de mantenimiento', category: 'MANTENIMIENTO_PH', amount: 185, paidByAdmin: true },
    { propertyId: colores.id, title: 'Seguro mensual', category: 'SEGURO', amount: 42, paidByAdmin: false },
    { propertyId: quartier.id, title: 'Cuota de mantenimiento', category: 'MANTENIMIENTO_PH', amount: 225, paidByAdmin: true },
    { propertyId: quartier.id, title: 'Administración', category: 'COMISION_ADMIN', amount: 185, paidByAdmin: false },
  ]
  for (const item of recurring) {
    const found = await prisma.recurringExpense.findFirst({ where: { propertyId: item.propertyId, title: item.title } })
    if (found) await prisma.recurringExpense.update({ where: { id: found.id }, data: { ...item, isActive: true } })
    else await prisma.recurringExpense.create({ data: item })
  }

  const month = new Date().toISOString().slice(0, 7)
  const dueDate = new Date(`${month}-07T12:00:00.000Z`)
  const paidDate = new Date(`${month}-05T12:00:00.000Z`)
  const expenseDate = new Date(`${month}-10T12:00:00.000Z`)

  await prisma.payment.upsert({
    where: { automationKey: `demo:${month}:colores:rent` },
    update: {},
    create: { automationKey: `demo:${month}:colores:rent`, paymentType: 'ALQUILER', amount: 1450, itbmsAmount: 0, totalAmount: 1450, status: 'PAGADO', paidAt: paidDate, dueDate, paymentMethod: 'TRANSFERENCIA', referenceNumber: `DEMO-COL-${month}`, propertyId: colores.id, userId: tenant1.id, contractId: contract1.id },
  })
  await prisma.payment.upsert({
    where: { automationKey: `demo:${month}:quartier:rent` },
    update: {},
    create: { automationKey: `demo:${month}:quartier:rent`, paymentType: 'ALQUILER', amount: 1850, itbmsAmount: 0, totalAmount: 1850, status: 'PENDIENTE', dueDate, propertyId: quartier.id, userId: tenant2.id, contractId: contract2.id },
  })
  await prisma.expense.upsert({
    where: { automationKey: `demo:${month}:colores:repair` },
    update: {},
    create: { automationKey: `demo:${month}:colores:repair`, title: 'Reparación de aire acondicionado', category: 'REPARACION', expenseType: 'VARIABLE', amount: 160, itbmsAmount: 0, totalAmount: 160, expenseDate, paidByAdmin: true, reimbursedByOwner: false, propertyId: colores.id },
  })
  await prisma.expense.upsert({
    where: { automationKey: `demo:${month}:quartier:service` },
    update: {},
    create: { automationKey: `demo:${month}:quartier:service`, title: 'Limpieza profunda', category: 'SERVICIOS_BASICOS', expenseType: 'VARIABLE', amount: 95, itbmsAmount: 0, totalAmount: 95, expenseDate, paidByAdmin: false, reimbursedByOwner: false, propertyId: quartier.id },
  })

  console.log('Demo data ready: 1 administrator and 2 properties.')
}

try {
  await main()
} finally {
  await prisma.$disconnect()
}
