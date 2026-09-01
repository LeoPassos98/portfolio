import { apiClient } from '../../../shared/lib/http/apiClient'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import type { ClientFormValues } from '../schemas/clientSchema'
import type {
  Client,
  ClientCepAddress,
  ClientListItem,
  ClientStatus,
} from '../types/client'

type ClientListParams = {
  status?: ClientStatus | 'all'
  search?: string
}

type ClientHttpErrorCode =
  | 'CLIENT_NOT_FOUND'
  | 'CLIENT_DOCUMENT_ALREADY_EXISTS'
  | 'CLIENT_HAS_ORDERS'
  | 'CEP_NOT_FOUND'
  | 'CEP_PROVIDER_UNAVAILABLE'

type ClientHttpErrorResponse = HttpErrorResponse & {
  code: ClientHttpErrorCode
}

type ClientListItemHttpResponse = {
  id: string
  nome: string
  telefone: string
  documento: string | null
  ativo: boolean
}

type ClientHttpResponse = {
  id: string
  nome: string
  telefone: string
  documento: string | null
  email: string | null
  cep: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  uf: string
  ativo: boolean
  criadoEm: string
}

type ClientRegistrationRequest = {
  nome: string
  telefone: string
  documento?: string
  email?: string
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

type ClientStatusUpdateRequest = {
  status: ClientStatus
}

type ClientCepLookupHttpResponse = {
  logradouro: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

function toClientStatus(ativo: boolean): ClientStatus {
  return ativo ? 'active' : 'inactive'
}

function toClientListItem(
  client: ClientListItemHttpResponse,
): ClientListItem {
  return {
    id: client.id,
    name: client.nome,
    phone: client.telefone,
    document: client.documento,
    status: toClientStatus(client.ativo),
  }
}

function toClient(client: ClientHttpResponse): Client {
  return {
    id: client.id,
    name: client.nome,
    phone: client.telefone,
    email: client.email,
    document: client.documento,
    status: toClientStatus(client.ativo),
    address: {
      postalCode: client.cep,
      street: client.logradouro,
      number: client.numero,
      complement: client.complemento,
      neighborhood: client.bairro,
      city: client.cidade,
      state: client.uf,
    },
  }
}

function toClientRegistrationRequest(
  values: ClientFormValues,
): ClientRegistrationRequest {
  return {
    nome: values.name,
    telefone: values.phone,
    documento: values.document,
    email: values.email,
    cep: values.postalCode,
    logradouro: values.street,
    numero: values.number,
    complemento: values.complement,
    bairro: values.neighborhood,
    cidade: values.city,
    uf: values.state,
  }
}

function toClientCepAddress(
  address: ClientCepLookupHttpResponse,
): ClientCepAddress {
  return {
    street: address.logradouro,
    neighborhood: address.bairro,
    city: address.cidade,
    state: address.uf,
  }
}

async function listClients(
  { status, search }: ClientListParams = {},
): Promise<ClientListItem[]> {
  const { data } = await apiClient.get<ClientListItemHttpResponse[]>(
    '/clients',
    { params: { status, search } },
  )

  return data.map(toClientListItem)
}

async function getClient(id: string): Promise<Client> {
  const { data } = await apiClient.get<ClientHttpResponse>(`/clients/${id}`)

  return toClient(data)
}

async function createClient(input: ClientFormValues): Promise<Client> {
  const { data } = await apiClient.post<ClientHttpResponse>(
    '/clients',
    toClientRegistrationRequest(input),
  )

  return toClient(data)
}

async function updateClient(
  id: string,
  input: ClientFormValues,
): Promise<Client> {
  const { data } = await apiClient.put<ClientHttpResponse>(
    `/clients/${id}`,
    toClientRegistrationRequest(input),
  )

  return toClient(data)
}

async function updateClientStatus(
  id: string,
  status: ClientStatus,
): Promise<Client> {
  const { data } = await apiClient.patch<ClientHttpResponse>(
    `/clients/${id}/status`,
    { status } satisfies ClientStatusUpdateRequest,
  )

  return toClient(data)
}

async function deleteClient(id: string): Promise<void> {
  await apiClient.delete(`/clients/${id}`)
}

async function lookupClientCep(cep: string): Promise<ClientCepAddress> {
  const { data } = await apiClient.get<ClientCepLookupHttpResponse>(
    `/clients/cep/${encodeURIComponent(cep)}`,
  )

  return toClientCepAddress(data)
}

export {
  createClient,
  deleteClient,
  getClient,
  listClients,
  lookupClientCep,
  toClientCepAddress,
  toClientListItem,
  toClientRegistrationRequest,
  updateClient,
  updateClientStatus,
}
export type {
  ClientCepLookupHttpResponse,
  ClientHttpErrorCode,
  ClientHttpErrorResponse,
  ClientHttpResponse,
  ClientListItemHttpResponse,
  ClientListParams,
  ClientRegistrationRequest,
  ClientStatusUpdateRequest,
}
