import { z } from 'zod';

function normalizeCep(value: string): string {
  return value.replace(/\D/g, '');
}

export const cepSchema = z
  .string()
  .transform(normalizeCep)
  .refine((value) => value.length === 8, {
    message: 'Informe um CEP com 8 dígitos',
  });

export const cepParamSchema = z.object({
  cep: cepSchema,
});

export type CepParamInput = z.output<typeof cepParamSchema>;
