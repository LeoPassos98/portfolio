import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Perfil,
  Prisma,
  StatusOrdemServico,
} from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface.js';
import { DatabaseService } from '../database/database.service.js';
import { EMPLOYEE_NOT_FOUND_ERROR } from '../employees/employees.service.js';
import type { DashboardSituationQuery } from './dashboard-situation-query.schema.js';
import type {
  AdministratorDashboardSituationResponse,
  DashboardSituationResponse,
  EmployeeDashboardSituationResponse,
} from './dashboard-situation-response.dto.js';

export const DASHBOARD_SCOPE_FORBIDDEN_ERROR = {
  code: 'DASHBOARD_SCOPE_FORBIDDEN',
  message: 'Employee cannot view another employee dashboard situation',
} as const;

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getSituation(
    authenticatedUser: AuthenticatedUser,
    { employeeId }: DashboardSituationQuery,
  ): Promise<DashboardSituationResponse> {
    const scopedEmployeeId = this.resolveEmployeeScope(
      authenticatedUser,
      employeeId,
    );

    return this.database.$transaction(
      async (transaction) => {
        if (scopedEmployeeId) {
          return this.getEmployeeSituation(transaction, scopedEmployeeId);
        }

        return this.getAdministratorSituation(transaction);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private resolveEmployeeScope(
    authenticatedUser: AuthenticatedUser,
    employeeId: string | undefined,
  ): string | undefined {
    if (authenticatedUser.perfil === Perfil.ADMINISTRADOR) {
      return employeeId;
    }

    if (employeeId && employeeId !== authenticatedUser.funcionarioId) {
      throw new ForbiddenException(DASHBOARD_SCOPE_FORBIDDEN_ERROR);
    }

    return authenticatedUser.funcionarioId;
  }

  private async getAdministratorSituation(
    transaction: Prisma.TransactionClient,
  ): Promise<AdministratorDashboardSituationResponse> {
    const [
      activeClients,
      totalClients,
      activeEmployees,
      totalEmployees,
      orders,
    ] = await Promise.all([
      transaction.cliente.count({ where: { ativo: true } }),
      transaction.cliente.count(),
      transaction.funcionario.count({ where: { ativo: true } }),
      transaction.funcionario.count(),
      this.countOrders(transaction),
    ]);

    return {
      scope: 'administrator',
      clients: { active: activeClients, total: totalClients },
      employees: { active: activeEmployees, total: totalEmployees },
      orders,
    };
  }

  private async getEmployeeSituation(
    transaction: Prisma.TransactionClient,
    employeeId: string,
  ): Promise<EmployeeDashboardSituationResponse> {
    const [employee, orders] = await Promise.all([
      transaction.funcionario.findUnique({
        where: { id: employeeId },
        select: { id: true },
      }),
      this.countOrders(transaction, employeeId),
    ]);

    if (!employee) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_ERROR);
    }

    return { scope: 'employee', employeeId: employee.id, orders };
  }

  private async countOrders(
    transaction: Prisma.TransactionClient,
    responsavelId?: string,
  ): Promise<{ awaiting: number; inProgress: number; total: number }> {
    const responsibleWhere = responsavelId ? { responsavelId } : {};
    const [awaiting, inProgress, total] = await Promise.all([
      transaction.ordemServico.count({
        where: { ...responsibleWhere, status: StatusOrdemServico.AGUARDANDO },
      }),
      transaction.ordemServico.count({
        where: {
          ...responsibleWhere,
          status: StatusOrdemServico.EM_ANDAMENTO,
        },
      }),
      transaction.ordemServico.count({ where: responsibleWhere }),
    ]);

    return { awaiting, inProgress, total };
  }
}
