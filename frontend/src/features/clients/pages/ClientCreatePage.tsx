import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { useSuccessFeedback } from '../../../components/feedback/useSuccessFeedback'
import { useUnsavedChangesGuard } from '../../../components/feedback/useUnsavedChangesGuard'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import { clientsQueryKeys } from '../api/clientQueryKeys'
import {
  createClient,
  lookupClientCep,
  type ClientHttpErrorResponse,
} from '../api/clientsApi'
import {
  clientSchema,
  type ClientFormData,
  type ClientFormValues,
} from '../schemas/clientSchema'

function isClientApiError(error: unknown, code: ClientHttpErrorResponse['code']) {
  return (
    isAxiosError<HttpErrorResponse>(error) && error.response?.data.code === code
  )
}

function ClientCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccess } = useSuccessFeedback()
  const [formError, setFormError] = useState<string | null>(null)
  const [cepLookupMessage, setCepLookupMessage] = useState<string | null>(null)
  const lastCepLookupRef = useRef<string | null>(null)
  const {
    clearErrors,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
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
  const createMutation = useMutation({
    mutationFn: (values: ClientFormValues) => createClient(values),
  })
  const cepLookupMutation = useMutation({
    mutationFn: (cep: string) => lookupClientCep(cep),
  })
  const { confirmationDialog } = useUnsavedChangesGuard(isDirty)
  const postalCodeField = register('postalCode')

  async function onSubmit(values: ClientFormValues) {
    if (createMutation.isPending) {
      return
    }

    setFormError(null)
    clearErrors('document')

    try {
      const client = await createMutation.mutateAsync(values)

      queryClient.setQueryData(clientsQueryKeys.detail(client.id), client)
      await queryClient.invalidateQueries({
        queryKey: clientsQueryKeys.lists(),
      })
      reset()
      showSuccess('Cliente cadastrado com sucesso.')
      navigate('/clients')
    } catch (error) {
      if (isClientApiError(error, 'CLIENT_DOCUMENT_ALREADY_EXISTS')) {
        setError('document', {
          type: 'server',
          message: 'Este CPF/CNPJ já está cadastrado para outro cliente.',
        })
        return
      }

      setFormError('Não foi possível cadastrar o cliente. Tente novamente.')
    }
  }

  async function lookupPostalCode(value: string) {
    const cep = value.replace(/\D/g, '')

    if (cep.length !== 8 || cep === lastCepLookupRef.current) {
      return
    }

    lastCepLookupRef.current = cep
    setCepLookupMessage(null)

    try {
      const address = await cepLookupMutation.mutateAsync(cep)

      if (lastCepLookupRef.current !== cep) {
        return
      }

      if (address.street !== null) {
        setValue('street', address.street, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      if (address.neighborhood !== null) {
        setValue('neighborhood', address.neighborhood, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      if (address.city !== null) {
        setValue('city', address.city, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      if (address.state !== null) {
        setValue('state', address.state, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    } catch (error) {
      if (lastCepLookupRef.current !== cep) {
        return
      }

      if (isClientApiError(error, 'CEP_NOT_FOUND')) {
        setCepLookupMessage(
          'CEP não encontrado. Preencha o endereço manualmente.',
        )
        return
      }

      if (isClientApiError(error, 'CEP_PROVIDER_UNAVAILABLE')) {
        setCepLookupMessage(
          'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
        )
        return
      }

      setCepLookupMessage(
        'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
      )
    }
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
                aria-busy={cepLookupMutation.isPending}
                aria-describedby={
                  errors.postalCode ? 'new-client-postal-code-error' : undefined
                }
                {...postalCodeField}
                onChange={(event) => {
                  postalCodeField.onChange(event)

                  if (
                    event.target.value.replace(/\D/g, '') !==
                    lastCepLookupRef.current
                  ) {
                    lastCepLookupRef.current = null
                  }
                  setCepLookupMessage(null)
                }}
                onBlur={(event) => {
                  postalCodeField.onBlur(event)
                  void lookupPostalCode(event.target.value)
                }}
              />
              {errors.postalCode?.message && (
                <p id="new-client-postal-code-error" className="text-error text-sm">
                  {errors.postalCode.message}
                </p>
              )}
              {cepLookupMutation.isPending && (
                <p className="text-neutral text-sm" role="status">
                  Buscando endereço...
                </p>
              )}
              {cepLookupMessage && (
                <p className="text-neutral text-sm" role="status">
                  {cepLookupMessage}
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
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar cliente'}
          </Button>
          <Link
            to="/clients"
            className="text-primary inline-flex rounded-ui px-4 py-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancelar
          </Link>
        </div>
        {formError && (
          <p className="text-error text-sm" role="alert">
            {formError}
          </p>
        )}
      </form>
      {confirmationDialog}
    </AppLayout>
  )
}

export { ClientCreatePage }
