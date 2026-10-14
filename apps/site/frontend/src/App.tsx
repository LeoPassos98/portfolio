import { Link, Route, Routes } from 'react-router'
import { PublicLayout } from './components/layout/PublicLayout'
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
      <Route
        path="*"
        element={
          <PublicLayout>
            <section className="mx-auto w-full max-w-[1180px] px-4 py-20 sm:px-6">
              <h1 className="text-foreground text-3xl font-bold">
                Página não encontrada
              </h1>
              <p className="text-neutral mt-4">
                O endereço solicitado não corresponde a uma página do portfólio.
              </p>
              <Link
                to="/"
                className="text-primary mt-6 inline-block font-medium hover:underline"
              >
                Voltar ao início
              </Link>
            </section>
          </PublicLayout>
        }
      />
    </Routes>
  )
}

export default App
