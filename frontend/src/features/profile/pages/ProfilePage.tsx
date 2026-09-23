import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useNotifications } from '../../../components/feedback/useNotifications'
import { useUnsavedChangesGuard } from '../../../components/feedback/useUnsavedChangesGuard'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { HttpErrorResponse } from '../../../shared/lib/http/apiClient'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  changeProfilePassword,
  getProfile,
  updateProfile,
  type ProfileHttpErrorResponse,
} from '../api/profileApi'
import { profileQueryKeys } from '../api/profileQueryKeys'
import {
  profilePasswordUpdateSchema,
  profileUpdateSchema,
  type ProfilePasswordUpdateFormData,
  type ProfileUpdateFormData,
  type ProfileUpdateFormValues,
} from '../schemas/profileSchema'

const accountProfileLabels = {
  administrator: 'Administrador',
  employee: 'Funcionário',
} as const

const employeeStatusDetails = {
  active: { label: 'Ativo', variant: 'success' },
  inactive: { label: 'Inativo', variant: 'neutral' },
} as const

const accountStatusDetails = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'neutral' },
} as const

function isProfileApiError(
  error: unknown,
  code: ProfileHttpErrorResponse['code'],
) {
  return (
    isAxiosError<HttpErrorResponse>(error) && error.response?.data.code === code
  )
}

function ProfileSkeleton() {
  return (
    <AppLayout>
      <div className="animate-pulse" aria-label="Carregando meu perfil">
        <div className="h-8 w-44 rounded bg-neutral-bg" />
        <div className="mt-3 h-5 w-72 rounded bg-neutral-bg" />
        <div className="bg-surface mt-6 space-y-5 rounded-ui border border-neutral-bg p-4 sm:p-6">
          <div className="h-6 w-40 rounded bg-neutral-bg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded bg-neutral-bg" />
            <div className="h-10 rounded bg-neutral-bg" />
          </div>
          <div className="h-24 rounded bg-neutral-bg" />
        </div>
      </div>
    </AppLayout>
  )
}

