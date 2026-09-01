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
import { loginSchema, type LoginFormData } from '../schemas/loginSchema'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'

function LoginPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login, session, sessionExpiredMessage } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(input: LoginFormData) {
    setSubmitError(null)

    try {
      const nextSession = await login(input)

      navigate(
        nextSession.mustChangePassword ? '/first-access' : '/dashboard',
        { replace: true },
      )
    } catch (error) {
      if (
        isAxiosError<HttpErrorResponse>(error) &&
        error.response?.data.code === 'AUTH_INVALID_CREDENTIALS'
      ) {
        setSubmitError(error.response.data.message)
        return
      }

      setSubmitError('Não foi possível entrar. Tente novamente.')
    }
  }

  if (session) {
    return (
      <Navigate
        to={session.mustChangePassword ? '/first-access' : '/dashboard'}
        replace
      />
    )
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <h1 className="text-foreground text-2xl font-bold">Entrar</h1>

        {sessionExpiredMessage ? (
          <p role="alert" className="text-error text-sm">
            Sua sessão expirou ou foi encerrada. Entre novamente para continuar.
          </p>
        ) : null}

        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label className="block" htmlFor="email">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoCapitalize="none"
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
              aria-required="true"
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email?.message && (
              <p id="email-error" className="text-error text-sm">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="block" htmlFor="password">
              Senha
            </Label>
            <div className="relative">
              <Input
                className="pr-20"
                id="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-required="true"
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                {...register('password')}
              />
              <button
                className="text-primary focus-visible:ring-primary absolute inset-y-0 right-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
                type="button"
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible((visible) => !visible)}
              >
                {isPasswordVisible ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password?.message && (
              <p id="password-error" className="text-error text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          {submitError ? (
            <p role="alert" className="text-error text-sm">
              {submitError}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}

export { LoginPage }
