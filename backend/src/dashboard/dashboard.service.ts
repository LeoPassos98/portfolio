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
import type { DashboardPerformanceQuery } from './dashboard-performance-query.schema.js';
import type {
  AdministratorDashboardPerformanceResponse,
  DashboardPerformanceResponse,
  EmployeeDashboardPerformanceResponse,
} from './dashboard-performance-response.dto.js';
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

  async getPerformance(
    authenticatedUser: AuthenticatedUser,
    query: DashboardPerformanceQuery,
  ): Promise<DashboardPerformanceResponse> {
    const scopedEmployeeId = this.resolveEmployeeScope(
      authenticatedUser,
      query.employeeId,
    );

    return this.database.$transaction(
      async (transaction) => {
        if (scopedEmployeeId) {
          return this.getEmployeePerformance(
            transaction,
            scopedEmployeeId,
            query,
          );
        }

        return this.getAdministratorPerformance(transaction, query);
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

  private async getAdministratorPerformance(
    transaction: Prisma.TransactionClient,
    query: DashboardPerformanceQuery,
  ): Promise<AdministratorDashboardPerformanceResponse> {
    const createdDuring = this.createdDuring(query);
    const [completedOrders, cancelledOrders, newClients, newEmployees] =
      await Promise.all([
        transaction.ordemServico.aggregate({
          where: this.completedOrdersWhere(query),
          _count: { id: true },
          _sum: { valor: true },
          _avg: { valor: true },
        }),
        transaction.ordemServico.count({
          where: this.cancelledOrdersWhere(query),
        }),
        transaction.cliente.count({
          where: createdDuring ? { criadoEm: createdDuring } : {},
        }),
        transaction.funcionario.count({
          where: createdDuring ? { criadoEm: createdDuring } : {},
        }),
      ]);

    return {
      scope: 'administrator',
      performance: {
        completedOrdersValue: this.formatMoney(completedOrders._sum.valor),
        completedOrders: completedOrders._count.id,
        cancelledOrders,
        newClients,
        newEmployees,
        averageCompletedOrderValue: this.formatMoney(
          completedOrders._avg.valor,
        ),
      },
    };
  }

  private async getEmployeePerformance(
    transaction: Prisma.TransactionClient,
    employeeId: string,
    query: DashboardPerformanceQuery,
  ): Promise<EmployeeDashboardPerformanceResponse> {
    const [employee, completedOrders, cancelledOrders, clientMetrics] =
      await Promise.all([
        transaction.funcionario.findUnique({
          where: { id: employeeId },
          select: { id: true },
        }),
        transaction.ordemServico.aggregate({
          where: this.completedOrdersWhere(query, employeeId),
          _count: { id: true },
          _sum: { valor: true },
          _avg: { valor: true },
        }),
        transaction.ordemServico.count({
          where: this.cancelledOrdersWhere(query, employeeId),
        }),
        this.countEmployeeClientMetrics(transaction, employeeId, query),
      ]);

    if (!employee) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_ERROR);
    }

    return {
      scope: 'employee',
      employeeId: employee.id,
      performance: {
        completedOrdersValue: this.formatMoney(completedOrders._sum.valor),
        completedOrders: completedOrders._count.id,
        cancelledOrders,
        averageCompletedOrderValue: this.formatMoney(
          completedOrders._avg.valor,
        ),
        recurringDistinctClients: clientMetrics.recurringDistinctClients,
        distinctClientsServed: clientMetrics.distinctClientsServed,
      },
    };
  }

  private completedOrdersWhere(
    query: DashboardPerformanceQuery,
    responsavelId?: string,
  ): Prisma.OrdemServicoWhereInput {
    return {
      ...(responsavelId ? { responsavelId } : {}),
      status: StatusOrdemServico.CONCLUIDO,
      ...(query.from && query.before
        ? { concluidoEm: { gte: query.from, lt: query.before } }
        : {}),
    };
  }

  private cancelledOrdersWhere(
    query: DashboardPerformanceQuery,
    responsavelId?: string,
  ): Prisma.OrdemServicoWhereInput {
    return {
      ...(responsavelId ? { responsavelId } : {}),
      status: StatusOrdemServico.CANCELADO,
      ...(query.from && query.before
        ? { canceladoEm: { gte: query.from, lt: query.before } }
        : {}),
    };
  }

  private createdDuring(
    query: DashboardPerformanceQuery,
  ): Prisma.DateTimeFilter | undefined {
    if (!query.from || !query.before) return undefined;
    return { gte: query.from, lt: query.before };
  }

  private async countEmployeeClientMetrics(
    transaction: Prisma.TransactionClient,
    employeeId: string,
    query: DashboardPerformanceQuery,
  ): Promise<{
    distinctClientsServed: number;
    recurringDistinctClients: number;
  }> {
    const periodCondition =
      query.from && query.before
        ? Prisma.sql`
            AND candidate."concluido_em" >= ${query.from}
            AND candidate."concluido_em" < ${query.before}
          `
        : Prisma.empty;
    const [metrics] = await transaction.$queryRaw<
      Array<{
        distinctClientsServed: number;
        recurringDistinctClients: number;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(DISTINCT candidate."cliente_id")::integer AS "distinctClientsServed",
        COUNT(DISTINCT candidate."cliente_id") FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM "ordem_servico" AS prior
            WHERE prior."cliente_id" = candidate."cliente_id"
              AND prior."status" = 'CONCLUIDO'::"status_ordem_servico"
              AND prior."concluido_em" < candidate."concluido_em"
          )
        )::integer AS "recurringDistinctClients"
      FROM "ordem_servico" AS candidate
      WHERE candidate."status" = 'CONCLUIDO'::"status_ordem_servico"
        AND candidate."responsavel_id" = ${employeeId}::uuid
        ${periodCondition}
    `);

    return metrics ?? { distinctClientsServed: 0, recurringDistinctClients: 0 };
  }

  private formatMoney(value: Prisma.Decimal | null): string {
    return value?.toFixed(2) ?? '0.00';
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
