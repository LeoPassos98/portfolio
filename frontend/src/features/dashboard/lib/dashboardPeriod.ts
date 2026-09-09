import type { DashboardPeriodRange } from '../api/dashboardApi'

type DashboardPeriod =
  | 'current-month'
  | 'previous-month'
  | 'current-year'
  | 'all-time'

const dashboardPeriodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'current-month', label: 'Este mês' },
  { value: 'previous-month', label: 'Mês anterior' },
  { value: 'current-year', label: 'Este ano' },
  { value: 'all-time', label: 'Todo o período' },
]

function resolveDashboardPeriodRange(
  period: DashboardPeriod,
  now: Date = new Date(),
): DashboardPeriodRange {
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'current-month':
      return {
        from: new Date(year, month, 1).toISOString(),
        before: new Date(year, month + 1, 1).toISOString(),
      }
    case 'previous-month':
      return {
        from: new Date(year, month - 1, 1).toISOString(),
        before: new Date(year, month, 1).toISOString(),
      }
    case 'current-year':
      return {
        from: new Date(year, 0, 1).toISOString(),
        before: new Date(year + 1, 0, 1).toISOString(),
      }
    case 'all-time':
      return {}
  }
}

export { dashboardPeriodOptions, resolveDashboardPeriodRange }
export type { DashboardPeriod }
