import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'jpalvarezruiz@gmail.com'
  const name = 'Juan Pablo Alvarez Ruiz'
  const phone = '+507 64368580'
  const password = 'juanPa'
  const hashedPassword = await bcrypt.hash(password, 12)

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log('User already exists:', existingUser.email)
    return
  }

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true
    }
  })

  console.log('Admin user created successfully!')
  console.log('ID:', user.id)
  console.log('Email:', user.email)
  console.log('Name:', user.name)
  console.log('Role:', user.role)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
