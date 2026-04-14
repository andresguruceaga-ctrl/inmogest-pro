import { db } from '../src/lib/db';

async function main() {
  // Create default user
  const user = await db.user.upsert({
    where: { email: 'admin@inmogest.com' },
    update: {},
    create: {
      email: 'admin@inmogest.com',
      name: 'Admin User',
      role: 'admin',
      phone: '+34 600 000 000'
    }
  });

  console.log('Created user:', user);

  // Create sample owner
  const owner = await db.owner.upsert({
    where: { id: 'owner-1' },
    update: {},
    create: {
      id: 'owner-1',
      name: 'Juan García',
      email: 'juan@email.com',
      phone: '+34 611 111 111',
      dni: '12345678A',
      address: 'Madrid, España'
    }
  });

  console.log('Created owner:', owner);

  // Create sample property
  const property = await db.property.upsert({
    where: { id: 'prop-1' },
    update: {},
    create: {
      id: 'prop-1',
      name: 'Apartamento Centro',
      address: 'Calle Mayor, 10, 3ºA',
      city: 'Madrid',
      province: 'Madrid',
      postalCode: '28013',
      type: 'apartment',
      status: 'rented',
      bedrooms: 2,
      bathrooms: 1,
      area: 75,
      price: 1200,
      description: 'Apartamento luminoso en el centro de Madrid',
      features: '["Aire acondicionado", "Calefacción", "Terraza"]',
      ownerId: user.id
    }
  });

  console.log('Created property:', property);

  // Create sample supplier
  const supplier = await db.supplier.upsert({
    where: { id: 'sup-1' },
    update: {},
    create: {
      id: 'sup-1',
      name: 'Electricidad López',
      category: 'electrical',
      contactName: 'Pedro López',
      phone: '+34 622 222 222',
      email: 'pedro@electricidadlopez.com'
    }
  });

  console.log('Created supplier:', supplier);

  // Create sample fixed cost
  const fixedCost = await db.fixedCost.upsert({
    where: { id: 'fc-1' },
    update: {},
    create: {
      id: 'fc-1',
      concept: 'Cuota Comunidad',
      category: 'community_fee',
      amount: 150,
      periodicity: 'monthly',
      propertyId: property.id,
      isActive: true
    }
  });

  console.log('Created fixed cost:', fixedCost);

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
