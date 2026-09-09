import { ApiProperty } from '@nestjs/swagger';

export class AdministratorDashboardPerformanceMetricsResponse {
  @ApiProperty({ example: '48750.00', pattern: '^\\d+\\.\\d{2}$' })
  completedOrdersValue!: string;

  @ApiProperty({ example: 34, minimum: 0 })
  completedOrders!: number;

  @ApiProperty({ example: 3, minimum: 0 })
  cancelledOrders!: number;

  @ApiProperty({ example: 8, minimum: 0 })
  newClients!: number;

  @ApiProperty({ example: 2, minimum: 0 })
  newEmployees!: number;

  @ApiProperty({ example: '1433.82', pattern: '^\\d+\\.\\d{2}$' })
  averageCompletedOrderValue!: string;
}

export class EmployeeDashboardPerformanceMetricsResponse {
  @ApiProperty({ example: '12600.00', pattern: '^\\d+\\.\\d{2}$' })
  completedOrdersValue!: string;

  @ApiProperty({ example: 9, minimum: 0 })
  completedOrders!: number;

  @ApiProperty({ example: 1, minimum: 0 })
  cancelledOrders!: number;

  @ApiProperty({ example: '1400.00', pattern: '^\\d+\\.\\d{2}$' })
  averageCompletedOrderValue!: string;

  @ApiProperty({ example: 4, minimum: 0 })
  recurringDistinctClients!: number;

  @ApiProperty({ example: 7, minimum: 0 })
  distinctClientsServed!: number;
}

export class AdministratorDashboardPerformanceResponse {
  @ApiProperty({ enum: ['administrator'], example: 'administrator' })
  scope!: 'administrator';

  @ApiProperty({ type: AdministratorDashboardPerformanceMetricsResponse })
  performance!: AdministratorDashboardPerformanceMetricsResponse;
}

export class EmployeeDashboardPerformanceResponse {
  @ApiProperty({ enum: ['employee'], example: 'employee' })
  scope!: 'employee';

  @ApiProperty({ format: 'uuid' })
  employeeId!: string;

  @ApiProperty({ type: EmployeeDashboardPerformanceMetricsResponse })
  performance!: EmployeeDashboardPerformanceMetricsResponse;
}

export type DashboardPerformanceResponse =
  | AdministratorDashboardPerformanceResponse
  | EmployeeDashboardPerformanceResponse;
