import { useContext } from 'react'
import { AuthSessionContext } from '../context/AuthSessionContext'

function useAuthSession() {
  const session = useContext(AuthSessionContext)

  if (session === undefined) {
    throw new Error('useAuthSession deve ser usado dentro de AuthSessionProvider.')
  }

  return session
}

export { useAuthSession }
