import { useRef, useState, type FormEvent } from 'react'
import { useNotifications } from '../../../components/feedback/useNotifications'
import { Button } from '../../../components/ui/Button'
import {
  createDemoAccess,
  type DemoAccessResponse,
  type DemoDataMode,
} from '../api/demoApi'
import { getDemoAccessError } from '../lib/demoAccessError'

type DemoAccessPanelProps = {
  disabled?: boolean
  onFillLogin: (access: DemoAccessResponse) => void
}

const demoModes: { value: DemoDataMode; label: string; description: string }[] =
  [
    {
      value: 'EXEMPLO',
      label: 'Com dados de exemplo',
      description: 'Explore clientes, equipe e ordens já preenchidos.',
    },
    {
      value: 'VAZIO',
      label: 'Ambiente vazio',
      description: 'Comece apenas com a conta administrativa.',
    },
  ]

const deadlineFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

function DemoAccessPanel({
  disabled = false,
  onFillLogin,
}: DemoAccessPanelProps) {
  const [dataMode, setDataMode] = useState<DemoDataMode>('EXEMPLO')
  const [isGenerating, setIsGenerating] = useState(false)
  const [access, setAccess] = useState<DemoAccessResponse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const generatingRef = useRef(false)
  const { showSuccess, showError } = useNotifications()

  async function generateAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || generatingRef.current || access) return

    generatingRef.current = true
    setIsGenerating(true)
    setGenerationError(null)

    try {
      setAccess(await createDemoAccess(dataMode))
    } catch (error) {
      setGenerationError(getDemoAccessError(error))
    } finally {
      generatingRef.current = false
      setIsGenerating(false)
    }
  }

  async function copyCredential(value: string, label: string) {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      showSuccess(`${label} para a área de transferência.`)
    } catch {
      showError(
        'Não foi possível copiar. Selecione o valor e copie manualmente.',
      )
    }
  }

  return (
    <section
      aria-labelledby="demo-access-title"
      className="border-neutral-bg bg-background rounded-ui border p-4 sm:p-5"
    >
      <h2
        id="demo-access-title"
        className="text-foreground text-xl font-semibold"
      >
        Gerar acesso DEMO
      </h2>
      <p className="text-neutral mt-2 text-sm leading-6">
        Quer testar? Gere uma conta temporária, com dados de exemplo ou um
        ambiente vazio. Use apenas dados fictícios.
      </p>

      {access ? (
        <div className="mt-5 space-y-5">
          <p role="status" className="text-foreground text-sm font-medium">
            Seu acesso está pronto. Preencha o formulário de login e clique em
            Entrar para ativar a demonstração.
          </p>
          <dl className="space-y-4">
            {[
              { id: 'demo-email', label: 'E-mail', value: access.login },
              {
                id: 'demo-password',
                label: 'Senha temporária',
                value: access.password,
              },
            ].map((credential) => (
              <div key={credential.id}>
                <dt className="text-foreground text-sm font-medium">
                  {credential.label}
                </dt>
                <dd className="mt-1 flex min-w-0 flex-col gap-2">
                  <code
                    id={credential.id}
                    className="text-foreground break-all text-sm"
                  >
                    {credential.value}
                  </code>
                  <button
                    type="button"
                    aria-label={`Copiar ${credential.label.toLowerCase()} de demonstração`}
                    className="text-primary rounded-ui self-start px-2 py-1 text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() =>
                      void copyCredential(
                        credential.value,
                        credential.id === 'demo-email'
                          ? 'E-mail copiado'
                          : 'Senha copiada',
                      )
                    }
                  >
                    Copiar
                  </button>
                </dd>
              </div>
            ))}
          </dl>
          <dl className="text-neutral space-y-3 text-sm leading-6">
            <div>
              <dt className="text-foreground font-medium">
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
              <dt className="text-foreground font-medium">
                Ambiente válido até
              </dt>
              <dd>
                <time dateTime={access.expiresAt}>
                  {deadlineFormatter.format(new Date(access.expiresAt))}
                </time>
              </dd>
            </div>
          </dl>
          <p className="text-neutral text-xs leading-5">
            Credenciais e dados temporários. Horários no fuso do seu navegador.
            O preenchimento não realiza o login automaticamente.
          </p>
          <Button
            type="button"
            className="w-full"
            disabled={disabled}
            onClick={() => onFillLogin(access)}
          >
            Preencher login
          </Button>
        </div>
      ) : (
        <form
          className="mt-5 space-y-4"
          aria-busy={isGenerating}
          onSubmit={(event) => void generateAccess(event)}
        >
          <fieldset className="space-y-3" disabled={disabled || isGenerating}>
            <legend className="sr-only">
              Tipo de ambiente de demonstração
            </legend>
            {demoModes.map((mode) => (
              <label
                key={mode.value}
                className="border-neutral-bg has-checked:border-primary has-checked:bg-info-bg rounded-ui flex cursor-pointer items-start gap-3 border bg-surface p-3"
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
                  <span className="text-foreground block text-sm font-medium">
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
          <Button
            type="submit"
            className="w-full"
            disabled={disabled || isGenerating}
          >
            {isGenerating ? 'Gerando acesso...' : 'Gerar acesso DEMO'}
          </Button>
          <p className="text-neutral text-xs leading-5">
            Válido por 24 horas, com primeiro login em até 1 hora. A geração
            está sujeita a limites de uso e disponibilidade.
          </p>
        </form>
      )}
    </section>
  )
}

export { DemoAccessPanel }
