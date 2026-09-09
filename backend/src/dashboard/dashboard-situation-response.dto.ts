import { ApiProperty } from '@nestjs/swagger';

export class DashboardOrderSituationResponse {
  @ApiProperty({ example: 3, minimum: 0 })
  awaiting!: number;

  @ApiProperty({ example: 2, minimum: 0 })
  inProgress!: number;

  @ApiProperty({ example: 8, minimum: 0 })
  total!: number;
}

export class DashboardEntitySituationResponse {
  @ApiProperty({ example: 12, minimum: 0 })
  active!: number;

  @ApiProperty({ example: 15, minimum: 0 })
  total!: number;
}

export class AdministratorDashboardSituationResponse {
  @ApiProperty({ enum: ['administrator'], example: 'administrator' })
  scope!: 'administrator';

  @ApiProperty({ type: DashboardEntitySituationResponse })
  clients!: DashboardEntitySituationResponse;

  @ApiProperty({ type: DashboardEntitySituationResponse })
  employees!: DashboardEntitySituationResponse;

  @ApiProperty({ type: DashboardOrderSituationResponse })
  orders!: DashboardOrderSituationResponse;
}

export class EmployeeDashboardSituationResponse {
  @ApiProperty({ enum: ['employee'], example: 'employee' })
  scope!: 'employee';

  @ApiProperty({ format: 'uuid' })
  employeeId!: string;

  @ApiProperty({ type: DashboardOrderSituationResponse })
  orders!: DashboardOrderSituationResponse;
}

export type DashboardSituationResponse =
  AdministratorDashboardSituationResponse | EmployeeDashboardSituationResponse;
