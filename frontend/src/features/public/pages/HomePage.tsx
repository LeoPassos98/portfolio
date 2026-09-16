import { PublicLayout } from '../../../components/layout/PublicLayout'

function HomePage() {
  return (
    <PublicLayout>
      <section className="mx-auto flex w-full max-w-3xl items-center px-4 py-16 sm:py-24">
        <div>
          <p className="text-primary text-sm font-semibold">Sistema OS</p>
          <h1 className="text-foreground mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Sistema de Gestão de Ordens de Serviço
          </h1>
          <p className="text-neutral mt-4 max-w-xl text-lg leading-8">
            Gerencie clientes, funcionários e ordens de serviço em um único
            lugar.
          </p>
        </div>
      </section>
    </PublicLayout>
  )
}

export { HomePage }
