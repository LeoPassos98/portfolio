import { useCallback, useEffect, useState } from 'react'
import {
  useBeforeUnload,
  useNavigate,
  type NavigateOptions,
  type To,
} from 'react-router'
import { ConfirmationDialog } from './ConfirmationDialog'

type PendingNavigation = {
  options?: NavigateOptions
  to: To
}

function useUnsavedChangesGuard(isDirty: boolean) {
  const navigate = useNavigate()
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null)

  const requestNavigation = useCallback(
    (to: To, options?: NavigateOptions) => {
      if (!isDirty) {
        navigate(to, options)
        return
      }

      setPendingNavigation({ to, options })
    },
    [isDirty, navigate],
  )

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isDirty) {
          return
        }

        event.preventDefault()
        event.returnValue = ''
      },
      [isDirty],
    ),
  )

  useEffect(() => {
    if (!isDirty) {
      return
    }

    function handleInternalLinkClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const link = target.closest<HTMLAnchorElement>('a[href]')
      if (
        !link ||
        link.hasAttribute('download') ||
        (link.target !== '' && link.target !== '_self')
      ) {
        return
      }

      const destination = new URL(link.href, window.location.href)
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      requestNavigation(
        `${destination.pathname}${destination.search}${destination.hash}`,
      )
    }

    document.addEventListener('click', handleInternalLinkClick, true)

    return () => {
      document.removeEventListener('click', handleInternalLinkClick, true)
    }
  }, [isDirty, requestNavigation])

  function cancelNavigation() {
    setPendingNavigation(null)
  }

  function confirmNavigation() {
    if (!pendingNavigation) {
      return
    }

    setPendingNavigation(null)
    navigate(pendingNavigation.to, pendingNavigation.options)
  }

  return {
    confirmationDialog: (
      <ConfirmationDialog
        isOpen={pendingNavigation !== null}
        title="Descartar alterações?"
        description="Você possui alterações não salvas. Deseja sair sem salvar?"
        confirmLabel="Descartar alterações"
        onCancel={cancelNavigation}
        onConfirm={confirmNavigation}
      />
    ),
    requestNavigation,
  }
}

export { useUnsavedChangesGuard }
