import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { mockClients } from '../mocks/clients'
import {
  clientSchema,
  type ClientFormData,
  type ClientFormValues,
} from '../schemas/clientSchema'

const clientStatusDetails = {
  active: { label: 'Ativo', variant: 'success' },
  inactive: { label: 'Inativo', variant: 'neutral' },
} as const

function ClientEditPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const client = mockClients.find((item) => item.id === clientId)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData, unknown, ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? '',
      document: client?.document ?? '',
      phone: client?.phone ?? '',
      email: client?.email ?? '',
      postalCode: client?.address.postalCode ?? '',
      street: client?.address.street ?? '',
      number: client?.address.number ?? '',
      complement: client?.address.complement ?? '',
      neighborhood: client?.address.neighborhood ?? '',
      city: client?.address.city ?? '',
      state: client?.address.state ?? '',
    },
  })

  function onSubmit() {
    navigate('/clients')
  }

  if (!client) {
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

  const clientStatus = clientStatusDetails[client.status]

  return (
    <AppLayout>
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            Editar cliente
          </h1>
          <p className="text-neutral mt-1">{client.name}</p>
        </div>
        <StatusBadge variant={clientStatus.variant}>
          {clientStatus.label}
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
              <Input
                id="edit-client-complement"
                {...register('complement')}
              />
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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Salvar alterações</Button>
          <Link
            to="/clients"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}

export { ClientEditPage }
