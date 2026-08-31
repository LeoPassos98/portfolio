import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/ibm-plex-sans/wght.css'
import './index.css'
import App from './App.tsx'
import { SuccessFeedbackProvider } from './components/feedback/SuccessFeedbackProvider.tsx'
import { AuthSessionProvider } from './features/auth/context/AuthSessionProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthSessionProvider>
      <SuccessFeedbackProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SuccessFeedbackProvider>
    </AuthSessionProvider>
  </StrictMode>,
)
