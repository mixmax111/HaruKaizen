import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL deve essere una URL valida (postgresql://...)' }),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET deve essere di almeno 32 caratteri',
  }),
  JWT_REFRESH_SECRET: z.string().min(32, {
    message: 'JWT_REFRESH_SECRET deve essere di almeno 32 caratteri e diverso da JWT_SECRET',
  }),
  ENCRYPTION_KEY: z.string().length(64, {
    message: 'ENCRYPTION_KEY deve essere di esattamente 64 caratteri hex (32 byte)',
  }),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3001'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((e: z.ZodIssue) => `  ❌ ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`\n🔴 Validazione .env fallita:\n${errors}\n`);
  }

  return result.data;
}
