import { useForm } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { AuthLayout } from '../components/AuthLayout'

type LoginFormData = {
  email: string
  password: string
}

function LoginPage() {
  const { register, handleSubmit } = useForm<LoginFormData>()

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
            <Input id="email" type="email" {...register('email')} />
          </div>

          <div className="space-y-2">
            <Label className="block" htmlFor="password">
              Senha
            </Label>
            <Input id="password" type="password" {...register('password')} />
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
