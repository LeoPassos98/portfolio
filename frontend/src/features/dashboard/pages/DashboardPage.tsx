import { AppLayout } from '../../../components/layout/AppLayout'
import { MetricCard } from '../components/MetricCard'

const dashboardMetrics = [
  {
    label: 'Ordens aguardando',
    value: 12,
    backgroundClass: 'bg-warning-bg',
    valueClass: 'text-warning',
    to: '/orders?status=awaiting',
  },
  {
    label: 'Ordens em andamento',
    value: 8,
    backgroundClass: 'bg-info-bg',
    valueClass: 'text-info',
    to: '/orders?status=in-progress',
  },
  {
    label: 'Ordens concluídas',
    value: 34,
    backgroundClass: 'bg-success-bg',
    valueClass: 'text-success',
    to: '/orders?status=completed',
  },
  {
    label: 'Ordens canceladas',
    value: 3,
    backgroundClass: 'bg-error-bg',
    valueClass: 'text-error',
    to: '/orders?status=cancelled',
  },
  {
    label: 'Clientes ativos',
    value: 128,
    backgroundClass: 'bg-neutral-bg',
    valueClass: 'text-neutral',
    to: '/clients?status=active',
  },
  {
    label: 'Funcionários ativos',
    value: 16,
    backgroundClass: 'bg-success-bg',
    valueClass: 'text-success',
    to: '/employees?status=active',
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
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>
    </AppLayout>
  )
}

export { DashboardPage }
