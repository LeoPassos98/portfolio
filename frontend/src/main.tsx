import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/ibm-plex-sans/wght.css'
import './index.css'
import App from './App.tsx'
import { SuccessFeedbackProvider } from './components/feedback/SuccessFeedbackProvider.tsx'
import { AuthSessionProvider } from './features/auth/context/AuthSessionProvider.tsx'
import { queryClient } from './shared/lib/query/queryClient.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <SuccessFeedbackProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SuccessFeedbackProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
