import { z } from 'zod';
import { passwordSchema } from '../auth/password/password.schema.js';

export const employeeAccessPasswordResetSchema = z
  .strictObject({
    temporaryPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(
    ({ temporaryPassword, confirmPassword }) =>
      temporaryPassword === confirmPassword,
    {
      path: ['confirmPassword'],
      message: 'Password confirmation must match password',
    },
  );

export type EmployeeAccessPasswordResetInput = z.output<
  typeof employeeAccessPasswordResetSchema
>;
