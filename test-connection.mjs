import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Testing Prisma connection...');
    
    // Try to query the database
    const count = await prisma.lead.count();
    console.log('✅ Connection successful!');
    console.log(`📊 Current lead count: ${count}`);
    
    // Try to fetch all leads
    const leads = await prisma.lead.findMany();
    console.log(`📋 Leads in database:`, leads);
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