function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clearSession, session, synchronizeCurrentUser } = useAuth()
  const { showSuccess } = useNotifications()
  const [profileSubmitError, setProfileSubmitError] = useState<string | null>(
    null,
  )
  const [passwordSubmitError, setPasswordSubmitError] = useState<
    string | null
  >(null)
  const {
    data: profile,
    isError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: profileQueryKeys.detail(),
    queryFn: getProfile,
  })
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: {
      errors: profileErrors,
      isDirty: isProfileDirty,
      isSubmitting: isProfileSubmitting,
    },
  } = useForm<
    ProfileUpdateFormData,
    unknown,
    ProfileUpdateFormValues
  >({
    resolver: zodResolver(profileUpdateSchema),
    values: profile
      ? {
          name: profile.name,
          phone: profile.phone,
        }
      : undefined,
    resetOptions: { keepDirtyValues: true },
    defaultValues: { name: '', phone: '' },
  })
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    setError: setPasswordFieldError,
    formState: {
      errors: passwordErrors,
      isDirty: isPasswordDirty,
      isSubmitting: isPasswordSubmitting,
    },
  } = useForm<ProfilePasswordUpdateFormData>({
    resolver: zodResolver(profilePasswordUpdateSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      newPasswordConfirmation: '',
    },
  })
  const { confirmationDialog } = useUnsavedChangesGuard(
    isProfileDirty || isPasswordDirty,
  )
  const profileMutation = useMutation({
    mutationFn: (values: ProfileUpdateFormValues) =>
      updateProfile({ nome: values.name, telefone: values.phone }),
  })
  const passwordMutation = useMutation({
    mutationFn: changeProfilePassword,
  })
  const isProfileSavePending =
    isProfileSubmitting || profileMutation.isPending

  async function onProfileSubmit(values: ProfileUpdateFormValues) {
    setProfileSubmitError(null)

    try {
      const updatedProfile = await profileMutation.mutateAsync(values)

      queryClient.setQueryData(profileQueryKeys.detail(), updatedProfile)
      if (session) {
        synchronizeCurrentUser({
          employeeId: session.currentUser.employeeId,
          name: updatedProfile.name,
          profile: session.currentUser.profile,
        })
      }
      resetProfile({
        name: updatedProfile.name,
        phone: updatedProfile.phone,
      })
      showSuccess('Perfil atualizado com sucesso.')
    } catch {
      setProfileSubmitError(
        'Não foi possível salvar as alterações. Seus dados foram preservados para uma nova tentativa.',
      )
    }
  }

  async function onPasswordSubmit(values: ProfilePasswordUpdateFormData) {
    setPasswordSubmitError(null)

    try {
      await passwordMutation.mutateAsync(values)
      resetPassword()
      clearSession()
      showSuccess('Senha alterada. Entre novamente com a nova senha.')
      navigate('/login', { replace: true })
    } catch (error) {
      if (isProfileApiError(error, 'PROFILE_CURRENT_PASSWORD_INCORRECT')) {
        setPasswordFieldError('currentPassword', {
          type: 'server',
          message: 'A senha atual está incorreta.',
        })
        return
      }

      setPasswordSubmitError(
        'Não foi possível alterar a senha. Verifique os dados e tente novamente.',
      )
    }
  }

  if (isPending) {
    return <ProfileSkeleton />
  }

  if (isError || !profile) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <EmptyState
            title="Não foi possível carregar seu perfil"
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

  const employeeStatus = employeeStatusDetails[profile.employeeStatus]
  const accountStatus = accountStatusDetails[profile.accountStatus]

  return (
    <AppLayout>
      <header>
        <h1 className="text-foreground text-2xl font-bold">Meu perfil</h1>
        <p className="text-neutral mt-1">
          Consulte seus dados e mantenha suas informações pessoais atualizadas.
        </p>
      </header>

      <section
        aria-labelledby="personal-data-title"
        className="bg-surface mt-6 rounded-ui border border-neutral-bg p-4 sm:p-6"
      >
        <h2 id="personal-data-title" className="text-foreground text-lg font-bold">
          Dados pessoais
        </h2>
        <p className="text-neutral mt-1 text-sm">
          Você pode alterar seu nome e telefone. Os demais dados são informativos.
        </p>

        <form
          noValidate
          className="mt-5 space-y-5"
          onSubmit={handleSubmitProfile(onProfileSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="block" htmlFor="profile-name">
                Nome
              </Label>
              <Input
                id="profile-name"
                autoComplete="name"
                aria-invalid={Boolean(profileErrors.name)}
                aria-describedby={profileErrors.name ? 'profile-name-error' : undefined}
                {...registerProfile('name')}
              />
              {profileErrors.name?.message ? (
                <p id="profile-name-error" className="text-error text-sm">
                  {profileErrors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="block" htmlFor="profile-phone">
                Telefone
              </Label>
              <Input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(profileErrors.phone)}
                aria-describedby={profileErrors.phone ? 'profile-phone-error' : undefined}
                {...registerProfile('phone')}
              />
              {profileErrors.phone?.message ? (
                <p id="profile-phone-error" className="text-error text-sm">
                  {profileErrors.phone.message}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="grid gap-5 border-t border-neutral-bg pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-neutral text-sm">E-mail de contato</dt>
              <dd className="text-foreground mt-1 break-words font-medium">
                {profile.contactEmail}
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Perfil da conta</dt>
              <dd className="text-foreground mt-1 font-medium">
                {accountProfileLabels[profile.accountProfile]}
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Situação do funcionário</dt>
              <dd className="mt-2">
                <StatusBadge variant={employeeStatus.variant}>
                  {employeeStatus.label}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-neutral text-sm">Situação da conta</dt>
              <dd className="mt-2">
                <StatusBadge variant={accountStatus.variant}>
                  {accountStatus.label}
                </StatusBadge>
              </dd>
            </div>
          </dl>

          {profileSubmitError ? (
            <p role="alert" className="text-error text-sm">
              {profileSubmitError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={!isProfileDirty || isProfileSavePending}
          >
            {isProfileSavePending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </section>

      <section
        aria-labelledby="security-title"
        className="bg-surface mt-6 rounded-ui border border-neutral-bg p-4 sm:p-6"
      >
        <h2 id="security-title" className="text-foreground text-lg font-bold">
          Segurança
        </h2>
        <p className="text-neutral mt-1 text-sm">
          Ao alterar sua senha, todas as sessões serão encerradas e será necessário entrar novamente.
        </p>

        <form
          noValidate
          className="mt-5 space-y-4"
          onSubmit={handleSubmitPassword(onPasswordSubmit)}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="block" htmlFor="current-password">
                Senha atual
              </Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(passwordErrors.currentPassword)}
                aria-describedby={
                  passwordErrors.currentPassword
                    ? 'current-password-error'
                    : undefined
                }
                {...registerPassword('currentPassword')}
              />
              {passwordErrors.currentPassword?.message ? (
                <p id="current-password-error" className="text-error text-sm">
                  {passwordErrors.currentPassword.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="block" htmlFor="profile-new-password">
                Nova senha
              </Label>
              <Input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordErrors.newPassword)}
                aria-describedby={
                  passwordErrors.newPassword
                    ? 'profile-new-password-error'
                    : undefined
                }
                {...registerPassword('newPassword')}
              />
              {passwordErrors.newPassword?.message ? (
                <p
                  id="profile-new-password-error"
                  className="text-error text-sm"
                >
                  {passwordErrors.newPassword.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="block" htmlFor="profile-password-confirmation">
                Confirmação da nova senha
              </Label>
              <Input
                id="profile-password-confirmation"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordErrors.newPasswordConfirmation)}
                aria-describedby={
                  passwordErrors.newPasswordConfirmation
                    ? 'profile-password-confirmation-error'
                    : undefined
                }
                {...registerPassword('newPasswordConfirmation')}
              />
              {passwordErrors.newPasswordConfirmation?.message ? (
                <p
                  id="profile-password-confirmation-error"
                  className="text-error text-sm"
                >
                  {passwordErrors.newPasswordConfirmation.message}
                </p>
              ) : null}
            </div>
          </div>

          {passwordSubmitError ? (
            <p role="alert" className="text-error text-sm">
              {passwordSubmitError}
            </p>
          ) : null}

          <Button type="submit" disabled={isPasswordSubmitting}>
            {isPasswordSubmitting ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </form>
      </section>

      {confirmationDialog}
    </AppLayout>
  )
}

export { ProfilePage }
