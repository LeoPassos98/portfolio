import { Navigate, Route, Routes } from 'react-router'
import { HomePage } from './features/public/pages/HomePage'
import { ServiceOrderProjectPage } from './features/public/pages/ServiceOrderProjectPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/projetos/sistema-os"
        element={<ServiceOrderProjectPage />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
