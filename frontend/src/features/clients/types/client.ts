type ClientStatus = 'active' | 'inactive'

type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  document: string | null
  status: ClientStatus
  address: {
    postalCode: string
    street: string
    number: string
    complement: string | null
    neighborhood: string
    city: string
    state: string
  }
}

export type { Client, ClientStatus }
