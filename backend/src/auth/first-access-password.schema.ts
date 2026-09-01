import { z } from 'zod';

export const firstAccessPasswordSchema = z
  .object({
    password: z.string().min(8).max(128),
    passwordConfirmation: z.string(),
  })
  .refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Password confirmation must match password',
  });

export type FirstAccessPasswordInput = z.output<
  typeof firstAccessPasswordSchema
>;
