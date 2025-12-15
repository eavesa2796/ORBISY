const { PrismaClient } = require('@prisma/client');
require('dotenv/config');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection...');
  
  // Create a test lead
  const lead = await prisma.lead.create({
    data: {
      businessName: 'Test Company',
      email: 'test@example.com',
      message: 'This is a test message',
    },
  });
  
  console.log('Created test lead:', lead);
  
  // Fetch all leads
  const allLeads = await prisma.lead.findMany();
  console.log('All leads in database:', allLeads);
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
