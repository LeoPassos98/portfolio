import { z } from 'zod';
import {
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';
import {
  orderDecimalValueSchema,
  orderOptionalNotesSchema,
} from './order-create.schema.js';

export const orderUpdateSchema = z.strictObject({
  versao: z
    .number()
    .int('A versão deve ser um número inteiro')
    .positive('A versão deve ser positiva')
    .min(1, 'A versão mínima é 1'),
  descricao: z
    .string()
    .trim()
    .min(3, 'A descrição deve ter pelo menos 3 caracteres')
    .max(2000, 'A descrição deve ter no máximo 2000 caracteres'),
  valor: orderDecimalValueSchema,
  observacoes: orderOptionalNotesSchema,
  status: z.enum(StatusOrdemServico),
  visibilidade: z.enum(Visibilidade),
  responsavelId: z.uuid('Informe um responsável válido').optional(),
});

export type OrderUpdateInput = z.output<typeof orderUpdateSchema>;
