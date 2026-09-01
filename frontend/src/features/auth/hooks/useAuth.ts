import { useContext } from 'react'
import { AuthSessionContext } from '../context/AuthSessionContext'

function useAuth() {
  const auth = useContext(AuthSessionContext)

  if (auth === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthSessionProvider.')
  }

  return auth
}

export { useAuth }
