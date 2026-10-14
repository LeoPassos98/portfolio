import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../hooks/useAuth'
import {
  firstAccessSchema,
  type FirstAccessFormData,
} from '../schemas/firstAccessSchema'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'

function FirstAccessPage() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { changeFirstAccessPassword, session } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FirstAccessFormData>({
    resolver: zodResolver(firstAccessSchema),
  })

  async function handlePasswordChange(input: FirstAccessFormData) {
    setSubmitError(null)

    try {
      await changeFirstAccessPassword({
        password: input.newPassword,
        passwordConfirmation: input.confirmPassword,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (isAxiosError<HttpErrorResponse>(error)) {
        setSubmitError(error.response?.data.message ?? 'Não foi possível salvar a nova senha. Tente novamente.')
        return
      }

      setSubmitError('Não foi possível salvar a nova senha. Tente novamente.')
    }
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!session.mustChangePassword) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-foreground text-2xl font-bold">
            Defina sua nova senha
          </h1>
          <p className="text-neutral mt-2">
            É necessário definir uma nova senha antes de continuar.
          </p>
        </header>

        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(handlePasswordChange)}
        >
          <div className="space-y-2">
            <Label className="block" htmlFor="new-password">
              Nova senha
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              aria-required="true"
              aria-describedby={
                errors.newPassword ? 'new-password-error' : undefined
              }
              {...register('newPassword')}
            />
            {errors.newPassword?.message && (
              <p id="new-password-error" className="text-error text-sm">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="block" htmlFor="confirm-password">
              Confirmar nova senha
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-required="true"
              aria-describedby={
                errors.confirmPassword ? 'confirm-password-error' : undefined
              }
              {...register('confirmPassword')}
            />
            {errors.confirmPassword?.message && (
              <p id="confirm-password-error" className="text-error text-sm">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {submitError ? (
            <p role="alert" className="text-error text-sm">
              {submitError}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}

export { FirstAccessPage }
