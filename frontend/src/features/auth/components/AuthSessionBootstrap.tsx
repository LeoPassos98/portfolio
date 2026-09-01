import { Button } from '../../../components/ui/Button'
import { AuthLayout } from './AuthLayout'

type AuthSessionBootstrapProps = {
  error?: boolean
  onRetry?: () => void
}

function AuthSessionBootstrap({
  error = false,
  onRetry,
}: AuthSessionBootstrapProps) {
  return (
    <AuthLayout>
      <div className="space-y-4">
        <h1 className="text-foreground text-2xl font-bold">
          {error ? 'Não foi possível verificar sua sessão' : 'Verificando sessão'}
        </h1>
        <p className="text-neutral">
          {error
            ? 'Ocorreu uma falha técnica ao verificar sua sessão. Tente novamente.'
            : 'Aguarde enquanto verificamos seu acesso.'}
        </p>
        {error && onRetry ? (
          <Button type="button" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    </AuthLayout>
  )
}

export { AuthSessionBootstrap }
