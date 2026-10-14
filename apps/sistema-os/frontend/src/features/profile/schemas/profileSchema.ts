import { z } from 'zod'
import { employeeSchema } from '../../employees/schemas/employeeSchema'

const profileUpdateSchema = employeeSchema.pick({
  name: true,
  phone: true,
})

const profilePasswordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual'),
    newPassword: z
      .string()
      .min(1, 'Informe sua nova senha')
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .max(128, 'A senha deve ter no máximo 128 caracteres'),
    newPasswordConfirmation: z.string().min(1, 'Confirme sua nova senha'),
  })
  .refine(
    ({ newPassword, newPasswordConfirmation }) =>
      newPassword === newPasswordConfirmation,
    {
      message: 'As senhas devem ser iguais',
      path: ['newPasswordConfirmation'],
    },
  )

type ProfileUpdateFormData = z.input<typeof profileUpdateSchema>
type ProfileUpdateFormValues = z.output<typeof profileUpdateSchema>
type ProfilePasswordUpdateFormData = z.infer<
  typeof profilePasswordUpdateSchema
>

export { profilePasswordUpdateSchema, profileUpdateSchema }
export type {
  ProfilePasswordUpdateFormData,
  ProfileUpdateFormData,
  ProfileUpdateFormValues,
}
