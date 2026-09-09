import type { DashboardPeriodRange } from './dashboardApi'

const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  situationAdministrator: () => ['dashboard', 'administrator', 'situation'] as const,
  situationEmployee: (employeeId: string) =>
    ['dashboard', 'employee', employeeId, 'situation'] as const,
  performanceAdministrator: (range: DashboardPeriodRange) =>
    ['dashboard', 'administrator', 'performance', range] as const,
  performanceEmployee: (employeeId: string, range: DashboardPeriodRange) =>
    ['dashboard', 'employee', employeeId, 'performance', range] as const,
}

export { dashboardQueryKeys }
