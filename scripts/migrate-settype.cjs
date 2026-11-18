const { Client } = require('pg');

async function migrateSetType(dbName) {
  const client = new Client({
    connectionString: `postgresql://harukaizen:harukaizen_local_secret@localhost:5432/${dbName}?schema=public`
  });
  await client.connect();
  console.log(`Connected to ${dbName}`);

  await client.query(`
    -- 1. Drop default from column
    ALTER TABLE "workout_log_sets" ALTER COLUMN "set_type" DROP DEFAULT;

    -- 2. Rename old enum
    ALTER TYPE "SetType" RENAME TO "SetType_old";

    -- 3. Create canonical enum
    CREATE TYPE "SetType" AS ENUM ('WARMUP', 'WORKING', 'DROPSET', 'FAILURE');

    -- 4. Update column with conversion
    ALTER TABLE "workout_log_sets"
      ALTER COLUMN "set_type" TYPE "SetType"
      USING (
        CASE
          WHEN "set_type"::text = 'DROP' THEN 'DROPSET'::"SetType"
          ELSE "set_type"::text::"SetType"
        END
      );

    -- 5. Restore default
    ALTER TABLE "workout_log_sets" ALTER COLUMN "set_type" SET DEFAULT 'WORKING'::"SetType";

    -- 6. Drop old enum
    DROP TYPE "SetType_old";
  `);

  console.log(`Migration of SetType succeeded on ${dbName}!`);

  const res = await client.query('SELECT enum_range(NULL::"SetType") AS enum_range;');
  console.log(`enum_range on ${dbName}:`, res.rows[0].enum_range);

  await client.end();
}

const targetDb = process.argv[2] || 'harukaizen_step2_copy';

migrateSetType(targetDb).catch(err => {
  console.error(err);
  process.exit(1);
});
