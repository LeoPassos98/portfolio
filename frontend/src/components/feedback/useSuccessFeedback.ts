import { useContext } from 'react'
import { SuccessFeedbackContext } from './SuccessFeedbackContext'

function useSuccessFeedback() {
  const context = useContext(SuccessFeedbackContext)

  if (context === undefined) {
    throw new Error(
      'useSuccessFeedback deve ser usado dentro de SuccessFeedbackProvider.',
    )
  }

  return context
}

export { useSuccessFeedback }
