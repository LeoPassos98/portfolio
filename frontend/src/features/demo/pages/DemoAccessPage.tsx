import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useNotifications } from '../../../components/feedback/useNotifications'
import { PublicLayout } from '../../../components/layout/PublicLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  createDemoAccess,
  type DemoAccessResponse,
  type DemoDataMode,
} from '../api/demoApi'
import { getDemoAccessError } from '../lib/demoAccessError'

const demoModes: { value: DemoDataMode; label: string; description: string }[] =
  [
    {
      value: 'EXEMPLO',
      label: 'Com dados de exemplo',
      description:
        'Explore clientes, equipe e ordens de serviço já preenchidos.',
    },
    {
      value: 'VAZIO',
      label: 'Ambiente vazio',
      description:
        'Comece apenas com a conta administrativa e cadastre os dados por conta própria.',
    },
  ]

const deadlineFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

function DemoAccessPage() {
  const [dataMode, setDataMode] = useState<DemoDataMode>('EXEMPLO')
  const [isGenerating, setIsGenerating] = useState(false)
  const [access, setAccess] = useState<DemoAccessResponse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const { session } = useAuth()
  const { showSuccess, showError } = useNotifications()
  const navigate = useNavigate()

  async function generateAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (session || isGenerating || access) return

    setIsGenerating(true)
    setGenerationError(null)

    try {
      setAccess(await createDemoAccess(dataMode))
    } catch (error) {
      setGenerationError(getDemoAccessError(error))
    } finally {
      setIsGenerating(false)
    }
  }

  async function copyCredential(value: string, label: string) {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      showSuccess(
        `${label === 'Senha' ? 'Senha copiada' : 'E-mail copiado'} para a área de transferência.`,
      )
    } catch {
      showError(
        'Não foi possível copiar. Selecione o valor e copie manualmente.',
      )
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-start lg:gap-16">
        <header>
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Demonstração · Sistema OS
          </p>
          <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Teste o sistema em um ambiente temporário
          </h1>
          <p className="text-neutral mt-5 text-lg leading-8">
            Explore a aplicação em um ambiente isolado, com dados temporários e
            uma conta própria para demonstração.
          </p>
          <ul className="text-neutral mt-6 space-y-3 text-sm leading-6">
            <li>O ambiente dura 24 horas a partir da geração do acesso.</li>
            <li>Faça o primeiro login em até 1 hora para ativá-lo.</li>
            <li>
              Use apenas dados fictícios: tudo neste ambiente é temporário.
            </li>
            <li>
              Existem limites de uso para proteger a demonstração pública.
            </li>
          </ul>
          <Link
            to="/projetos/sistema-os"
            className="text-primary rounded-ui mt-7 inline-block text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Conhecer o projeto
          </Link>
        </header>

        <section
          aria-labelledby="demo-access-title"
          className="border-neutral-bg rounded-2xl border bg-surface p-6 shadow-sm sm:p-8"
        >
          {session ? (
            <div className="space-y-5">
              <h2
                id="demo-access-title"
                className="text-foreground text-xl font-bold"
              >
                Você já está no sistema
              </h2>
              <p className="text-neutral leading-7">
                Há uma sessão ativa neste navegador. Continue no seu ambiente
                atual para preservar este acesso.
              </p>
              <Link
                to={session.mustChangePassword ? '/first-access' : '/dashboard'}
                className="bg-primary hover:bg-primary-hover rounded-ui inline-flex justify-center px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {session.mustChangePassword
                  ? 'Continuar configuração'
                  : 'Voltar ao sistema'}
              </Link>
            </div>
          ) : access ? (
            <div className="space-y-6">
              <h2
                id="demo-access-title"
                className="text-foreground text-xl font-bold"
                role="status"
              >
                Seu acesso está pronto
              </h2>
              <div className="border-warning/25 bg-warning-bg text-warning rounded-ui border p-4 text-sm leading-6">
                <p className="font-semibold">
                  Estas credenciais são temporárias.
                </p>
                <p className="mt-1">
                  Na próxima tela, entre com esta conta para ativar e explorar o
                  ambiente.
                </p>
              </div>

              {[
                { id: 'demo-email', label: 'E-mail', value: access.login },
                { id: 'demo-password', label: 'Senha', value: access.password },
              ].map((credential) => (
                <div key={credential.id} className="space-y-2">
                  <Label className="block" htmlFor={credential.id}>
                    {credential.label}
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id={credential.id}
                      value={credential.value}
                      readOnly
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 font-mono text-sm sm:flex-1"
                    />
                    <Button
                      type="button"
                      aria-label={`Copiar ${credential.label.toLowerCase()} de demonstração`}
                      onClick={() =>
                        void copyCredential(credential.value, credential.label)
                      }
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              ))}

              <dl className="text-neutral space-y-3 text-sm leading-6">
                <div>
                  <dt className="text-foreground font-semibold">
                    Primeiro login até
                  </dt>
                  <dd>
                    <time dateTime={access.activationExpiresAt}>
                      {deadlineFormatter.format(
                        new Date(access.activationExpiresAt),
                      )}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground font-semibold">
                    Ambiente válido até
                  </dt>
                  <dd>
                    <time dateTime={access.expiresAt}>
                      {deadlineFormatter.format(new Date(access.expiresAt))}
                    </time>
                  </dd>
                </div>
              </dl>
              <p className="text-neutral text-xs">
                Horários no fuso local do seu navegador.
              </p>

              <Button
                type="button"
                className="w-full"
                onClick={() =>
                  navigate('/login', {
                    state: {
                      demoCredentials: {
                        email: access.login,
                        password: access.password,
                      },
                    },
                  })
                }
              >
                Continuar para o login
              </Button>
            </div>
          ) : (
            <form
              className="space-y-6"
              onSubmit={(event) => void generateAccess(event)}
              aria-busy={isGenerating}
            >
              <h2
                id="demo-access-title"
                className="text-foreground text-xl font-bold"
              >
                Como você quer explorar?
              </h2>
              <fieldset className="space-y-3" disabled={isGenerating}>
                <legend className="sr-only">
                  Tipo de ambiente de demonstração
                </legend>
                {demoModes.map((mode) => (
                  <label
                    key={mode.value}
                    className="border-neutral-bg has-checked:border-primary has-checked:bg-info-bg rounded-ui flex cursor-pointer items-start gap-3 border p-4"
                  >
                    <input
                      type="radio"
                      name="dataMode"
                      value={mode.value}
                      checked={dataMode === mode.value}
                      onChange={() => setDataMode(mode.value)}
                      aria-describedby={`demo-mode-${mode.value}`}
                      className="accent-primary mt-1 h-4 w-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    />
                    <span>
                      <span className="text-foreground block text-sm font-semibold">
                        {mode.label}
                      </span>
                      <span
                        id={`demo-mode-${mode.value}`}
                        className="text-neutral mt-1 block text-sm leading-6"
                      >
                        {mode.description}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {generationError && (
                <p role="alert" className="text-error text-sm leading-6">
                  {generationError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating
                  ? 'Gerando acesso...'
                  : 'Gerar acesso de demonstração'}
              </Button>
              <p className="text-neutral text-sm leading-6">
                O e-mail de acesso e a senha temporária serão mostrados nesta
                tela. O ambiente será ativado ao entrar no sistema.
              </p>
            </form>
          )}
        </section>
      </div>
    </PublicLayout>
  )
}

export { DemoAccessPage }
