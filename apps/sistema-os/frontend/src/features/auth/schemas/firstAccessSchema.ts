import { z } from 'zod'

const firstAccessSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'Informe sua nova senha')
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .max(128, 'A senha deve ter no máximo 128 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas devem ser iguais',
    path: ['confirmPassword'],
  })

type FirstAccessFormData = z.infer<typeof firstAccessSchema>

export { firstAccessSchema }
export type { FirstAccessFormData }
