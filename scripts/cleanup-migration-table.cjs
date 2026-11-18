const { Client } = require('pg');

async function cleanMigrations(dbName) {
  const client = new Client({
    connectionString: `postgresql://harukaizen:harukaizen_local_secret@localhost:5432/${dbName}?schema=public`
  });
  await client.connect();
  console.log(`Connected to ${dbName}`);

  await client.query(`DELETE FROM "_prisma_migrations" WHERE "migration_name" <> '0_init';`);

  const res = await client.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations";');
  console.log(`Migrations in ${dbName}:`, res.rows);

  await client.end();
}

const targetDb = process.argv[2] || 'harukaizen_step2_copy';
cleanMigrations(targetDb).catch(err => {
  console.error(err);
  process.exit(1);
});

