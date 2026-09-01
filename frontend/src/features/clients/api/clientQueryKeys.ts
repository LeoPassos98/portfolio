import type { ClientListParams } from './clientsApi'

const clientsQueryKeys = {
  all: ['clients'] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
  list: (params: ClientListParams) => ['clients', 'list', params] as const,
  lists: () => ['clients', 'list'] as const,
}

export { clientsQueryKeys }
