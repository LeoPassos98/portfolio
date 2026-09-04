import { z } from 'zod';
import { passwordSchema } from './password/password.schema.js';

export const firstAccessPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine(
    ({ password, passwordConfirmation }) => password === passwordConfirmation,
    {
      path: ['passwordConfirmation'],
      message: 'Password confirmation must match password',
    },
  );

export type FirstAccessPasswordInput = z.output<
  typeof firstAccessPasswordSchema
>;
