import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { AuthLayout } from '../components/AuthLayout'
import { loginSchema, type LoginFormData } from '../schemas/loginSchema'

function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  function onSubmit(data: LoginFormData) {
    console.log(data)
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <h1 className="text-foreground text-2xl font-bold">Entrar</h1>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label className="block" htmlFor="email">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              aria-invalid={Boolean(errors.email)}
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
            <Input
              id="password"
              type="password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
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
      </div>
    </AuthLayout>
  )
}

export { LoginPage }
