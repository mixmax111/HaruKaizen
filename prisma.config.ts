import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Forza il caricamento del file .env PRIMA di leggere la configurazione
config();

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL as string,
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ||
      "postgresql://harukaizen:harukaizen_local_secret@localhost:5432/harukaizen_shadow_db?schema=public",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
