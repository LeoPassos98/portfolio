import { isAxiosError } from 'axios'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'

const generationMessages: Record<string, string> = {
  DEMO_PENDING_LIMIT_REACHED:
    'Já existem acessos pendentes demais para esta rede. Use um acesso já gerado ou aguarde para solicitar outro.',
  DEMO_ORIGIN_LIMIT_REACHED:
    'O limite de ambientes ativos desta rede foi atingido. Aguarde até que um deles expire.',
  DEMO_CAPACITY_REACHED:
    'A capacidade pública de demonstração está temporariamente cheia.',
  DEMO_GENERATION_RATE_LIMITED:
    'Foram feitas solicitações demais para esta rede. Aguarde antes de gerar outro acesso.',
}

function getDemoAccessError(error: unknown): string {
  const fallback =
    'Não foi possível gerar o acesso de demonstração. Tente novamente.'

  if (!isAxiosError<HttpErrorResponse>(error)) return fallback

  const message = generationMessages[error.response?.data?.code ?? '']
  if (typeof message !== 'string') return fallback

  const details = error.response?.data?.details
  const retryAfter =
    details && typeof details === 'object' && 'retryAfterSeconds' in details
      ? details.retryAfterSeconds
      : Number(error.response?.headers['retry-after'])

  if (
    typeof retryAfter !== 'number' ||
    !Number.isFinite(retryAfter) ||
    retryAfter <= 0
  ) {
    return message
  }

  const minutes = Math.ceil(retryAfter / 60)
  return `${message} Tente novamente em aproximadamente ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
}

export { getDemoAccessError }
