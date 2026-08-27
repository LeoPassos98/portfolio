import { z } from 'zod'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe seu e-mail')
    .email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
})

type LoginFormData = z.infer<typeof loginSchema>

export { loginSchema }
export type { LoginFormData }
