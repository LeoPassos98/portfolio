function App() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-6 text-center font-sans">
      <h1 className="text-3xl font-bold">
        Sistema de Gestão de Ordens de Serviço
      </h1>
      <p className="mt-4 text-base">Frontend inicial do projeto</p>
      <button
        className="bg-primary hover:bg-primary-hover mt-6 rounded-ui px-4 py-2 text-white"
        type="button"
      >
        Nova ordem de serviço
      </button>
    </main>
  )
}

export default App
