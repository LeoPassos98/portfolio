import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export { loginSchema }
export type { LoginFormData }
