import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith('postgresql://'), {
      message: 'must use the postgresql:// scheme',
    }),
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE_MS: z.coerce.number().int().positive().default(28_800_000),
  FRONTEND_ORIGIN: z.string().url(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}
