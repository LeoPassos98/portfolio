import { createContext } from 'react'

type SuccessFeedbackContextValue = {
  dismissSuccess: () => void
  showSuccess: (message: string) => void
}

const SuccessFeedbackContext = createContext<
  SuccessFeedbackContextValue | undefined
>(undefined)

export { SuccessFeedbackContext }
export type { SuccessFeedbackContextValue }
