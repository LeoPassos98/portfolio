import { z } from 'zod';
import { passwordSchema } from '../auth/password/password.schema.js';
import { employeeLoginEmailSchema } from './employee-login-email.schema.js';

export const employeeAccessCreateSchema = z
  .strictObject({
    loginEmail: employeeLoginEmailSchema,
    profile: z.enum(['administrator', 'employee']),
    initialPassword: passwordSchema,
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
