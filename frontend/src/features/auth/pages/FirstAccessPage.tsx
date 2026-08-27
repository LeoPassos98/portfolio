import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { AuthLayout } from '../components/AuthLayout'
import {
  firstAccessSchema,
  type FirstAccessFormData,
} from '../schemas/firstAccessSchema'

function FirstAccessPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirstAccessFormData>({
    resolver: zodResolver(firstAccessSchema),
  })

  // Fluxo temporário do protótipo; será substituído pela resposta real do backend.
  function handleMockPasswordChange(_: FirstAccessFormData) {
    navigate('/dashboard')
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
          onSubmit={handleSubmit(handleMockPasswordChange)}
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

          <Button className="w-full" type="submit">
            Salvar nova senha
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}

export { FirstAccessPage }
