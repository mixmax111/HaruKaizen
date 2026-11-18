const { Client } = require('pg');

const client = new Client({ connectionString: 'postgresql://harukaizen:harukaizen_local_secret@localhost:5432/postgres' });

async function run() {
  await client.connect();
  console.log('Connected to postgres maintenance DB.');

  // Terminate any active connections to harukaizen_db
  await client.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'harukaizen_db'
      AND pid <> pg_backend_pid();
  `);

  await client.query('DROP DATABASE IF EXISTS harukaizen_step2_copy;');
  console.log('Cleaned up previous harukaizen_step2_copy if any.');

  await client.query('CREATE DATABASE harukaizen_step2_copy WITH TEMPLATE harukaizen_db OWNER harukaizen;');
  console.log('SUCCESS: harukaizen_step2_copy created from harukaizen_db!');

  await client.end();
}

run().catch(err => {
  console.error('ERROR creating database copy:', err);
  process.exit(1);
});

