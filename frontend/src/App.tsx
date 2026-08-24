import { Button } from './components/ui/Button'

function App() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-6 text-center font-sans">
      <h1 className="text-3xl font-bold">
        Sistema de Gestão de Ordens de Serviço
      </h1>
      <p className="mt-4 text-base">Frontend inicial do projeto</p>
      <Button className="mt-6" type="button">
        Nova ordem de serviço
      </Button>
    </main>
  )
}

export default App
