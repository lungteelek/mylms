import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Prisma Client initialized successfully');
}
main().catch(e => {
  console.error('Prisma initialization failed:', e);
  process.exit(1);
});
