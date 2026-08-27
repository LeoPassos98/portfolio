import { useState } from 'react'
import { useLocation } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { EmployeePerformancePanel } from '../components/EmployeePerformancePanel'
import { MetricCard } from '../components/MetricCard'
import {
  adminDashboardPerformance,
  adminDashboardSituation,
  dashboardPeriodOptions,
  type DashboardPeriod,
} from '../mocks/adminDashboard'

type DashboardLocationState = {
  accessDenied?: boolean
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatPercentage(value: number, total: number) {
  if (total === 0) {
    return '0%'
  }

  return `${Math.round((value / total) * 100)}%`
}

const adminOpenOrders =
  adminDashboardSituation.orders.awaiting +
  adminDashboardSituation.orders.inProgress

const adminCurrentSituationMetrics = [
  {
    label: 'Clientes',
    value: `${adminDashboardSituation.clients.active} / ${adminDashboardSituation.clients.total}`,
    secondaryText: `${formatPercentage(adminDashboardSituation.clients.active, adminDashboardSituation.clients.total)} ativos`,
    valueClass: 'text-primary',
    to: '/clients?status=active',
  },
  {
    label: 'Funcionários',
    value: `${adminDashboardSituation.employees.active} / ${adminDashboardSituation.employees.total}`,
    secondaryText: `${formatPercentage(adminDashboardSituation.employees.active, adminDashboardSituation.employees.total)} ativos`,
    valueClass: 'text-primary',
    to: '/employees?status=active',
  },
  {
    label: 'Ordens em aberto',
    value: adminOpenOrders,
    secondaryText: `${adminDashboardSituation.orders.awaiting} aguardando + ${adminDashboardSituation.orders.inProgress} em andamento · ${formatPercentage(adminOpenOrders, adminDashboardSituation.orders.total)} do total`,
    valueClass: 'text-warning',
    to: '/orders?status=open',
  },
]

function createAdminPerformanceMetrics(period: DashboardPeriod) {
  const performance = adminDashboardPerformance[period]
  const closedOrders =
    performance.completedOrders + performance.cancelledOrders
  const averageTicket =
    performance.completedOrders === 0
      ? 0
      : performance.completedOrdersValue / performance.completedOrders
  return [
    {
      label: 'Valor das ordens concluídas',
      value: currencyFormatter.format(performance.completedOrdersValue),
      valueClass: 'text-success',
      to: '/orders?status=completed',
    },
    {
      label: 'Ordens concluídas',
      value: performance.completedOrders,
      secondaryText: `${formatPercentage(performance.completedOrders, closedOrders)} das OS encerradas`,
      valueClass: 'text-success',
      to: '/orders?status=completed',
    },
    {
      label: 'Ordens canceladas',
      value: performance.cancelledOrders,
      secondaryText: `${formatPercentage(performance.cancelledOrders, closedOrders)} das OS encerradas`,
      valueClass: 'text-error',
      to: '/orders?status=cancelled',
    },
    {
      label: 'Novos clientes',
      value: performance.newClients,
      secondaryText: `${formatPercentage(performance.newClients, adminDashboardSituation.clients.total)} do total de clientes`,
      valueClass: 'text-info',
    },
    {
      label: 'Novos funcionários',
      value: performance.newEmployees,
      secondaryText: `${formatPercentage(performance.newEmployees, adminDashboardSituation.employees.total)} do total de funcionários`,
      valueClass: 'text-info',
    },
    {
      label: 'Ticket médio das ordens concluídas',
      value: currencyFormatter.format(averageTicket),
      valueClass: 'text-foreground',
      to: '/orders?status=completed',
    },
  ]
}

function DashboardPage() {
  const session = useAuthSession()
  const location = useLocation()
  const [period, setPeriod] = useState<DashboardPeriod>('current-month')
  const hasAccessDeniedFeedback =
    (location.state as DashboardLocationState | null)?.accessDenied === true

  if (!session) {
    return null
  }

  const { currentUser } = session
  const accessDeniedFeedback = hasAccessDeniedFeedback ? (
    <p role="alert" className="mt-3 text-sm text-error">
      Você não tem permissão para acessar esta área.
    </p>
  ) : null

  if (currentUser.profile === 'employee') {
    return (
      <AppLayout>
        <header>
          <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
          <p className="text-neutral mt-1">
            Acompanhe suas ordens e seu desempenho.
          </p>
          {accessDeniedFeedback}
        </header>

        <EmployeePerformancePanel
          employeeId={currentUser.employeeId}
          context="self"
        />
      </AppLayout>
    )
  }

  const performanceMetrics = createAdminPerformanceMetrics(period)

  return (
    <AppLayout>
      <header>
        <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
        <p className="text-neutral mt-1">
          Acompanhe a situação atual da operação e o desempenho do negócio.
        </p>
        {accessDeniedFeedback}
      </header>

      <section aria-labelledby="current-situation-title" className="mt-8">
        <h2
          id="current-situation-title"
          className="text-foreground text-xl font-bold"
        >
          Situação atual
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminCurrentSituationMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section aria-labelledby="performance-title" className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="performance-title"
              className="text-foreground text-xl font-bold"
            >
              Desempenho
            </h2>
            <p className="text-neutral mt-1 text-sm">
              Métricas calculadas para o período selecionado.
            </p>
          </div>

          <div className="w-full space-y-2 sm:w-48">
            <Label htmlFor="dashboard-period">Período</Label>
            <Select
              id="dashboard-period"
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as DashboardPeriod)
              }
            >
              {dashboardPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {performanceMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>
    </AppLayout>
  )
}

export { DashboardPage }
