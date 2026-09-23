import logo from '../../../assets/brand/logo.svg'
import { PublicLayout } from '../../../components/layout/PublicLayout'

function HomePage() {
  return (
    <PublicLayout>
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-24">
        <img
          src={logo}
          alt="Leonardo Passos"
          className="mb-12 h-auto w-full max-w-md"
        />
        <div>
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
