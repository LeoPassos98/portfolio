import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { AuthLayout } from '../components/AuthLayout'

function FirstAccessPage() {
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

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="block" htmlFor="new-password">
              Nova senha
            </Label>
            <Input id="new-password" type="password" />
          </div>

          <div className="space-y-2">
            <Label className="block" htmlFor="confirm-password">
              Confirmar nova senha
            </Label>
            <Input id="confirm-password" type="password" />
          </div>

          <Button className="w-full" type="button">
            Salvar nova senha
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}

export { FirstAccessPage }
