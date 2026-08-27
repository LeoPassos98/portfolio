import { z } from 'zod'

const orderFormFieldsSchema = z.object({
  clientId: z.string(),
  responsibleId: z.string(),
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição do serviço')
    .min(3, 'A descrição deve ter pelo menos 3 caracteres')
    .max(2000, 'A descrição deve ter no máximo 2000 caracteres'),
  value: z
    .string()
    .trim()
    .min(1, 'Informe o valor')
    .refine((value) => Number.isFinite(Number(value)), {
      message: 'Informe um valor válido',
    })
    .transform(Number)
    .refine((value) => value >= 0, {
      message: 'O valor deve ser maior ou igual a zero',
    }),
  notes: z
    .string()
    .trim()
    .max(4000, 'As observações devem ter no máximo 4000 caracteres')
    .transform((value) => (value === '' ? undefined : value)),
  status: z.enum(['awaiting', 'in-progress', 'completed', 'cancelled']),
  visibility: z.enum(['public', 'private']),
})

type OrderFormSchemaOptions = {
  clientIds: readonly string[]
  requiresClient: boolean
  responsibleIds: readonly string[]
}

function createOrderFormSchema({
  clientIds,
  requiresClient,
  responsibleIds,
}: OrderFormSchemaOptions) {
  return orderFormFieldsSchema.superRefine((data, context) => {
    if (requiresClient && !clientIds.includes(data.clientId)) {
      context.addIssue({
        code: 'custom',
        message: 'Selecione um cliente ativo',
        path: ['clientId'],
      })
    }

    if (!responsibleIds.includes(data.responsibleId)) {
      context.addIssue({
        code: 'custom',
        message: 'Selecione um responsável ativo',
        path: ['responsibleId'],
      })
    }
  })
}

type OrderFormData = z.input<typeof orderFormFieldsSchema>
type OrderFormValues = z.output<typeof orderFormFieldsSchema>

export { createOrderFormSchema }
export type { OrderFormData, OrderFormValues }
