import path from 'path';
import { fileURLToPath } from 'url';
import { importCSV } from './importer.js';
import { getDb } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../');

async function seed() {
  const db = getDb();

  // Check if already seeded
  const count = db.prepare('SELECT COUNT(*) as c FROM votos').get();
  if (count.c > 0) {
    console.log(`Database already has ${count.c} vote records. Skipping seed.`);
    return;
  }

  console.log('=== Seeding database with TSE data ===\n');

  const files = [
    path.join(DATA_DIR, 'bweb_1t_RR_051020221321.csv'),
    path.join(DATA_DIR, 'bweb_1t_RR_091020241636.csv'),
  ];

  for (const file of files) {
    console.log(`\nImporting: ${path.basename(file)}`);
    const start = Date.now();
    const records = await importCSV(file);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  Done in ${elapsed}s (${records} records)`);
  }

  console.log('\n=== Seed complete! ===');

  // Print summary
  const summary = {
    eleicoes: db.prepare('SELECT COUNT(*) as c FROM eleicoes').get().c,
    candidatos: db.prepare('SELECT COUNT(*) as c FROM candidatos').get().c,
    votos: db.prepare('SELECT COUNT(*) as c FROM votos').get().c,
    municipios: db.prepare('SELECT COUNT(*) as c FROM municipios').get().c,
    partidos: db.prepare('SELECT COUNT(*) as c FROM partidos').get().c,
    zonas: db.prepare('SELECT COUNT(*) as c FROM zonas_eleitorais').get().c,
    secoes: db.prepare('SELECT COUNT(*) as c FROM secoes').get().c,
  };
  console.log('\nDatabase summary:', summary);
}

seed().catch(console.error);
