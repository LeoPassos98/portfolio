type ClientStatus = 'active' | 'inactive'

type Client = {
  id: string
  name: string
  phone: string
  document: string | null
  status: ClientStatus
}

export type { Client, ClientStatus }
