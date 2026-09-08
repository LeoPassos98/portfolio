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

const orderCreateFieldsSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente ativo'),
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
    .regex(
      /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
      'Informe um valor decimal não negativo com até 10 dígitos inteiros e 2 casas decimais',
    ),
  notes: z
    .string()
    .trim()
    .max(4000, 'As observações devem ter no máximo 4000 caracteres')
    .transform((value) => (value === '' ? undefined : value)),
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
type OrderCreateFormData = z.input<typeof orderCreateFieldsSchema>
type OrderCreateFormValues = z.output<typeof orderCreateFieldsSchema>

function createOrderCreateSchema(requiresResponsible: boolean) {
  return orderCreateFieldsSchema.superRefine((data, context) => {
    if (requiresResponsible && data.responsibleId === '') {
      context.addIssue({
        code: 'custom',
        message: 'Selecione um responsável ativo',
        path: ['responsibleId'],
      })
    }
  })
}

export { createOrderCreateSchema, createOrderFormSchema }
export type {
  OrderCreateFormData,
  OrderCreateFormValues,
  OrderFormData,
  OrderFormValues,
}
