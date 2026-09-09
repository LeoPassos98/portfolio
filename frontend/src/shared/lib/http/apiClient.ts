import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    csrfRetryAttempted?: boolean
    csrfTokenVersion?: number
    suppressUnauthenticatedSessionHandling?: boolean
  }
}

type CsrfTokenResponse = {
  csrfToken: string
}

type HttpErrorResponse = {
  statusCode: number
  code: string
  message: string
  details?: unknown
}

const apiUrl = import.meta.env.VITE_API_URL?.trim()

if (!apiUrl) {
  throw new Error('VITE_API_URL deve ser definida para comunicar com a API.')
}

export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
})

const csrfProtectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

let csrfToken: string | null = null
let csrfTokenRequest: Promise<string> | null = null
let csrfTokenVersion = 0
let unauthenticatedHandler: (() => void) | null = null

function requiresCsrfToken(config: InternalAxiosRequestConfig): boolean {
  return csrfProtectedMethods.has(config.method?.toUpperCase() ?? '')
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken
  }

  if (!csrfTokenRequest) {
    const tokenVersion = csrfTokenVersion
    let request: Promise<string>

    request = apiClient
      .get<CsrfTokenResponse>('/auth/csrf')
      .then(({ data }) => {
        if (tokenVersion === csrfTokenVersion) {
          csrfToken = data.csrfToken
        }

        return data.csrfToken
      })
      .finally(() => {
        if (csrfTokenRequest === request) {
          csrfTokenRequest = null
        }
      })

    csrfTokenRequest = request
  }

  return csrfTokenRequest
}

export function invalidateCsrfToken(): void {
  csrfToken = null
  csrfTokenRequest = null
  csrfTokenVersion += 1
}

apiClient.interceptors.request.use(async (config) => {
  if (!requiresCsrfToken(config)) {
    return config
  }

  const tokenVersion = csrfTokenVersion

  config.headers.set('X-CSRF-Token', await getCsrfToken())
  config.csrfTokenVersion = tokenVersion

  return config
})

apiClient.interceptors.response.use(undefined, async (error: AxiosError<HttpErrorResponse>) => {
  const requestConfig = error.config
  const response = error.response

  if (
    requestConfig &&
    requiresCsrfToken(requestConfig) &&
    response?.status === 403 &&
    response.data?.code === 'CSRF_INVALID_TOKEN' &&
    !requestConfig.csrfRetryAttempted
  ) {
    requestConfig.csrfRetryAttempted = true

    if (requestConfig.csrfTokenVersion === csrfTokenVersion) {
      invalidateCsrfToken()
    }

    return apiClient.request(requestConfig)
  }

  if (
    response?.status === 401 &&
    response.data?.code === 'AUTH_UNAUTHENTICATED' &&
    !requestConfig?.suppressUnauthenticatedSessionHandling
  ) {
    unauthenticatedHandler?.()
  }

  return Promise.reject(error)
})

export function setUnauthenticatedHandler(
  handler: (() => void) | null,
): () => void {
  unauthenticatedHandler = handler

  return () => {
    if (unauthenticatedHandler === handler) {
      unauthenticatedHandler = null
    }
  }
}

export type { HttpErrorResponse }
