import { z } from 'zod';

const loginEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail de login')
  .refine((value) => z.email().safeParse(value).success, {
    message: 'Informe um e-mail de login válido',
  });

const temporaryPasswordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres');

export const employeeAccessCreateSchema = z
  .strictObject({
    loginEmail: loginEmailSchema,
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
