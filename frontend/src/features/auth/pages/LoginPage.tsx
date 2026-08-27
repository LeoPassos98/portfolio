import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { AuthLayout } from '../components/AuthLayout'
import { loginSchema, type LoginFormData } from '../schemas/loginSchema'

function LoginPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  function onSubmit(_: LoginFormData) {
    navigate('/dashboard')
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <h1 className="text-foreground text-2xl font-bold">Entrar</h1>

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

          <Button className="w-full" type="submit">
            Entrar
          </Button>
        </form>

        <Link
          to="/first-access"
          className="text-primary inline-flex w-full justify-center rounded-ui px-4 py-2 text-sm font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Simular primeiro acesso
        </Link>
      </div>
    </AuthLayout>
  )
}

export { LoginPage }
