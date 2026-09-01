import axios, { type InternalAxiosRequestConfig } from 'axios'

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

const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
})

const csrfProtectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

let csrfToken: string | null = null
let csrfTokenRequest: Promise<string> | null = null
let csrfTokenVersion = 0

function requiresCsrfToken(config: InternalAxiosRequestConfig): boolean {
  return csrfProtectedMethods.has(config.method?.toUpperCase() ?? '')
}

async function getCsrfToken(): Promise<string> {
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

function invalidateCsrfToken(): void {
  csrfToken = null
  csrfTokenRequest = null
  csrfTokenVersion += 1
}

apiClient.interceptors.request.use(async (config) => {
  if (!requiresCsrfToken(config)) {
    return config
  }

  config.headers.set('X-CSRF-Token', await getCsrfToken())

  return config
})

export { apiClient, getCsrfToken, invalidateCsrfToken }
export type { HttpErrorResponse }
