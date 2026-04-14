import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos de prueba conocidos (agrega más si es necesario)
const TEST_EMAILS = [
  'maria@email.com',
  'test@test.com',
  'demo@demo.com',
  'admin@inmogest.pa',
  'juan.perez@email.com',
  'pedro.gonzalez@email.com',
]

const TEST_PROPERTY_NAMES = [
  'Apartamento Vista Mar',
  'Local Comercial El Dorado',
  'PH Costa del Este',
  'Apartamento Bella Vista',
  'Local Comercial',
]

async function main() {
  console.log('\n========================================')
  console.log('  LIMPIEZA DE DATOS DE PRUEBA')
  console.log('========================================\n')

  // Mostrar datos actuales
  console.log('📊 ESTADO ACTUAL:')
  console.log('-----------------')

  const usersCount = await prisma.user.count()
  const propertiesCount = await prisma.property.count()
  const expensesCount = await prisma.expense.count()
  const contractsCount = await prisma.contract.count()
  const paymentsCount = await prisma.payment.count()
  const ticketsCount = await prisma.supportTicket.count()

  console.log(`   Usuarios: ${usersCount}`)
  console.log(`   Propiedades: ${propertiesCount}`)
  console.log(`   Gastos: ${expensesCount}`)
  console.log(`   Contratos: ${contractsCount}`)
  console.log(`   Pagos: ${paymentsCount}`)
  console.log(`   Tickets: ${ticketsCount}`)
  console.log('')

  // Encontrar usuarios de prueba
  console.log('🔍 BUSCANDO USUARIOS DE PRUEBA:')
  console.log('------------------------------')

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: TEST_EMAILS } },
        { email: { contains: 'test' } },
        { email: { contains: 'demo' } },
        { email: { contains: '@example.com' } },
      ]
    }
  })

  if (testUsers.length === 0) {
    console.log('   ✅ No se encontraron usuarios de prueba')
  } else {
    console.log(`   ⚠️ Se encontraron ${testUsers.length} usuarios de prueba:`)
    testUsers.forEach(user => {
      console.log(`      - ${user.name} (${user.email}) - Rol: ${user.role}`)
    })
  }
  console.log('')

  // Encontrar propiedades de prueba
  console.log('🔍 BUSCANDO PROPIEDADES DE PRUEBA:')
  console.log('----------------------------------')

  const testProperties = await prisma.property.findMany({
    where: {
      OR: [
        { title: { in: TEST_PROPERTY_NAMES } },
        { title: { contains: 'Prueba' } },
        { title: { contains: 'Test' } },
        { title: { contains: 'Demo' } },
      ]
    },
    include: {
      owner: { select: { name: true, email: true } }
    }
  })

  if (testProperties.length === 0) {
    console.log('   ✅ No se encontraron propiedades de prueba')
  } else {
    console.log(`   ⚠️ Se encontraron ${testProperties.length} propiedades de prueba:`)
    testProperties.forEach(prop => {
      console.log(`      - ${prop.title} (Propietario: ${prop.owner?.name || 'N/A'})`)
    })
  }
  console.log('')

  // Verificar si se pasó el argumento --delete
  const args = process.argv.slice(2)

  if (args.includes('--delete')) {
    console.log('\n🗑️ ELIMINANDO DATOS DE PRUEBA...')
    console.log('--------------------------------\n')

    // Eliminar datos relacionados a propiedades de prueba
    if (testProperties.length > 0) {
      const testPropertyIds = testProperties.map(p => p.id)

      const deletedExpenses = await prisma.expense.deleteMany({
        where: { propertyId: { in: testPropertyIds } }
      })
      console.log(`   ✅ Eliminados ${deletedExpenses.count} gastos`)

      const deletedPayments = await prisma.payment.deleteMany({
        where: { propertyId: { in: testPropertyIds } }
      })
      console.log(`   ✅ Eliminados ${deletedPayments.count} pagos`)

      const deletedTickets = await prisma.supportTicket.deleteMany({
        where: { propertyId: { in: testPropertyIds } }
      })
      console.log(`   ✅ Eliminados ${deletedTickets.count} tickets`)

      const deletedContracts = await prisma.contract.deleteMany({
        where: { propertyId: { in: testPropertyIds } }
      })
      console.log(`   ✅ Eliminados ${deletedContracts.count} contratos`)

      const deletedDocs = await prisma.document.deleteMany({
        where: { propertyId: { in: testPropertyIds } }
      })
      console.log(`   ✅ Eliminados ${deletedDocs.count} documentos`)

      const deletedReports = await prisma.financialReport.deleteMany({
        where: { propertyId: { in: testPropertyIds } }
      })
      console.log(`   ✅ Eliminados ${deletedReports.count} reportes financieros`)

      const deletedProps = await prisma.property.deleteMany({
        where: { id: { in: testPropertyIds } }
      })
      console.log(`   ✅ Eliminadas ${deletedProps.count} propiedades`)
    }

    // Eliminar usuarios de prueba (excepto si son los únicos admins)
    if (testUsers.length > 0) {
      const testUserIds = testUsers.map(u => u.id)

      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      })
      const testAdminCount = testUsers.filter(u => u.role === 'ADMIN').length

      if (adminCount <= testAdminCount) {
        console.log('')
        console.log('   ⚠️ ADVERTENCIA: No se eliminarán los usuarios admin de prueba')
        console.log('   porque son los únicos administradores del sistema.')
      } else {
        const deletedNotifications = await prisma.notification.deleteMany({
          where: { userId: { in: testUserIds } }
        })
        console.log(`   ✅ Eliminadas ${deletedNotifications.count} notificaciones`)

        const deletedUsers = await prisma.user.deleteMany({
          where: { id: { in: testUserIds } }
        })
        console.log(`   ✅ Eliminados ${deletedUsers.count} usuarios`)
      }
    }

    console.log('\n✅ LIMPIEZA COMPLETADA')

  } else {
    console.log('========================================')
    console.log('  ¿QUÉ DESEAS HACER?')
    console.log('========================================')
    console.log('')
    console.log('Para ELIMINAR los datos de prueba encontrados:')
    console.log('   bun run db:clean -- --delete')
    console.log('')
    console.log('Para VER TODOS LOS DATOS EN DETALLE:')
    console.log('   bun run db:verify')
    console.log('')
  }

  // Mostrar estado final
  console.log('\n📊 ESTADO FINAL:')
  console.log('----------------')
  const finalUsersCount = await prisma.user.count()
  const finalPropertiesCount = await prisma.property.count()
  const finalExpensesCount = await prisma.expense.count()

  console.log(`   Usuarios: ${finalUsersCount} (antes: ${usersCount})`)
  console.log(`   Propiedades: ${finalPropertiesCount} (antes: ${propertiesCount})`)
  console.log(`   Gastos: ${finalExpensesCount} (antes: ${expensesCount})`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
