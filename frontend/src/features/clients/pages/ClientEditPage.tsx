import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmationDialog } from '../../../components/feedback/ConfirmationDialog'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useSuccessFeedback } from '../../../components/feedback/useSuccessFeedback'
import { useUnsavedChangesGuard } from '../../../components/feedback/useUnsavedChangesGuard'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { clientsQueryKeys } from '../api/clientQueryKeys'
import {
  deleteClient,
  getClient,
  updateClient,
  updateClientStatus,
  type ClientHttpErrorResponse,
} from '../api/clientsApi'
import {
  clientSchema,
  type ClientFormData,
  type ClientFormValues,
} from '../schemas/clientSchema'
import type { Client, ClientStatus } from '../types/client'

const clientStatusDetails = {
  active: { label: 'Ativo', variant: 'success' },
  inactive: { label: 'Inativo', variant: 'neutral' },
} as const

function isClientApiError(error: unknown, code: ClientHttpErrorResponse['code']) {
  return (
    isAxiosError<HttpErrorResponse>(error) && error.response?.data.code === code
  )
}

function toClientFormData(client: Client): ClientFormData {
  return {
    name: client.name,
    document: client.document ?? '',
    phone: client.phone,
    email: client.email ?? '',
    postalCode: client.address.postalCode,
    street: client.address.street,
    number: client.address.number,
    complement: client.address.complement ?? '',
    neighborhood: client.address.neighborhood,
    city: client.address.city,
    state: client.address.state,
  }
}

