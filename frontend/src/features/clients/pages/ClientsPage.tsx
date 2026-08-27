import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockClients } from '../mocks/clients'
import type { ClientStatus } from '../types/client'

const clientStatuses: readonly ClientStatus[] = ['active', 'inactive']

function isClientStatus(value: string | null): value is ClientStatus {
  return value !== null && clientStatuses.some((status) => status === value)
}

function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = isClientStatus(statusParam) ? statusParam : 'active'
  const search = searchParams.get('search') ?? ''
  const clientsByStatus =
    statusParam === 'all'
      ? mockClients
      : mockClients.filter((client) => client.status === status)
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const visibleClients = normalizedSearch
    ? clientsByStatus.filter((client) =>
        [client.name, client.document]
          .filter((value): value is string => value !== null)
          .some((value) =>
            value.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
          ),
      )
    : clientsByStatus
  const hasActiveFilters = statusParam === 'inactive' || search.trim() !== ''

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

      {visibleClients.length === 0 && (
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

      {visibleClients.length > 0 && (
        <ul className="mt-8 space-y-4 md:hidden">
          {visibleClients.map((client) => (
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

      {visibleClients.length > 0 && (
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
              {visibleClients.map((client) => (
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
