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

function hasRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value)
}

function isValidCpf(value: string) {
  if (value.length !== 11 || hasRepeatedDigits(value)) {
    return false
  }

  const firstSum = value
    .slice(0, 9)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0)
  const firstDigit = (firstSum * 10) % 11

  if ((firstDigit === 10 ? 0 : firstDigit) !== Number(value[9])) {
    return false
  }

  const secondSum = value
    .slice(0, 10)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (11 - index), 0)
  const secondDigit = (secondSum * 10) % 11

  return (secondDigit === 10 ? 0 : secondDigit) === Number(value[10])
}

function getCnpjCheckDigit(value: string) {
  let multiplier = value.length - 7
  const sum = value.split('').reduce((total, digit) => {
    const nextTotal = total + Number(digit) * multiplier

    multiplier -= 1
    if (multiplier === 1) {
      multiplier = 9
    }

    return nextTotal
  }, 0)
  const remainder = sum % 11

  return remainder < 2 ? 0 : 11 - remainder
}

function isValidCnpj(value: string) {
  if (value.length !== 14 || hasRepeatedDigits(value)) {
    return false
  }

  const firstDigit = getCnpjCheckDigit(value.slice(0, 12))
  const secondDigit = getCnpjCheckDigit(value.slice(0, 13))

  return firstDigit === Number(value[12]) && secondDigit === Number(value[13])
}

function isValidDocument(value: string) {
  return isValidCpf(value) || isValidCnpj(value)
}

const optionalEmailSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, {
    message: 'Informe um e-mail válido',
  })
  .transform((value) => (value === '' ? undefined : value))

const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .min(2, 'Informe um nome com pelo menos 2 caracteres')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  document: z
    .string()
    .transform(normalizeDigits)
    .transform((value) => (value === '' ? undefined : value))
    .refine((value) => value === undefined || isValidDocument(value), {
      message: 'Informe um CPF ou CNPJ válido',
    }),
  phone: z
    .string()
    .min(1, 'Informe o telefone / WhatsApp')
    .transform(normalizePhone)
    .refine((value) => value.length === 10 || value.length === 11, {
      message: 'Informe um telefone com DDD válido',
    }),
  email: optionalEmailSchema,
  postalCode: z
    .string()
    .min(1, 'Informe o CEP')
    .transform(normalizeDigits)
    .refine((value) => value.length === 8, {
      message: 'Informe um CEP com 8 dígitos',
    }),
  street: z.string().trim().min(1, 'Informe o logradouro'),
  number: z.string().trim().min(1, 'Informe o número'),
  complement: z
    .string()
    .trim()
    .transform((value) => (value === '' ? undefined : value)),
  neighborhood: z.string().trim().min(1, 'Informe o bairro'),
  city: z.string().trim().min(1, 'Informe a cidade'),
  state: z
    .string()
    .trim()
    .min(1, 'Informe a UF')
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Informe uma UF válida'),
  status: z.enum(['active', 'inactive']).optional(),
})

type ClientFormData = z.input<typeof clientSchema>
type ClientFormValues = z.output<typeof clientSchema>

export { clientSchema }
export type { ClientFormData, ClientFormValues }
