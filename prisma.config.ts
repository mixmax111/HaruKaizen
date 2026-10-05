import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Forza il caricamento del file .env PRIMA di leggere la configurazione
config();

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});