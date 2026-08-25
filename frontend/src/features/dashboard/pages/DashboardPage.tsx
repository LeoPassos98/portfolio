import { AppLayout } from '../../../components/layout/AppLayout'

const dashboardMetrics = [
  {
    label: 'Ordens aguardando',
    value: 12,
    backgroundClass: 'bg-warning-bg',
    valueClass: 'text-warning',
  },
  {
    label: 'Ordens em andamento',
    value: 8,
    backgroundClass: 'bg-info-bg',
    valueClass: 'text-info',
  },
  {
    label: 'Ordens concluídas',
    value: 34,
    backgroundClass: 'bg-success-bg',
    valueClass: 'text-success',
  },
  {
    label: 'Ordens canceladas',
    value: 3,
    backgroundClass: 'bg-error-bg',
    valueClass: 'text-error',
  },
  {
    label: 'Clientes ativos',
    value: 128,
    backgroundClass: 'bg-neutral-bg',
    valueClass: 'text-neutral',
  },
  {
    label: 'Funcionários ativos',
    value: 16,
    backgroundClass: 'bg-success-bg',
    valueClass: 'text-success',
  },
]

function DashboardPage() {
  return (
    <AppLayout>
      <header>
        <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
        <p className="text-neutral mt-1">
          Acompanhe um resumo das operações do sistema.
        </p>
      </header>

      <section
        aria-label="Métricas do Dashboard"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {dashboardMetrics.map((metric) => (
          <article
            key={metric.label}
            className={[
              'rounded-ui',
              'p-5',
              metric.backgroundClass,
            ].join(' ')}
          >
            <p className="text-neutral text-sm font-medium">{metric.label}</p>
            <p
              className={[
                'mt-2',
                'text-3xl',
                'font-bold',
                metric.valueClass,
              ].join(' ')}
            >
              {metric.value}
            </p>
          </article>
        ))}
      </section>
    </AppLayout>
  )
}

export { DashboardPage }
