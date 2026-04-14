import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n========================================')
  console.log('  VERIFICACIÓN DE BASE DE DATOS')
  console.log('========================================\n')

  // 1. Verificar Usuarios
  console.log('📋 USUARIOS REGISTRADOS:')
  console.log('------------------------')
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  if (users.length === 0) {
    console.log('   ❌ No hay usuarios registrados\n')
  } else {
    users.forEach(user => {
      console.log(`   ✅ ${user.name}`)
      console.log(`      ID: ${user.id}`)
      console.log(`      Email: ${user.email}`)
      console.log(`      Rol: ${user.role}`)
      console.log(`      Activo: ${user.isActive ? 'Sí' : 'No'}`)
      console.log('')
    })
  }

  // 2. Verificar Propiedades
  console.log('\n🏠 PROPIEDADES REGISTRADAS:')
  console.log('---------------------------')
  const properties = await prisma.property.findMany({
    include: {
      owner: {
        select: { id: true, name: true, email: true, role: true }
      },
      admin: {
        select: { id: true, name: true, email: true, role: true }
      },
      tenant: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (properties.length === 0) {
    console.log('   ❌ No hay propiedades registradas\n')
  } else {
    properties.forEach(prop => {
      console.log(`   ✅ ${prop.title}`)
      console.log(`      ID: ${prop.id}`)
      console.log(`      Dirección: ${prop.address}, ${prop.province}`)
      console.log(`      Alquiler: $${prop.monthlyRent}/mes`)
      console.log(`      Estado: ${prop.status}`)
      console.log(`      ─────────────────────────────`)
      console.log(`      👤 PROPIETARIO (ownerId): ${prop.ownerId}`)
      if (prop.owner) {
        console.log(`         Nombre: ${prop.owner.name}`)
        console.log(`         Email: ${prop.owner.email}`)
        console.log(`         Rol: ${prop.owner.role}`)
      } else {
        console.log(`         ⚠️ NO SE ENCONTRÓ EL USUARIO PROPIETARIO`)
      }
      console.log(`      ─────────────────────────────`)
      console.log(`      🔧 ADMINISTRADOR (adminId): ${prop.adminId}`)
      if (prop.admin) {
        console.log(`         Nombre: ${prop.admin.name}`)
        console.log(`         Email: ${prop.admin.email}`)
        console.log(`         Rol: ${prop.admin.role}`)
      } else {
        console.log(`         ⚠️ NO SE ENCONTRÓ EL USUARIO ADMINISTRADOR`)
      }
      if (prop.tenant) {
        console.log(`      ─────────────────────────────`)
        console.log(`      🏠 INQUILINO (tenantId): ${prop.tenantId}`)
        console.log(`         Nombre: ${prop.tenant.name}`)
        console.log(`         Email: ${prop.tenant.email}`)
      }
      console.log('')
    })
  }

  // 3. Verificar propiedades por propietario
  console.log('\n📊 RESUMEN POR PROPIETARIO:')
  console.log('---------------------------')
  const owners = await prisma.user.findMany({
    where: { role: 'PROPIETARIO' },
    include: {
      propertiesAsOwner: {
        select: { id: true, title: true, monthlyRent: true, status: true }
      }
    }
  })

  if (owners.length === 0) {
    console.log('   ❌ No hay usuarios con rol PROPIETARIO\n')
  } else {
    owners.forEach(owner => {
      console.log(`   👤 ${owner.name} (${owner.email})`)
      console.log(`      ID: ${owner.id}`)
      if (owner.propertiesAsOwner.length === 0) {
        console.log(`      ⚠️ NO TIENE PROPIEDADES ASIGNADAS`)
      } else {
        console.log(`      Propiedades (${owner.propertiesAsOwner.length}):`)
        owner.propertiesAsOwner.forEach(prop => {
          console.log(`         • ${prop.title} - $${prop.monthlyRent}/mes (${prop.status})`)
        })
      }
      console.log('')
    })
  }

  // 4. Resumen final
  console.log('\n📈 RESUMEN FINAL:')
  console.log('-----------------')
  console.log(`   Total usuarios: ${users.length}`)
  console.log(`   - Admins: ${users.filter(u => u.role === 'ADMIN').length}`)
  console.log(`   - Propietarios: ${users.filter(u => u.role === 'PROPIETARIO').length}`)
  console.log(`   - Inquilinos: ${users.filter(u => u.role === 'INQUILINO').length}`)
  console.log(`   Total propiedades: ${properties.length}`)
  console.log(`   - Ocupadas: ${properties.filter(p => p.status === 'OCUPADA').length}`)
  console.log(`   - Disponibles: ${properties.filter(p => p.status === 'DISPONIBLE').length}`)
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
