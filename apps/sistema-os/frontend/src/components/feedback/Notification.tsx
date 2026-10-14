import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from 'react'
import {
  NOTIFICATION_DURATION_MS,
  NOTIFICATION_EXIT_DURATION_MS,
} from './notificationConfig'
import type {
  NotificationData,
  NotificationType,
} from './NotificationContext'

const progressRingCircumference = 94.25

type NotificationProps = {
  notification: NotificationData
  onDismiss: (id: number) => void
  prefersReducedMotion: boolean
}

type NotificationTypeDetails = {
  containerClassName: string
  icon: typeof SuccessIcon
  label: string
}

function SuccessIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M10.3 4.5 3.2 17a2 2 0 0 0 1.8 3h14a2 2 0 0 0 1.8-3L13.7 4.5a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 3h.01" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </svg>
  )
}

const notificationTypeDetails: Record<
  NotificationType,
  NotificationTypeDetails
> = {
  success: {
    containerClassName: 'border-success bg-success-bg text-success',
    icon: SuccessIcon,
    label: 'Sucesso',
  },
  error: {
    containerClassName: 'border-error bg-error-bg text-error',
    icon: ErrorIcon,
    label: 'Erro',
  },
  warning: {
    containerClassName: 'border-warning bg-warning-bg text-warning',
    icon: WarningIcon,
    label: 'Alerta',
  },
  info: {
    containerClassName: 'border-info bg-info-bg text-info',
    icon: InfoIcon,
    label: 'Informação',
  },
}

function Notification({
  notification,
  onDismiss,
  prefersReducedMotion,
}: NotificationProps) {
  const [isDocumentHidden, setIsDocumentHidden] = useState(
    document.visibilityState === 'hidden',
  )
  const [isFocusWithin, setIsFocusWithin] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closingRef = useRef(false)
  const countdownTimeoutRef = useRef<number | undefined>(undefined)
  const exitTimeoutRef = useRef<number | undefined>(undefined)
  const isDocumentHiddenRef = useRef(isDocumentHidden)
  const isFocusWithinRef = useRef(false)
  const isHoveredRef = useRef(false)
  const isTimerRunningRef = useRef(false)
  const remainingTimeRef = useRef(NOTIFICATION_DURATION_MS)
  const startedAtRef = useRef(0)
  const isPaused = isDocumentHidden || isFocusWithin || isHovered
  const details = notificationTypeDetails[notification.type]
  const Icon = details.icon

  const pauseCountdown = useCallback(() => {
    if (!isTimerRunningRef.current) {
      return
    }

    window.clearTimeout(countdownTimeoutRef.current)
    countdownTimeoutRef.current = undefined
    isTimerRunningRef.current = false
    remainingTimeRef.current = Math.max(
      0,
      remainingTimeRef.current - (performance.now() - startedAtRef.current),
    )
  }, [])

  const beginDismiss = useCallback(() => {
    if (closingRef.current) {
      return
    }

    closingRef.current = true
    pauseCountdown()

    if (prefersReducedMotion) {
      onDismiss(notification.id)
      return
    }

    setIsClosing(true)
    exitTimeoutRef.current = window.setTimeout(
      () => onDismiss(notification.id),
      NOTIFICATION_EXIT_DURATION_MS,
    )
  }, [notification.id, onDismiss, pauseCountdown, prefersReducedMotion])

  const resumeCountdown = useCallback(() => {
    if (isTimerRunningRef.current || closingRef.current) {
      return
    }

    if (remainingTimeRef.current <= 0) {
      beginDismiss()
      return
    }

    startedAtRef.current = performance.now()
    countdownTimeoutRef.current = window.setTimeout(
      beginDismiss,
      remainingTimeRef.current,
    )
    isTimerRunningRef.current = true
  }, [beginDismiss])

  useEffect(() => {
    function handleVisibilityChange() {
      const documentIsHidden = document.visibilityState === 'hidden'

      isDocumentHiddenRef.current = documentIsHidden
      setIsDocumentHidden(documentIsHidden)

      if (documentIsHidden) {
        pauseCountdown()
        return
      }

      if (!isHoveredRef.current && !isFocusWithinRef.current) {
        resumeCountdown()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (!isDocumentHiddenRef.current) {
      resumeCountdown()
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      pauseCountdown()
      window.clearTimeout(exitTimeoutRef.current)
    }
  }, [pauseCountdown, resumeCountdown])

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return
    }

    isFocusWithinRef.current = false
    setIsFocusWithin(false)

    if (!isHoveredRef.current && !isDocumentHiddenRef.current) {
      resumeCountdown()
    }
  }

  function handleFocus() {
    isFocusWithinRef.current = true
    setIsFocusWithin(true)
    pauseCountdown()
  }

  function handleMouseEnter() {
    isHoveredRef.current = true
    setIsHovered(true)
    pauseCountdown()
  }

  function handleMouseLeave() {
    isHoveredRef.current = false
    setIsHovered(false)

    if (!isFocusWithinRef.current && !isDocumentHiddenRef.current) {
      resumeCountdown()
    }
  }

  return (
    <article
      role={notification.type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
      data-closing={isClosing}
      className={[
        'notification-toast',
        'flex',
        'w-full',
        'items-center',
        'gap-3',
        'rounded-ui',
        'border',
        'px-4',
        'py-3.5',
        'shadow-lg',
        'sm:px-5',
        details.containerClassName,
      ].join(' ')}
      onBlurCapture={handleBlur}
      onFocusCapture={handleFocus}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="shrink-0" aria-hidden="true">
        <Icon />
      </span>

      <p className="min-w-0 flex-1 text-base leading-6">
        <span className="font-bold">{details.label}:</span>{' '}
        <span className="font-medium">{notification.message}</span>
      </p>

      <button
        type="button"
        aria-label={`Fechar notificação de ${details.label.toLowerCase()}`}
        title="Fechar notificação"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
        onClick={beginDismiss}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 36 36"
          className="pointer-events-none h-9 w-9"
        >
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            opacity="0.2"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            className="notification-progress-ring"
            style={
              {
                '--notification-progress-ring-circumference':
                  progressRingCircumference,
                animationDuration: `${NOTIFICATION_DURATION_MS}ms`,
                animationPlayState: isPaused ? 'paused' : 'running',
              } as CSSProperties
            }
          />
          <path
            d="m14 14 8 8m0-8-8 8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
      </button>
    </article>
  )
}

export { Notification }
