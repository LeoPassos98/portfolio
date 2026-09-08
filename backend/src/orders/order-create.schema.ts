import { z } from 'zod';

const decimalValueSchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    'Informe um valor decimal não negativo com até 10 dígitos inteiros e 2 casas decimais',
  );

const optionalNotesSchema = z
  .string()
  .trim()
  .max(4000, 'As observações devem ter no máximo 4000 caracteres')
  .optional()
  .transform((value) => (value === undefined || value === '' ? null : value));

export const orderCreateSchema = z.strictObject({
  clienteId: z.uuid('Informe um Cliente válido'),
  responsavelId: z.uuid('Informe um responsável válido').optional(),
  descricao: z
    .string()
    .trim()
    .min(3, 'A descrição deve ter pelo menos 3 caracteres')
    .max(2000, 'A descrição deve ter no máximo 2000 caracteres'),
  valor: decimalValueSchema,
  observacoes: optionalNotesSchema,
  visibilidade: z.enum(['PRIVADA', 'PUBLICA']).default('PRIVADA'),
});

export type OrderCreateInput = z.output<typeof orderCreateSchema>;
