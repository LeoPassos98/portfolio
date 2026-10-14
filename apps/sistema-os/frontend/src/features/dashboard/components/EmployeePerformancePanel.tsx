import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { getEmployeeDashboardPerformance, getEmployeeDashboardSituation } from '../api/dashboardApi'
import { dashboardQueryKeys } from '../api/dashboardQueryKeys'
import { formatCurrency, formatPercentage } from '../lib/dashboardFormatters'
import { dashboardPeriodOptions, resolveDashboardPeriodRange, type DashboardPeriod } from '../lib/dashboardPeriod'
import { MetricCard, MetricCardSkeleton } from './MetricCard'

type EmployeePerformancePanelProps = { employeeId: string; context: 'self' | 'administrative' }

function PanelError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="bg-surface mt-4 rounded-ui border border-error p-5"><p role="alert" className="text-error text-sm">{message}</p><Button type="button" className="mt-4" onClick={retry}>Tentar novamente</Button></div>
}

function EmployeePerformancePanel({ employeeId, context }: EmployeePerformancePanelProps) {
  const [period, setPeriod] = useState<DashboardPeriod>('current-month')
  const range = useMemo(() => resolveDashboardPeriodRange(period), [period])
  const situationQuery = useQuery({ queryKey: dashboardQueryKeys.situationEmployee(employeeId), queryFn: () => getEmployeeDashboardSituation(employeeId) })
  const performanceQuery = useQuery({ queryKey: dashboardQueryKeys.performanceEmployee(employeeId, range), queryFn: () => getEmployeeDashboardPerformance(employeeId, range) })
  const situation = situationQuery.data
  const performance = performanceQuery.data?.performance
  const openOrders = situation ? situation.orders.awaiting + situation.orders.inProgress : 0
  const closedOrders = performance ? performance.completedOrders + performance.cancelledOrders : 0
  const responsibleQuery = `responsibleId=${encodeURIComponent(employeeId)}`
  const situationMetric = situation && { label: context === 'self' ? 'Minhas ordens em aberto' : 'Ordens em aberto', value: openOrders, secondaryText: `${situation.orders.awaiting} aguardando + ${situation.orders.inProgress} em andamento · ${formatPercentage(openOrders, situation.orders.total)} das OS atribuídas`, valueClass: 'text-warning', to: `/orders?status=open&${responsibleQuery}` }
  const performanceMetrics = performance && [
    { label: context === 'self' ? 'Valor das minhas ordens concluídas' : 'Valor das ordens concluídas', value: formatCurrency(performance.completedOrdersValue), valueClass: 'text-success', to: `/orders?status=completed&${responsibleQuery}` },
    { label: context === 'self' ? 'Minhas ordens concluídas' : 'Ordens concluídas', value: performance.completedOrders, secondaryText: `${formatPercentage(performance.completedOrders, closedOrders)} das OS encerradas`, valueClass: 'text-success', to: `/orders?status=completed&${responsibleQuery}` },
    { label: context === 'self' ? 'Minhas ordens canceladas' : 'Ordens canceladas', value: performance.cancelledOrders, secondaryText: `${formatPercentage(performance.cancelledOrders, closedOrders)} das OS encerradas`, valueClass: 'text-error', to: `/orders?status=cancelled&${responsibleQuery}` },
    { label: context === 'self' ? 'Ticket médio das minhas ordens concluídas' : 'Ticket médio das ordens concluídas', value: formatCurrency(performance.averageCompletedOrderValue), valueClass: 'text-foreground', to: `/orders?status=completed&${responsibleQuery}` },
    { label: 'Clientes recorrentes', value: performance.recurringDistinctClients, secondaryText: `${formatPercentage(performance.recurringDistinctClients, performance.distinctClientsServed)} dos clientes distintos atendidos`, valueClass: 'text-info' },
  ]
  return <>
    <section aria-labelledby="employee-current-situation-title" className="mt-8"><h2 id="employee-current-situation-title" className="text-foreground text-xl font-bold">Situação atual</h2>{situationQuery.isError ? <PanelError message="Não foi possível carregar a situação atual." retry={() => void situationQuery.refetch()} /> : <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{situationQuery.isPending ? <MetricCardSkeleton /> : situationMetric && <MetricCard {...situationMetric} />}</div>}</section>
    <section aria-labelledby="employee-performance-title" className="mt-10"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="employee-performance-title" className="text-foreground text-xl font-bold">Desempenho</h2><p className="text-neutral mt-1 text-sm">Métricas calculadas para o período selecionado.</p></div><div className="w-full space-y-2 sm:w-48"><Label htmlFor="employee-dashboard-period">Período</Label><Select id="employee-dashboard-period" value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}>{dashboardPeriodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div></div>{performanceQuery.isError ? <PanelError message="Não foi possível carregar o desempenho." retry={() => void performanceQuery.refetch()} /> : <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{performanceQuery.isPending ? Array.from({ length: 5 }, (_, index) => <MetricCardSkeleton key={index} />) : performanceMetrics?.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>}</section>
  </>
}

export { EmployeePerformancePanel }