function ClientEditSkeleton() {
  return (
    <AppLayout>
      <div className="animate-pulse" aria-label="Carregando cliente">
        <div className="h-8 w-48 rounded bg-neutral-bg" />
        <div className="mt-3 h-5 w-64 rounded bg-neutral-bg" />
        <div className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-4">
              <div className="h-6 w-40 rounded bg-neutral-bg" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-10 rounded bg-neutral-bg" />
                <div className="h-10 rounded bg-neutral-bg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

type ClientEditFormProps = {
  canChangeClientStatus: boolean
  client: Client
}

function ClientEditForm({ canChangeClientStatus, client }: ClientEditFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccess } = useSuccessFeedback()
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const {
    clearErrors,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ClientFormData, unknown, ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: toClientFormData(client),
  })
  const { confirmationDialog } = useUnsavedChangesGuard(isDirty)
  const updateMutation = useMutation({
    mutationFn: (values: ClientFormValues) => updateClient(client.id, values),
  })
  const statusMutation = useMutation({
    mutationFn: (status: ClientStatus) => updateClientStatus(client.id, status),
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(client.id),
  })

  async function synchronizeClient(updatedClient: Client) {
    queryClient.setQueryData(
      clientsQueryKeys.detail(updatedClient.id),
      updatedClient,
    )
    await queryClient.invalidateQueries({
      queryKey: clientsQueryKeys.lists(),
    })
  }

  async function onSubmit(values: ClientFormValues) {
    setFormError(null)
    clearErrors('document')

    try {
      const updatedClient = await updateMutation.mutateAsync(values)

      await synchronizeClient(updatedClient)
      reset(toClientFormData(updatedClient))
      showSuccess('Cliente atualizado com sucesso.')
      navigate('/clients')
    } catch (error) {
      if (isClientApiError(error, 'CLIENT_DOCUMENT_ALREADY_EXISTS')) {
        setError('document', {
          type: 'server',
          message: 'Este CPF/CNPJ já está cadastrado para outro cliente.',
        })
        return
      }

      setFormError('Não foi possível salvar as alterações. Tente novamente.')
    }
  }

  async function handleStatusChange(status: ClientStatus) {
    if (status === client.status) {
      return
    }

    setStatusError(null)

    try {
      const updatedClient = await statusMutation.mutateAsync(status)

      await synchronizeClient(updatedClient)
      showSuccess(
        status === 'inactive'
          ? 'Cliente desativado com sucesso.'
          : 'Cliente reativado com sucesso.',
      )
    } catch {
      setStatusError('Não foi possível atualizar a situação. Tente novamente.')
    }
  }

  async function handleDelete() {
    setDeleteError(null)

    try {
      await deleteMutation.mutateAsync()

      queryClient.removeQueries({
        queryKey: clientsQueryKeys.detail(client.id),
        exact: true,
      })
      await queryClient.invalidateQueries({
        queryKey: clientsQueryKeys.lists(),
      })
      setIsDeleteConfirmationOpen(false)
      showSuccess('Cliente excluído com sucesso.')
      navigate('/clients')
    } catch (error) {
      setIsDeleteConfirmationOpen(false)
      setDeleteError(
        isClientApiError(error, 'CLIENT_HAS_ORDERS')
          ? 'Este cliente possui OS vinculada e deve ser desativado.'
          : 'Não foi possível excluir o cliente. Tente novamente.',
      )
    }
  }

  const clientStatusDetail = clientStatusDetails[client.status]

  return (
    <AppLayout>
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            Editar cliente
          </h1>
          <p className="text-neutral mt-1">{client.name}</p>
        </div>
        <StatusBadge variant={clientStatusDetail.variant}>
          {clientStatusDetail.label}
        </StatusBadge>
      </header>

      <form
        noValidate
        className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <section aria-labelledby="edit-client-data-title">
          <h2
            id="edit-client-data-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do cliente
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-client-name">Nome</Label>
              <Input
                id="edit-client-name"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-required="true"
                aria-describedby={errors.name ? 'edit-client-name-error' : undefined}
                {...register('name')}
              />
              {errors.name?.message && (
                <p id="edit-client-name-error" className="text-error text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-document">
                CPF/CNPJ (opcional)
              </Label>
              <Input
                id="edit-client-document"
                inputMode="numeric"
                aria-invalid={Boolean(errors.document)}
                aria-describedby={
                  errors.document ? 'edit-client-document-error' : undefined
                }
                {...register('document')}
              />
              {errors.document?.message && (
                <p id="edit-client-document-error" className="text-error text-sm">
                  {errors.document.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-client-contact-title">
          <h2
            id="edit-client-contact-title"
            className="text-foreground text-lg font-bold"
          >
            Contato
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-phone">Telefone / WhatsApp</Label>
              <Input
                id="edit-client-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-required="true"
                aria-describedby={errors.phone ? 'edit-client-phone-error' : undefined}
                {...register('phone')}
              />
              {errors.phone?.message && (
                <p id="edit-client-phone-error" className="text-error text-sm">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-email">E-mail (opcional)</Label>
              <Input
                id="edit-client-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'edit-client-email-error' : undefined}
                {...register('email')}
              />
              {errors.email?.message && (
                <p id="edit-client-email-error" className="text-error text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-client-address-title">
          <h2
            id="edit-client-address-title"
            className="text-foreground text-lg font-bold"
          >
            Endereço
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-postal-code">CEP</Label>
              <Input
                id="edit-client-postal-code"
                autoComplete="postal-code"
                inputMode="numeric"
                aria-invalid={Boolean(errors.postalCode)}
                aria-required="true"
                aria-describedby={
                  errors.postalCode ? 'edit-client-postal-code-error' : undefined
                }
                {...register('postalCode')}
              />
              {errors.postalCode?.message && (
                <p id="edit-client-postal-code-error" className="text-error text-sm">
                  {errors.postalCode.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-client-street">Logradouro</Label>
              <Input
                id="edit-client-street"
                autoComplete="street-address"
                aria-invalid={Boolean(errors.street)}
                aria-required="true"
                aria-describedby={
                  errors.street ? 'edit-client-street-error' : undefined
                }
                {...register('street')}
              />
              {errors.street?.message && (
                <p id="edit-client-street-error" className="text-error text-sm">
                  {errors.street.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-number">Número</Label>
              <Input
                id="edit-client-number"
                aria-invalid={Boolean(errors.number)}
                aria-required="true"
                aria-describedby={
                  errors.number ? 'edit-client-number-error' : undefined
                }
                {...register('number')}
              />
              {errors.number?.message && (
                <p id="edit-client-number-error" className="text-error text-sm">
                  {errors.number.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-complement">
                Complemento (opcional)
              </Label>
              <Input id="edit-client-complement" {...register('complement')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-neighborhood">Bairro</Label>
              <Input
                id="edit-client-neighborhood"
                autoComplete="address-level3"
                aria-invalid={Boolean(errors.neighborhood)}
                aria-required="true"
                aria-describedby={
                  errors.neighborhood ? 'edit-client-neighborhood-error' : undefined
                }
                {...register('neighborhood')}
              />
              {errors.neighborhood?.message && (
                <p id="edit-client-neighborhood-error" className="text-error text-sm">
                  {errors.neighborhood.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-city">Cidade</Label>
              <Input
                id="edit-client-city"
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                aria-required="true"
                aria-describedby={errors.city ? 'edit-client-city-error' : undefined}
                {...register('city')}
              />
              {errors.city?.message && (
                <p id="edit-client-city-error" className="text-error text-sm">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-state">UF</Label>
              <Input
                id="edit-client-state"
                autoComplete="address-level1"
                maxLength={2}
                aria-invalid={Boolean(errors.state)}
                aria-required="true"
                aria-describedby={errors.state ? 'edit-client-state-error' : undefined}
                {...register('state')}
              />
              {errors.state?.message && (
                <p id="edit-client-state-error" className="text-error text-sm">
                  {errors.state.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {formError && (
          <p role="alert" className="text-error text-sm">
            {formError}
          </p>
        )}

        {canChangeClientStatus ? (
          <section aria-labelledby="edit-client-status-title">
            <h2
              id="edit-client-status-title"
              className="text-foreground text-lg font-bold"
            >
              Situação do cliente
            </h2>

            <div className="mt-4 max-w-xs space-y-2">
              <Label htmlFor="edit-client-status">Situação</Label>
              <Select
                id="edit-client-status"
                value={client.status}
                disabled={statusMutation.isPending}
                aria-describedby={statusError ? 'edit-client-status-error' : undefined}
                onChange={(event) => {
                  void handleStatusChange(event.target.value as ClientStatus)
                }}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
              {statusMutation.isPending && (
                <p className="text-neutral text-sm">Atualizando situação...</p>
              )}
              {statusError && (
                <p id="edit-client-status-error" role="alert" className="text-error text-sm">
                  {statusError}
                </p>
              )}
            </div>
          </section>
        ) : null}

        {canChangeClientStatus ? (
          <section aria-labelledby="delete-client-title">
            <h2
              id="delete-client-title"
              className="text-foreground text-lg font-bold"
            >
              Excluir cliente
            </h2>
            <p className="text-neutral mt-2 text-sm">
              Esta ação será permanente e não poderá ser desfeita.
            </p>
            {deleteError && (
              <p role="alert" className="text-error mt-2 text-sm">
                {deleteError}
              </p>
            )}
            <Button
              type="button"
              disabled={deleteMutation.isPending}
              className="mt-4"
              onClick={() => setIsDeleteConfirmationOpen(true)}
            >
              Excluir cliente
            </Button>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Salvando alterações...' : 'Salvar alterações'}
          </Button>
          <Link
            to="/clients"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={isDeleteConfirmationOpen}
        isPending={deleteMutation.isPending}
        title="Excluir este cliente?"
        description="Esta ação é permanente e não poderá ser desfeita."
        confirmLabel="Confirmar exclusão"
        onCancel={() => setIsDeleteConfirmationOpen(false)}
        onConfirm={() => void handleDelete()}
      />
      {confirmationDialog}
    </AppLayout>
  )
}

function ClientEditPage() {
  const session = useAuthSession()
  const { clientId } = useParams<{ clientId: string }>()
  const {
    data: client,
    error,
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: clientsQueryKeys.detail(clientId ?? ''),
    queryFn: () => getClient(clientId!),
    enabled: Boolean(clientId),
  })
  const canChangeClientStatus = session?.currentUser.profile === 'admin'

  if (!clientId || isClientApiError(error, 'CLIENT_NOT_FOUND')) {
    return (
      <AppLayout>
        <Link
          to="/clients"
          className="text-primary inline-flex rounded-ui hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Voltar para Clientes
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Cliente não encontrado"
            description="Não foi possível localizar o cliente solicitado para edição."
          />
        </div>
      </AppLayout>
    )
  }

  if (isPending) {
    return <ClientEditSkeleton />
  }

  if (isError || !client) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <EmptyState
            title="Não foi possível carregar o cliente"
            description="Verifique sua conexão e tente novamente."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <ClientEditForm
      key={client.id}
      client={client}
      canChangeClientStatus={canChangeClientStatus}
    />
  )
}

export { ClientEditPage }
