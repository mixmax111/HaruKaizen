import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';
import { runDedupGlobalFoodsMigration } from './dedup-global-foods.migration.js';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://harukaizen:harukaizen_local_secret@localhost:5432/harukaizen_db?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Avvio migrazione dedup alimenti globali & creazione indice parziale ---');
  try {
    const res = await runDedupGlobalFoodsMigration(prisma);
    console.log('Migrazione completata con successo:');
    console.log(`- Backfilled source: ${res.backfilledSourceCount}`);
    console.log(`- Gruppi duplicati trovati: ${res.duplicateGroupsFound}`);
    console.log(`- Duplicati uniti: ${res.mergedDuplicatesCount}`);
    console.log(`- Riferimenti aggiornati:`, res.repointedReferences);
    console.log(`- Pre-check superato: ${res.preCheckPassed}`);
    console.log(`- Indice parziale creato: ${res.indexCreated}`);
    process.exit(0);
  } catch (err: any) {
    console.error('ERRORE CRITICO MIGRAZIONE:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

