import { z } from 'zod'

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function normalizePhone(value: string) {
  const digits = normalizeDigits(value)

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2)
  }

  return digits
}

const employeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .min(2, 'Informe um nome com pelo menos 2 caracteres')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  phone: z
    .string()
    .min(1, 'Informe o telefone')
    .transform(normalizePhone)
    .refine((value) => value.length === 10 || value.length === 11, {
      message: 'Informe um telefone com DDD válido',
    }),
  contactEmail: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail de contato')
    .email('Informe um e-mail válido'),
  status: z.enum(['active', 'inactive']),
})

type EmployeeFormData = z.input<typeof employeeSchema>
type EmployeeFormValues = z.output<typeof employeeSchema>

export { employeeSchema }
export type { EmployeeFormData, EmployeeFormValues }
