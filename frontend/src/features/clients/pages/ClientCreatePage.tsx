import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useUnsavedChangesGuard } from '../../../components/feedback/useUnsavedChangesGuard'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import {
  clientSchema,
  type ClientFormData,
  type ClientFormValues,
} from '../schemas/clientSchema'

function ClientCreatePage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ClientFormData, unknown, ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      document: '',
      phone: '',
      email: '',
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    },
  })
  const { confirmationDialog, requestNavigation } = useUnsavedChangesGuard(
    isDirty,
  )

  function onSubmit() {
    requestNavigation('/clients')
  }

  return (
    <AppLayout>
      <h1 className="text-foreground text-2xl font-bold">Novo cliente</h1>

      <form
        noValidate
        className="bg-surface mt-6 space-y-8 rounded-ui border border-neutral-bg p-4 sm:p-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <section aria-labelledby="new-client-data-title">
          <h2
            id="new-client-data-title"
            className="text-foreground text-lg font-bold"
          >
            Dados do cliente
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-client-name">Nome</Label>
              <Input
                id="new-client-name"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-required="true"
                aria-describedby={errors.name ? 'new-client-name-error' : undefined}
                {...register('name')}
              />
              {errors.name?.message && (
                <p id="new-client-name-error" className="text-error text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-document">
                CPF/CNPJ (opcional)
              </Label>
              <Input
                id="new-client-document"
                inputMode="numeric"
                aria-invalid={Boolean(errors.document)}
                aria-describedby={
                  errors.document ? 'new-client-document-error' : undefined
                }
                {...register('document')}
              />
              {errors.document?.message && (
                <p id="new-client-document-error" className="text-error text-sm">
                  {errors.document.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="new-client-contact-title">
          <h2
            id="new-client-contact-title"
            className="text-foreground text-lg font-bold"
          >
            Contato
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-client-phone">Telefone / WhatsApp</Label>
              <Input
                id="new-client-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-required="true"
                aria-describedby={errors.phone ? 'new-client-phone-error' : undefined}
                {...register('phone')}
              />
              {errors.phone?.message && (
                <p id="new-client-phone-error" className="text-error text-sm">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-email">E-mail (opcional)</Label>
              <Input
                id="new-client-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'new-client-email-error' : undefined}
                {...register('email')}
              />
              {errors.email?.message && (
                <p id="new-client-email-error" className="text-error text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="new-client-address-title">
          <h2
            id="new-client-address-title"
            className="text-foreground text-lg font-bold"
          >
            Endereço
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-client-postal-code">CEP</Label>
              <Input
                id="new-client-postal-code"
                autoComplete="postal-code"
                inputMode="numeric"
                aria-invalid={Boolean(errors.postalCode)}
                aria-required="true"
                aria-describedby={
                  errors.postalCode ? 'new-client-postal-code-error' : undefined
                }
                {...register('postalCode')}
              />
              {errors.postalCode?.message && (
                <p id="new-client-postal-code-error" className="text-error text-sm">
                  {errors.postalCode.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-client-street">Logradouro</Label>
              <Input
                id="new-client-street"
                autoComplete="street-address"
                aria-invalid={Boolean(errors.street)}
                aria-required="true"
                aria-describedby={
                  errors.street ? 'new-client-street-error' : undefined
                }
                {...register('street')}
              />
              {errors.street?.message && (
                <p id="new-client-street-error" className="text-error text-sm">
                  {errors.street.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-number">Número</Label>
              <Input
                id="new-client-number"
                aria-invalid={Boolean(errors.number)}
                aria-required="true"
                aria-describedby={
                  errors.number ? 'new-client-number-error' : undefined
                }
                {...register('number')}
              />
              {errors.number?.message && (
                <p id="new-client-number-error" className="text-error text-sm">
                  {errors.number.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-complement">
                Complemento (opcional)
              </Label>
              <Input
                id="new-client-complement"
                {...register('complement')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-neighborhood">Bairro</Label>
              <Input
                id="new-client-neighborhood"
                autoComplete="address-level3"
                aria-invalid={Boolean(errors.neighborhood)}
                aria-required="true"
                aria-describedby={
                  errors.neighborhood ? 'new-client-neighborhood-error' : undefined
                }
                {...register('neighborhood')}
              />
              {errors.neighborhood?.message && (
                <p id="new-client-neighborhood-error" className="text-error text-sm">
                  {errors.neighborhood.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-city">Cidade</Label>
              <Input
                id="new-client-city"
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                aria-required="true"
                aria-describedby={errors.city ? 'new-client-city-error' : undefined}
                {...register('city')}
              />
              {errors.city?.message && (
                <p id="new-client-city-error" className="text-error text-sm">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-client-state">UF</Label>
              <Input
                id="new-client-state"
                autoComplete="address-level1"
                maxLength={2}
                aria-invalid={Boolean(errors.state)}
                aria-required="true"
                aria-describedby={errors.state ? 'new-client-state-error' : undefined}
                {...register('state')}
              />
              {errors.state?.message && (
                <p id="new-client-state-error" className="text-error text-sm">
                  {errors.state.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Cadastrar cliente</Button>
          <Link
            to="/clients"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
      {confirmationDialog}
    </AppLayout>
  )
}

export { ClientCreatePage }
