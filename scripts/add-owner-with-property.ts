import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ============================================
// CONFIGURACIÓN - EDITA ESTOS DATOS
// ============================================
const OWNER_DATA = {
  name: 'Nombre del Propietario',
  email: 'propietario@email.com',
  phone: '+507 60000000',
  password: 'contrasena123',
}

const PROPERTY_DATA = {
  title: 'Nombre de la Propiedad',
  address: 'Dirección de la propiedad',
  province: 'Panamá',
  district: 'Panamá',
  corregimiento: 'Bella Vista',
  propertyType: 'APARTAMENTO',
  bedrooms: 2,
  bathrooms: 2,
  parkingSpaces: 1,
  totalArea: 100,
  builtArea: 80,
  monthlyRent: 1500,
  depositAmount: 1500,
  fincaNumber: '12345',
  tomoNumber: '123',
  folioNumber: '456',
  status: 'DISPONIBLE',
}

// ID del administrador que gestionará esta propiedad
const ADMIN_ID = 'ID_DEL_ADMIN_AQUI'
// ============================================

async function main() {
  console.log('\n========================================')
  console.log('  AGREGAR PROPIETARIO Y PROPIEDAD')
  console.log('========================================\n')

  if (ADMIN_ID === 'ID_DEL_ADMIN_AQUI') {
    console.log('❌ ERROR: Debes configurar el ADMIN_ID en el script.')
    console.log('')
    console.log('1. Ejecuta: bun run db:verify')
    console.log('2. Copia el ID del usuario ADMIN')
    console.log('3. Edita scripts/add-owner-with-property.ts y pega el ID')
    console.log('')
    return
  }

  const admin = await prisma.user.findUnique({
    where: { id: ADMIN_ID }
  })

  if (!admin) {
    console.log('❌ ERROR: No se encontró un administrador con ese ID.')
    return
  }

  console.log(`✅ Admin encontrado: ${admin.name} (${admin.email})\n`)

  let owner = await prisma.user.findUnique({
    where: { email: OWNER_DATA.email.toLowerCase() }
  })

  if (owner) {
    console.log(`⚠️ El propietario ya existe: ${owner.name} (${owner.email})`)
    console.log(`   ID: ${owner.id}`)
  } else {
    console.log('📝 Creando propietario...')
    const hashedPassword = await bcrypt.hash(OWNER_DATA.password, 12)

    owner = await prisma.user.create({
      data: {
        name: OWNER_DATA.name,
        email: OWNER_DATA.email.toLowerCase(),
        phone: OWNER_DATA.phone,
        password: hashedPassword,
        role: 'PROPIETARIO',
        isActive: true,
      }
    })

    console.log('✅ Propietario creado exitosamente!')
    console.log(`   ID: ${owner.id}`)
    console.log(`   Nombre: ${owner.name}`)
    console.log(`   Email: ${owner.email}`)
    console.log(`   Contraseña: ${OWNER_DATA.password}`)
  }
  console.log('')

  const existingProperty = await prisma.property.findFirst({
    where: {
      title: PROPERTY_DATA.title,
      ownerId: owner.id
    }
  })

  if (existingProperty) {
    console.log(`⚠️ Ya existe una propiedad "${PROPERTY_DATA.title}" para este propietario`)
    return
  }

  console.log('📝 Creando propiedad...')

  const property = await prisma.property.create({
    data: {
      title: PROPERTY_DATA.title,
      address: PROPERTY_DATA.address,
      province: PROPERTY_DATA.province,
      district: PROPERTY_DATA.district,
      corregimiento: PROPERTY_DATA.corregimiento,
      propertyType: PROPERTY_DATA.propertyType as any,
      bedrooms: PROPERTY_DATA.bedrooms,
      bathrooms: PROPERTY_DATA.bathrooms,
      parkingSpaces: PROPERTY_DATA.parkingSpaces,
      totalArea: PROPERTY_DATA.totalArea,
      builtArea: PROPERTY_DATA.builtArea,
      monthlyRent: PROPERTY_DATA.monthlyRent,
      depositAmount: PROPERTY_DATA.depositAmount,
      fincaNumber: PROPERTY_DATA.fincaNumber,
      tomoNumber: PROPERTY_DATA.tomoNumber,
      folioNumber: PROPERTY_DATA.folioNumber,
      status: PROPERTY_DATA.status as any,
      ownerId: owner.id,
      adminId: ADMIN_ID,
      isActive: true,
    }
  })

  console.log('✅ Propiedad creada exitosamente!')
  console.log(`   ID: ${property.id}`)
  console.log(`   Título: ${property.title}`)
  console.log(`   Dirección: ${property.address}`)
  console.log(`   Alquiler: $${property.monthlyRent}/mes`)
  console.log(`   Propietario: ${owner.name}`)
  console.log('')

  console.log('========================================')
  console.log('  RESUMEN')
  console.log('========================================')
  console.log('')
  console.log('👤 PROPIETARIO:')
  console.log(`   Email: ${owner.email}`)
  console.log(`   Contraseña: ${OWNER_DATA.password}`)
  console.log('')
  console.log('🏠 PROPIEDAD:')
  console.log(`   ${property.title}`)
  console.log(`   $${property.monthlyRent}/mes`)
  console.log('')
  console.log('El propietario ahora puede iniciar sesión y ver SU propiedad.')
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
