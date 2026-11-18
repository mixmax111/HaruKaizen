const { Client } = require('pg');

const targetDb = process.argv[2] || 'harukaizen_db';
const client = new Client({
  connectionString: `postgresql://harukaizen:harukaizen_local_secret@localhost:5432/${targetDb}?schema=public`
});

async function inspect() {
  await client.connect();
  console.log(`Connected to ${targetDb}`);

  // 1. Enum types in DB named SetType
  const enumQuery = await client.query(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname ILIKE '%settype%'
    GROUP BY t.typname;
  `);
  console.log('\n--- Postgres Enum Definition ---');
  console.log(JSON.stringify(enumQuery.rows, null, 2));

  // Also query enum_range if SetType exists
  try {
    const enumRange = await client.query('SELECT enum_range(NULL::"SetType") AS enum_range;');
    console.log('enum_range(NULL::"SetType"):', enumRange.rows[0].enum_range);
  } catch (err) {
    console.log('Error querying enum_range(NULL::"SetType"):', err.message);
  }

  // 2. Tables and columns using SetType
  const columnsQuery = await client.query(`
    SELECT table_schema, table_name, column_name, udt_name, data_type
    FROM information_schema.columns
    WHERE udt_name ILIKE '%settype%'
    ORDER BY table_name, column_name;
  `);
  console.log('\n--- Columns Using SetType ---');
  console.log(JSON.stringify(columnsQuery.rows, null, 2));

  // 3. Query distinct values in each table found
  for (const row of columnsQuery.rows) {
    const table = `"${row.table_schema}"."${row.table_name}"`;
    const col = `"${row.column_name}"`;
    const distinctQuery = await client.query(`SELECT ${col} AS val, count(*) AS count FROM ${table} GROUP BY ${col};`);
    console.log(`\n--- Distinct values in ${table}.${col} ---`);
    console.log(JSON.stringify(distinctQuery.rows, null, 2));
  }

  // 4. Check workout_log_sets specifically
  try {
    const setsDistinct = await client.query('SELECT "set_type", count(*) AS count FROM "workout_log_sets" GROUP BY "set_type";');
    console.log('\n--- workout_log_sets.set_type distinct values ---');
    console.log(JSON.stringify(setsDistinct.rows, null, 2));
  } catch (err) {
    console.log('Error querying workout_log_sets:', err.message);
  }

  // 5. Query _prisma_migrations
  try {
    const migs = await client.query('SELECT id, migration_name, finished_at, rolled_back_at FROM "_prisma_migrations";');
    console.log('\n--- _prisma_migrations ---');
    console.log(JSON.stringify(migs.rows, null, 2));
  } catch (err) {
    console.log('Error querying _prisma_migrations:', err.message);
  }

  await client.end();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});

