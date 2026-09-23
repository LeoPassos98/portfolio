import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Notification } from './Notification'
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationData,
  type NotificationType,
} from './NotificationContext'
import { MAX_VISIBLE_NOTIFICATIONS } from './notificationConfig'

type NotificationProviderProps = {
  children: ReactNode
}

function getInitialMotionPreference() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getInitialMotionPreference,
  )
  const nextNotificationIdRef = useRef(0)

  const dismissNotification = useCallback((id: number) => {
    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => notification.id !== id),
    )
  }, [])

  const showNotification = useCallback(
    (type: NotificationType, message: string) => {
      const normalizedMessage = message.trim()

      if (normalizedMessage.length === 0) {
        return
      }

      nextNotificationIdRef.current += 1
      const notification: NotificationData = {
        id: nextNotificationIdRef.current,
        message: normalizedMessage,
        type,
      }

      setNotifications((currentNotifications) =>
        [notification, ...currentNotifications].slice(
          0,
          MAX_VISIBLE_NOTIFICATIONS,
        ),
      )
    },
    [],
  )

  const showSuccess = useCallback(
    (message: string) => showNotification('success', message),
    [showNotification],
  )
  const showError = useCallback(
    (message: string) => showNotification('error', message),
    [showNotification],
  )
  const showWarning = useCallback(
    (message: string) => showNotification('warning', message),
    [showNotification],
  )
  const showInfo = useCallback(
    (message: string) => showNotification('info', message),
    [showNotification],
  )

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      showError,
      showInfo,
      showSuccess,
      showWarning,
    }),
    [
      showError,
      showInfo,
      showSuccess,
      showWarning,
    ],
  )

  useEffect(() => {
    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches)
    }

    motionPreference.addEventListener('change', handleMotionPreferenceChange)

    return () =>
      motionPreference.removeEventListener(
        'change',
        handleMotionPreferenceChange,
      )
  }, [])

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <section
        aria-label="Notificações"
        className="pointer-events-none fixed left-1/2 top-20 z-[70] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col gap-3"
      >
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Notification
              notification={notification}
              onDismiss={dismissNotification}
              prefersReducedMotion={prefersReducedMotion}
            />
          </div>
        ))}
      </section>
    </NotificationContext.Provider>
  )
}

export { NotificationProvider }
