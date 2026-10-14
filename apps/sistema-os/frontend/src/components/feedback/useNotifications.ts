import { useContext } from 'react'
import { NotificationContext } from './NotificationContext'

function useNotifications() {
  const context = useContext(NotificationContext)

  if (context === undefined) {
    throw new Error(
      'useNotifications deve ser usado dentro de NotificationProvider.',
    )
  }

  return context
}

export { useNotifications }
