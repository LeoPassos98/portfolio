import { z } from 'zod';
import { employeeLoginEmailSchema } from './employee-login-email.schema.js';

const temporaryPasswordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres');

export const employeeAccessCreateSchema = z
  .strictObject({
    loginEmail: employeeLoginEmailSchema,
    profile: z.enum(['administrator', 'employee']),
    initialPassword: temporaryPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine(
    ({ initialPassword, confirmPassword }) =>
      initialPassword === confirmPassword,
    {
      path: ['confirmPassword'],
      message: 'Password confirmation must match password',
    },
  );

export type EmployeeAccessCreateInput = z.output<
  typeof employeeAccessCreateSchema
>;
