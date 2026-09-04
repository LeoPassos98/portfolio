import { z } from 'zod'

const loginEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail de login')
  .email('Informe um e-mail de login válido')

const accessProfileSchema = z.enum(['administrator', 'employee'])

const temporaryPasswordSchema = z
  .string()
  .min(1, 'Informe a senha temporária')
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres')

const employeeAccessUpdateSchema = z.object({
  loginEmail: loginEmailSchema,
})

const employeeAccessCreationSchema = z
  .object({
    loginEmail: loginEmailSchema,
    profile: accessProfileSchema,
    initialPassword: temporaryPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha temporária'),
  })
  .refine((data) => data.initialPassword === data.confirmPassword, {
    message: 'As senhas devem ser iguais',
    path: ['confirmPassword'],
  })

const employeeAccessPasswordResetSchema = z
  .object({
    temporaryPassword: temporaryPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha temporária'),
  })
  .refine((data) => data.temporaryPassword === data.confirmPassword, {
    message: 'As senhas devem ser iguais',
    path: ['confirmPassword'],
  })

type EmployeeAccessCreationFormData = z.input<
  typeof employeeAccessCreationSchema
>
type EmployeeAccessCreationFormValues = z.output<
  typeof employeeAccessCreationSchema
>
type EmployeeAccessUpdateFormData = z.input<typeof employeeAccessUpdateSchema>
type EmployeeAccessUpdateFormValues = z.output<
  typeof employeeAccessUpdateSchema
>
type EmployeeAccessPasswordResetFormData = z.input<
  typeof employeeAccessPasswordResetSchema
>
type EmployeeAccessPasswordResetFormValues = z.output<
  typeof employeeAccessPasswordResetSchema
>

export {
  employeeAccessCreationSchema,
  employeeAccessPasswordResetSchema,
  employeeAccessUpdateSchema,
}
export type {
  EmployeeAccessCreationFormData,
  EmployeeAccessCreationFormValues,
  EmployeeAccessPasswordResetFormData,
  EmployeeAccessPasswordResetFormValues,
  EmployeeAccessUpdateFormData,
  EmployeeAccessUpdateFormValues,
}
