type ClientStatus = 'active' | 'inactive'

type ClientAddress = {
  postalCode: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  document: string | null
  status: ClientStatus
  address: ClientAddress
}

type ClientListItem = {
  id: string
  name: string
  phone: string
  document: string | null
  status: ClientStatus
}

type ClientCepAddress = {
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export type {
  Client,
  ClientAddress,
  ClientCepAddress,
  ClientListItem,
  ClientStatus,
}
