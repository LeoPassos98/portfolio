import { z } from 'zod';

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith('55')
  ) {
    return digits.slice(2);
  }

  return digits;
}

export const employeeRegistrationSchema = z.strictObject({
  nome: z
    .string()
    .trim()
    .min(2, 'Informe um nome com pelo menos 2 caracteres')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  telefone: z
    .string()
    .transform(normalizePhone)
    .refine((value) => value.length === 10 || value.length === 11, {
      message: 'Informe um telefone com DDD válido',
    }),
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail de contato')
    .refine((value) => z.email().safeParse(value).success, {
      message: 'Informe um e-mail válido',
    }),
});

export type EmployeeRegistrationInput = z.output<
  typeof employeeRegistrationSchema
>;
