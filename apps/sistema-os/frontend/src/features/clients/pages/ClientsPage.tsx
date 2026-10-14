import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { clientsQueryKeys } from '../api/clientQueryKeys'
import { listClients } from '../api/clientsApi'
import type { ClientStatus } from '../types/client'

const clientStatuses = ['active', 'inactive', 'all'] as const

type ClientListStatus = ClientStatus | 'all'

function isClientStatus(value: string | null): value is ClientListStatus {
  return value !== null && clientStatuses.some((status) => status === value)
}

function ClientsListSkeleton() {
  return (
    <>
      <ul className="mt-8 space-y-4 md:hidden" aria-label="Carregando clientes">
        {[0, 1, 2].map((item) => (
          <li
            key={item}
            className="bg-surface animate-pulse rounded-ui border border-neutral-bg p-4"
          >
            <div className="h-5 w-40 rounded bg-neutral-bg" />
            <div className="mt-3 h-4 w-28 rounded bg-neutral-bg" />
            <div className="mt-5 h-4 w-36 rounded bg-neutral-bg" />
          </li>
        ))}
      </ul>

      <div
        className="mt-8 hidden overflow-hidden rounded-ui border border-neutral-bg md:block"
        aria-label="Carregando clientes"
      >
        <div className="bg-neutral-bg h-12" />
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="bg-surface flex animate-pulse gap-8 border-t border-neutral-bg px-4 py-4"
          >
            <div className="h-4 w-1/4 rounded bg-neutral-bg" />
            <div className="h-4 w-1/4 rounded bg-neutral-bg" />
            <div className="h-4 w-1/4 rounded bg-neutral-bg" />
            <div className="h-4 w-16 rounded bg-neutral-bg" />
          </div>
        ))}
      </div>
    </>
  )
}

function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = isClientStatus(statusParam) ? statusParam : 'active'
  const search = searchParams.get('search') ?? ''
  const listParams = {
    status,
    ...(search.trim() === '' ? {} : { search: search.trim() }),
  } as const
  const {
    data: clients = [],
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: clientsQueryKeys.list(listParams),
    queryFn: () => listClients(listParams),
  })
  const hasActiveFilters = status !== 'active' || search.trim() !== ''

  function clearFilters() {
    setSearchParams({})
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-foreground text-2xl font-bold">Clientes</h1>
        <Link
          to="/clients/new"
          className="bg-primary inline-flex rounded-ui px-4 py-2 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Novo cliente
        </Link>
      </div>

      <div className="mt-6 max-w-xs space-y-2">
        <Label htmlFor="client-status">Status</Label>
        <Select
          id="client-status"
          value={status}
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value === 'active') {
              nextSearchParams.delete('status')
            } else {
              nextSearchParams.set('status', event.target.value)
            }

            setSearchParams(nextSearchParams)
          }}
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </Select>
      </div>

      <div className="mt-4 max-w-md space-y-2">
        <Label htmlFor="client-search">Buscar</Label>
        <Input
          id="client-search"
          type="search"
          value={search}
          placeholder="Nome ou CPF/CNPJ"
          onChange={(event) => {
            const nextSearchParams = new URLSearchParams(searchParams)

            if (event.target.value.trim() === '') {
              nextSearchParams.delete('search')
            } else {
              nextSearchParams.set('search', event.target.value)
            }

            setSearchParams(nextSearchParams)
          }}
        />
      </div>

      {isPending && <ClientsListSkeleton />}

      {isError && (
        <div className="mt-8 space-y-4">
          <EmptyState
            title="Não foi possível carregar os clientes"
            description="Verifique sua conexão e tente novamente."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {!isPending && !isError && clients.length === 0 && (
        <div className="mt-8 space-y-4">
          <EmptyState
            title={
              hasActiveFilters
                ? 'Nenhum cliente encontrado'
                : 'Nenhum cliente cadastrado'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou os filtros.'
                : 'Cadastre um cliente para começar a gerenciar as ordens de serviço.'
            }
          />
          {hasActiveFilters && (
            <div className="flex justify-center">
              <Button type="button" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {!isPending && !isError && clients.length > 0 && (
        <ul className="mt-8 space-y-4 md:hidden">
          {clients.map((client) => (
            <li
              key={client.id}
              className="bg-surface rounded-ui border border-neutral-bg p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    to={`/clients/${client.id}/edit`}
                    className="text-primary font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {client.name}
                  </Link>
                  <p className="text-neutral mt-1 text-sm">
                    {client.document ?? 'CPF/CNPJ não informado'}
                  </p>
                </div>
                <StatusBadge
                  variant={client.status === 'active' ? 'success' : 'neutral'}
                >
                  {client.status === 'active' ? 'Ativo' : 'Inativo'}
                </StatusBadge>
              </div>
              <dl className="mt-4">
                <div>
                  <dt className="text-neutral text-xs">Telefone/WhatsApp</dt>
                  <dd className="text-foreground mt-1">{client.phone}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {!isPending && !isError && clients.length > 0 && (
        <div className="mt-8 hidden overflow-hidden rounded-ui border border-neutral-bg md:block">
          <table className="w-full text-left">
            <caption className="sr-only">Lista de clientes</caption>
            <thead className="bg-neutral-bg text-neutral text-sm">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Cliente
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Telefone/WhatsApp
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  CPF/CNPJ
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-neutral-bg">
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3">
                    <Link
                      to={`/clients/${client.id}/edit`}
                      className="text-primary font-medium hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="text-neutral px-4 py-3">{client.phone}</td>
                  <td className="text-neutral px-4 py-3">
                    {client.document ?? 'Não informado'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={
                        client.status === 'active' ? 'success' : 'neutral'
                      }
                    >
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}

export { ClientsPage }
