import { z } from 'zod';

export const employeeLoginEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail de login')
  .refine((value) => z.email().safeParse(value).success, {
    message: 'Informe um e-mail de login válido',
  });
