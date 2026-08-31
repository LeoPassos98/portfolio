import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SuccessFeedbackContext } from './SuccessFeedbackContext'

type SuccessFeedback = {
  id: number
  message: string
}

type SuccessFeedbackProviderProps = {
  children: ReactNode
}

function SuccessFeedbackProvider({ children }: SuccessFeedbackProviderProps) {
  const [feedback, setFeedback] = useState<SuccessFeedback | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  const dismissSuccess = useCallback(() => {
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = undefined
    setFeedback(null)
  }, [])

  const showSuccess = useCallback(
    (message: string) => {
      if (message.length === 0) {
        return
      }

      window.clearTimeout(timeoutRef.current)
      setFeedback({ id: Date.now(), message })
      timeoutRef.current = window.setTimeout(dismissSuccess, 5000)
    },
    [dismissSuccess],
  )

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <SuccessFeedbackContext.Provider value={{ dismissSuccess, showSuccess }}>
      {children}
      {feedback ? (
        <div
          key={feedback.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="bg-success-bg text-success fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-ui border border-success px-4 py-3 shadow-lg"
        >
          <p className="text-sm font-medium">Sucesso: {feedback.message}</p>
          <button
            type="button"
            onClick={dismissSuccess}
            className="rounded-ui px-2 py-1 text-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Fechar
          </button>
        </div>
      ) : null}
    </SuccessFeedbackContext.Provider>
  )
}

export { SuccessFeedbackProvider }
