import { useContext } from 'react'
import { AuthSessionContext } from '../context/AuthSessionContext'

function useAuthSession() {
  const auth = useContext(AuthSessionContext)

  if (auth === undefined) {
    throw new Error('useAuthSession deve ser usado dentro de AuthSessionProvider.')
  }

  return auth.session
}

export { useAuthSession }
