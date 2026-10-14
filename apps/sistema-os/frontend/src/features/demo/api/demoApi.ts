import { apiClient } from '../../../shared/lib/http/apiClient'

type DemoDataMode = 'EXEMPLO' | 'VAZIO'

type DemoAccessResponse = {
  login: string
  password: string
  activationExpiresAt: string
  expiresAt: string
}

async function createDemoAccess(
  dataMode: DemoDataMode,
): Promise<DemoAccessResponse> {
  const { data } = await apiClient.post<DemoAccessResponse>('/demo/access', {
    dataMode,
    tutorialEnabled: false,
  })

  return data
}

export { createDemoAccess }
export type { DemoAccessResponse, DemoDataMode }
