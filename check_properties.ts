import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres.megswukieallaguhmjbh:inmogest-pro@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      mainImage: true,
      images: true,
      forSale: true,
      forRent: true,
      salePrice: true,
      comments: true,
    }
  });
  
  console.log('Total propiedades:', properties.length);
  console.log('\nPropiedades:');
  properties.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.title}`);
    console.log(`   - ID: ${p.id}`);
    console.log(`   - mainImage: ${p.mainImage ? p.mainImage.substring(0, 50) + '...' : 'null'}`);
    console.log(`   - images: ${p.images ? p.images.substring(0, 50) + '...' : 'null'}`);
    console.log(`   - forSale: ${p.forSale}`);
    console.log(`   - forRent: ${p.forRent}`);
    console.log(`   - salePrice: ${p.salePrice}`);
    console.log(`   - comments: ${p.comments || 'null'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
