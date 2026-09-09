import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { AppLayout } from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { getAdministratorDashboardPerformance, getAdministratorDashboardSituation } from '../api/dashboardApi'
import { dashboardQueryKeys } from '../api/dashboardQueryKeys'
import { EmployeePerformancePanel } from '../components/EmployeePerformancePanel'
import { MetricCard, MetricCardSkeleton } from '../components/MetricCard'
import { formatCurrency, formatPercentage } from '../lib/dashboardFormatters'
import { dashboardPeriodOptions, resolveDashboardPeriodRange, type DashboardPeriod } from '../lib/dashboardPeriod'

type DashboardLocationState = { accessDenied?: boolean }

function DashboardError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="bg-surface mt-4 rounded-ui border border-error p-5"><p role="alert" className="text-error text-sm">{message}</p><Button type="button" className="mt-4" onClick={retry}>Tentar novamente</Button></div>
}

function DashboardPage() {
  const session = useAuthSession()
  const location = useLocation()
  const [period, setPeriod] = useState<DashboardPeriod>('current-month')
  const range = useMemo(() => resolveDashboardPeriodRange(period), [period])
  const situationQuery = useQuery({ queryKey: dashboardQueryKeys.situationAdministrator(), queryFn: getAdministratorDashboardSituation, enabled: session?.currentUser.profile === 'admin' })
  const performanceQuery = useQuery({ queryKey: dashboardQueryKeys.performanceAdministrator(range), queryFn: () => getAdministratorDashboardPerformance(range), enabled: session?.currentUser.profile === 'admin' })
  const accessDenied = (location.state as DashboardLocationState | null)?.accessDenied === true

  if (!session) return null

  if (session.currentUser.profile === 'employee') {
    return <AppLayout><header><h1 className="text-foreground text-2xl font-bold">Dashboard</h1><p className="text-neutral mt-1">Acompanhe suas ordens e seu desempenho.</p>{accessDenied && <p role="alert" className="mt-3 text-sm text-error">Você não tem permissão para acessar esta área.</p>}</header><EmployeePerformancePanel employeeId={session.currentUser.employeeId} context="self" /></AppLayout>
  }

  const situation = situationQuery.data
  const openOrders = situation ? situation.orders.awaiting + situation.orders.inProgress : 0
  const situationMetrics = situation && [
    { label: 'Clientes', value: `${situation.clients.active} / ${situation.clients.total}`, secondaryText: `${formatPercentage(situation.clients.active, situation.clients.total)} ativos`, valueClass: 'text-primary', to: '/clients?status=active' },
    { label: 'Funcionários', value: `${situation.employees.active} / ${situation.employees.total}`, secondaryText: `${formatPercentage(situation.employees.active, situation.employees.total)} ativos`, valueClass: 'text-primary', to: '/employees?status=active' },
    { label: 'Ordens em aberto', value: openOrders, secondaryText: `${situation.orders.awaiting} aguardando + ${situation.orders.inProgress} em andamento · ${formatPercentage(openOrders, situation.orders.total)} do total`, valueClass: 'text-warning', to: '/orders?status=open' },
  ]
  const performance = performanceQuery.data?.performance
  const closedOrders = performance ? performance.completedOrders + performance.cancelledOrders : 0
  const performanceMetrics = performance && [
    { label: 'Valor das ordens concluídas', value: formatCurrency(performance.completedOrdersValue), valueClass: 'text-success', to: '/orders?status=completed' },
    { label: 'Ordens concluídas', value: performance.completedOrders, secondaryText: `${formatPercentage(performance.completedOrders, closedOrders)} das OS encerradas`, valueClass: 'text-success', to: '/orders?status=completed' },
    { label: 'Ordens canceladas', value: performance.cancelledOrders, secondaryText: `${formatPercentage(performance.cancelledOrders, closedOrders)} das OS encerradas`, valueClass: 'text-error', to: '/orders?status=cancelled' },
    { label: 'Novos clientes', value: performance.newClients, secondaryText: situation ? `${formatPercentage(performance.newClients, situation.clients.total)} do total de clientes` : undefined, valueClass: 'text-info' },
    { label: 'Novos funcionários', value: performance.newEmployees, secondaryText: situation ? `${formatPercentage(performance.newEmployees, situation.employees.total)} do total de funcionários` : undefined, valueClass: 'text-info' },
    { label: 'Ticket médio das ordens concluídas', value: formatCurrency(performance.averageCompletedOrderValue), valueClass: 'text-foreground', to: '/orders?status=completed' },
  ]
  const renderSkeletons = (count: number) => Array.from({ length: count }, (_, index) => <MetricCardSkeleton key={index} />)

  return <AppLayout><header><h1 className="text-foreground text-2xl font-bold">Dashboard</h1><p className="text-neutral mt-1">Acompanhe a situação atual da operação e o desempenho do negócio.</p>{accessDenied && <p role="alert" className="mt-3 text-sm text-error">Você não tem permissão para acessar esta área.</p>}</header>
    <section aria-labelledby="current-situation-title" className="mt-8"><h2 id="current-situation-title" className="text-foreground text-xl font-bold">Situação atual</h2>{situationQuery.isError ? <DashboardError message="Não foi possível carregar a situação atual." retry={() => void situationQuery.refetch()} /> : <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{situationQuery.isPending ? renderSkeletons(3) : situationMetrics?.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>}</section>
    <section aria-labelledby="performance-title" className="mt-10"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="performance-title" className="text-foreground text-xl font-bold">Desempenho</h2><p className="text-neutral mt-1 text-sm">Métricas calculadas para o período selecionado.</p></div><div className="w-full space-y-2 sm:w-48"><Label htmlFor="dashboard-period">Período</Label><Select id="dashboard-period" value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}>{dashboardPeriodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div></div>{performanceQuery.isError ? <DashboardError message="Não foi possível carregar o desempenho." retry={() => void performanceQuery.refetch()} /> : <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{performanceQuery.isPending ? renderSkeletons(6) : performanceMetrics?.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>}</section>
  </AppLayout>
}

export { DashboardPage }
