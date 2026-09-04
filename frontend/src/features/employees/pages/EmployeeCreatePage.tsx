import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { useSuccessFeedback } from '../../../components/feedback/useSuccessFeedback'
import { useUnsavedChangesGuard } from '../../../components/feedback/useUnsavedChangesGuard'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { employeesQueryKeys } from '../api/employeeQueryKeys'
import { createEmployee } from '../api/employeesApi'
import {
  employeeSchema,
  type EmployeeFormData,
  type EmployeeFormValues,
} from '../schemas/employeeSchema'

function EmployeeCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccess } = useSuccessFeedback()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EmployeeFormData, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      phone: '',
      contactEmail: '',
      status: 'active',
    },
  })
  const { confirmationDialog } = useUnsavedChangesGuard(isDirty)
  const createMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) => createEmployee(values),
  })

  async function onSubmit(values: EmployeeFormValues) {
    if (createMutation.isPending) {
      return
    }

    setFormError(null)

    try {
      const employee = await createMutation.mutateAsync(values)

      queryClient.setQueryData(employeesQueryKeys.detail(employee.id), employee)
      await queryClient.invalidateQueries({
        queryKey: employeesQueryKeys.lists(),
      })
      reset()
      showSuccess('Funcionário cadastrado com sucesso.')
      navigate('/employees')
    } catch {
      setFormError('Não foi possível cadastrar o funcionário. Tente novamente.')
    }
  }

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">Novo funcionário</h1>

      <form
        noValidate
        className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        {formError && (
          <p className="text-error" role="alert">
            {formError}
          </p>
        )}
        <section aria-labelledby="new-employee-data-title">
          <h2
            id="new-employee-data-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do funcionário
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-employee-name">Nome</Label>
              <Input
                id="new-employee-name"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-required="true"
                aria-describedby={
                  errors.name ? 'new-employee-name-error' : undefined
                }
                {...register('name')}
              />
              {errors.name?.message && (
                <p id="new-employee-name-error" className="text-error text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-employee-status">
                Situação do funcionário
              </Label>
              <Select
                id="new-employee-status"
                aria-invalid={Boolean(errors.status)}
                aria-required="true"
                aria-describedby={
                  errors.status ? 'new-employee-status-error' : undefined
                }
                {...register('status')}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
              {errors.status?.message && (
                <p
                  id="new-employee-status-error"
                  className="text-error text-sm"
                >
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="new-employee-contact-title">
          <h2
            id="new-employee-contact-title"
            className="text-foreground text-lg font-bold"
          >
            Contato
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-employee-phone">Telefone</Label>
              <Input
                id="new-employee-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-required="true"
                aria-describedby={
                  errors.phone ? 'new-employee-phone-error' : undefined
                }
                {...register('phone')}
              />
              {errors.phone?.message && (
                <p id="new-employee-phone-error" className="text-error text-sm">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-employee-email">E-mail de contato</Label>
              <Input
                id="new-employee-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
                aria-required="true"
                aria-describedby={
                  errors.contactEmail ? 'new-employee-email-error' : undefined
                }
                {...register('contactEmail')}
              />
              {errors.contactEmail?.message && (
                <p id="new-employee-email-error" className="text-error text-sm">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="new-employee-access-title">
          <h2
            id="new-employee-access-title"
            className="text-foreground text-lg font-bold"
          >
            Acesso ao sistema
          </h2>
          <p className="text-neutral mt-2">
            O funcionário será cadastrado sem uma conta de acesso. O acesso é
            criado separadamente após o cadastro.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending
              ? 'Cadastrando funcionário...'
              : 'Cadastrar funcionário'}
          </Button>
          <Link
            to="/employees"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
      {confirmationDialog}
    </AppLayout>
  )
}

export { EmployeeCreatePage }
