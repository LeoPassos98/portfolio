import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().transform((email) => email.trim().toLowerCase()),
  password: z.string(),
});

export type LoginInput = z.output<typeof loginSchema>;
