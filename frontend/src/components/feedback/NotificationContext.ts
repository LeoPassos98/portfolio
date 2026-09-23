import { createContext } from 'react'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

type NotificationData = {
  id: number
  message: string
  type: NotificationType
}

type NotificationContextValue = {
  showError: (message: string) => void
  showInfo: (message: string) => void
  showSuccess: (message: string) => void
  showWarning: (message: string) => void
}

const NotificationContext = createContext<
  NotificationContextValue | undefined
>(undefined)

export { NotificationContext }
export type {
  NotificationContextValue,
  NotificationData,
  NotificationType,
}
