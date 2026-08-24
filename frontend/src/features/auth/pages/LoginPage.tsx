import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { AuthLayout } from '../components/AuthLayout'

function LoginPage() {
  return (
    <AuthLayout>
      <div className="space-y-6">
        <h1 className="text-foreground text-2xl font-bold">Entrar</h1>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="block" htmlFor="email">
              E-mail
            </Label>
            <Input id="email" type="email" />
          </div>

          <div className="space-y-2">
            <Label className="block" htmlFor="password">
              Senha
            </Label>
            <Input id="password" type="password" />
          </div>

          <Button className="w-full" type="button">
            Entrar
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}

export { LoginPage }
