import { useState } from 'react'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import {
  dashboardPeriodOptions,
  type DashboardPeriod,
} from '../mocks/adminDashboard'
import { employeeDashboardByEmployeeId } from '../mocks/employeeDashboard'
import { MetricCard } from './MetricCard'

type EmployeePerformancePanelProps = {
  employeeId: string
  context: 'self' | 'administrative'
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

function EmployeePerformancePanel({
  employeeId,
  context,
}: EmployeePerformancePanelProps) {
  const [period, setPeriod] = useState<DashboardPeriod>('current-month')
  const dashboard = employeeDashboardByEmployeeId[employeeId]

  if (!dashboard) {
    return (
      <div className="mt-8">
        <EmptyState
          title="Desempenho indisponível"
          description="Não há dados de desempenho disponíveis para este funcionário."
        />
      </div>
    )
  }

  const openOrders =
    dashboard.situation.orders.awaiting +
    dashboard.situation.orders.inProgress
  const situationMetrics = [
    {
      label:
        context === 'self' ? 'Minhas ordens em aberto' : 'Ordens em aberto',
      value: openOrders,
      secondaryText: `${dashboard.situation.orders.awaiting} aguardando + ${dashboard.situation.orders.inProgress} em andamento · ${formatPercentage(openOrders, dashboard.situation.orders.total)} das OS atribuídas`,
      valueClass: 'text-warning',
      to: '/orders?status=open',
    },
  ]
  const performance = dashboard.performance[period]
  const closedOrders =
    performance.completedOrders + performance.cancelledOrders
  const averageTicket =
    performance.completedOrders === 0
      ? 0
      : performance.creditedCompletedOrdersValue / performance.completedOrders
  const performanceMetrics = [
    {
      label:
        context === 'self'
          ? 'Valor das minhas ordens concluídas'
          : 'Valor das ordens concluídas',
      value: currencyFormatter.format(
        performance.creditedCompletedOrdersValue,
      ),
      valueClass: 'text-success',
      to: '/orders?status=completed',
    },
    {
      label:
        context === 'self' ? 'Minhas ordens concluídas' : 'Ordens concluídas',
      value: performance.completedOrders,
      secondaryText: `${formatPercentage(performance.completedOrders, closedOrders)} das OS encerradas`,
      valueClass: 'text-success',
      to: '/orders?status=completed',
    },
    {
      label:
        context === 'self' ? 'Minhas ordens canceladas' : 'Ordens canceladas',
      value: performance.cancelledOrders,
      secondaryText: `${formatPercentage(performance.cancelledOrders, closedOrders)} das OS encerradas`,
      valueClass: 'text-error',
      to: '/orders?status=cancelled',
    },
    {
      label:
        context === 'self'
          ? 'Ticket médio das minhas ordens concluídas'
          : 'Ticket médio das ordens concluídas',
      value: currencyFormatter.format(averageTicket),
      valueClass: 'text-foreground',
      to: '/orders?status=completed',
    },
    {
      label: 'Clientes recorrentes',
      value: performance.recurringDistinctClients,
      secondaryText: `${formatPercentage(performance.recurringDistinctClients, performance.distinctClientsServed)} dos clientes distintos atendidos`,
      valueClass: 'text-info',
    },
  ]

  return (
    <>
      <section aria-labelledby="employee-current-situation-title" className="mt-8">
        <h2
          id="employee-current-situation-title"
          className="text-foreground text-xl font-bold"
        >
          Situação atual
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {situationMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section aria-labelledby="employee-performance-title" className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="employee-performance-title"
              className="text-foreground text-xl font-bold"
            >
              Desempenho
            </h2>
            <p className="text-neutral mt-1 text-sm">
              Métricas calculadas para o período selecionado.
            </p>
          </div>

          <div className="w-full space-y-2 sm:w-48">
            <Label htmlFor="employee-dashboard-period">Período</Label>
            <Select
              id="employee-dashboard-period"
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
    </>
  )
}

export { EmployeePerformancePanel }
