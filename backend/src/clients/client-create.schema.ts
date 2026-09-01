import { z } from 'zod';
import { isValidCpfCnpj } from './client-document.validator.js';

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizePhone(value: string): string {
  const digits = normalizeDigits(value);

  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith('55')
  ) {
    return digits.slice(2);
  }

  return digits;
}

const optionalDocumentSchema = z
  .string()
  .optional()
  .transform((value) => normalizeDigits(value ?? ''))
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || isValidCpfCnpj(value), {
    message: 'Informe um CPF ou CNPJ válido',
  });

const optionalEmailSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '')
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || z.email().safeParse(value).success, {
    message: 'Informe um e-mail válido',
  });

const optionalComplementSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '')
  .transform((value) => (value === '' ? null : value));

export const clientCreateSchema = z.strictObject({
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
  documento: optionalDocumentSchema,
  email: optionalEmailSchema,
  cep: z
    .string()
    .transform(normalizeDigits)
    .refine((value) => value.length === 8, {
      message: 'Informe um CEP com 8 dígitos',
    }),
  logradouro: z.string().trim().min(1, 'Informe o logradouro'),
  numero: z.string().trim().min(1, 'Informe o número'),
  complemento: optionalComplementSchema,
  bairro: z.string().trim().min(1, 'Informe o bairro'),
  cidade: z.string().trim().min(1, 'Informe a cidade'),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Informe uma UF válida'),
});

export type ClientCreateInput = z.output<typeof clientCreateSchema>;
