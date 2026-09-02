import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Perfil,
  Prisma,
  StatusOrdemServico,
} from '../generated/prisma/client.js';
import { PasswordService } from '../auth/password/password.service.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { EmployeeCreateInput } from './employee-create.schema.js';
import type { EmployeeAccessCreateInput } from './employee-access-create.schema.js';
import { EmployeeDetailResponse } from './employee-detail-response.dto.js';
import type { EmployeeListQuery } from './employee-list-query.schema.js';
import { EmployeeListItemResponse } from './employee-list-item-response.dto.js';
import type { EmployeeUpdateInput } from './employee-update.schema.js';
import type { EmployeeStatusUpdateInput } from './employee-status-update.schema.js';

export const EMPLOYEE_NOT_FOUND_ERROR = {
  code: 'EMPLOYEE_NOT_FOUND',
  message: 'Employee not found',
} as const;

export const EMPLOYEE_HAS_ACTIVE_ORDERS_ERROR = {
  code: 'EMPLOYEE_HAS_ACTIVE_ORDERS',
  message:
    'Employee has active service orders that must be completed, canceled, or transferred before deactivation',
} as const;

export const LAST_ACTIVE_ADMIN_REQUIRED_ERROR = {
  code: 'LAST_ACTIVE_ADMIN_REQUIRED',
  message: 'At least one active administrator account must remain',
} as const;

export const EMPLOYEE_ACCESS_ALREADY_EXISTS_ERROR = {
  code: 'EMPLOYEE_ACCESS_ALREADY_EXISTS',
  message: 'Employee already has an access account',
} as const;

export const LOGIN_EMAIL_ALREADY_EXISTS_ERROR = {
  code: 'LOGIN_EMAIL_ALREADY_EXISTS',
  message: 'Login email already exists',
} as const;

const MAX_STATUS_UPDATE_ATTEMPTS = 3;

const employeeListSelect = {
  id: true,
  nome: true,
  telefone: true,
  email: true,
  ativo: true,
  usuario: {
    select: {
      ativo: true,
      perfil: true,
    },
  },
} satisfies Prisma.FuncionarioSelect;

const employeeDetailSelect = {
  id: true,
  nome: true,
  telefone: true,
  email: true,
  ativo: true,
  criadoEm: true,
  usuario: {
    select: {
      emailLogin: true,
      ativo: true,
      perfil: true,
    },
  },
} satisfies Prisma.FuncionarioSelect;

const employeeStatusSelect = {
  ...employeeDetailSelect,
  usuario: {
    select: {
      id: true,
      emailLogin: true,
      ativo: true,
      perfil: true,
    },
  },
} satisfies Prisma.FuncionarioSelect;

type EmployeeStatusTransition = {
  employee: Prisma.FuncionarioGetPayload<{
    select: typeof employeeStatusSelect;
  }>;
  revokedUserId: string | null;
};

const profileByInput: Record<EmployeeAccessCreateInput['profile'], Perfil> = {
  administrator: Perfil.ADMINISTRADOR,
  employee: Perfil.FUNCIONARIO,
};

function toEmployeeDetail(
  employee: Prisma.FuncionarioGetPayload<{
    select: typeof employeeDetailSelect;
  }>,
): EmployeeDetailResponse {
  const { usuario, ...employeeDetail } = employee;

  return {
    ...employeeDetail,
    conta: usuario,
  };
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly sessionStoreService: SessionStoreService,
    private readonly passwordService: PasswordService,
  ) {}

  async create({
    status,
    ...employeeData
  }: EmployeeCreateInput): Promise<EmployeeDetailResponse> {
    const employee = await this.database.funcionario.create({
      data: {
        ...employeeData,
        ativo: status === 'active',
      },
      select: employeeDetailSelect,
    });

    return toEmployeeDetail(employee);
  }

  async update(
    id: string,
    { nome, telefone, email }: EmployeeUpdateInput,
  ): Promise<EmployeeDetailResponse> {
    try {
      const employee = await this.database.funcionario.update({
        where: { id },
        data: { nome, telefone, email },
        select: employeeDetailSelect,
      });

      return toEmployeeDetail(employee);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(EMPLOYEE_NOT_FOUND_ERROR);
      }

      throw error;
    }
  }

  async createAccess(
    employeeId: string,
    { loginEmail, profile, initialPassword }: EmployeeAccessCreateInput,
  ): Promise<EmployeeDetailResponse> {
    const employee = await this.database.funcionario.findUnique({
      where: { id: employeeId },
      select: { id: true, usuario: { select: { id: true } } },
    });

    if (!employee) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_ERROR);
    }

    if (employee.usuario) {
      throw new ConflictException(EMPLOYEE_ACCESS_ALREADY_EXISTS_ERROR);
    }

    const senhaHash = await this.passwordService.hash(initialPassword);

    try {
      const account = await this.database.usuario.create({
        data: {
          emailLogin: loginEmail,
          senhaHash,
          perfil: profileByInput[profile],
          funcionarioId: employee.id,
        },
        select: {
          funcionario: { select: employeeDetailSelect },
        },
      });

      return toEmployeeDetail(account.funcionario);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        const account = await this.database.usuario.findUnique({
          where: { funcionarioId: employee.id },
          select: { id: true },
        });

        if (account) {
          throw new ConflictException(EMPLOYEE_ACCESS_ALREADY_EXISTS_ERROR);
        }

        throw new ConflictException(LOGIN_EMAIL_ALREADY_EXISTS_ERROR);
      }

      throw error;
    }
  }

  async updateStatus(
    id: string,
    { status }: EmployeeStatusUpdateInput,
  ): Promise<EmployeeDetailResponse> {
    const transition = await this.executeStatusTransition(id, status);

    if (transition.revokedUserId) {
      await this.sessionStoreService.revokeUserSessions(
        transition.revokedUserId,
      );
    }

    return toEmployeeDetail(transition.employee);
  }

  async findAll({
    status,
    search,
  }: EmployeeListQuery): Promise<EmployeeListItemResponse[]> {
    const phoneSearch = search?.replace(/\D/g, '');
    const where = {
      ...(status === 'active' ? { ativo: true } : {}),
      ...(status === 'inactive' ? { ativo: false } : {}),
      ...(search
        ? {
            OR: [
              {
                nome: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              ...(phoneSearch
                ? [
                    {
                      telefone: {
                        contains: phoneSearch,
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    } satisfies Prisma.FuncionarioWhereInput;

    const employees = await this.database.funcionario.findMany({
      where,
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      select: employeeListSelect,
    });

    return employees.map(({ usuario, ...employee }) => ({
      ...employee,
      conta: usuario,
    }));
  }

  async findOne(id: string): Promise<EmployeeDetailResponse> {
    const employee = await this.database.funcionario.findUnique({
      where: { id },
      select: employeeDetailSelect,
    });

    if (!employee) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_ERROR);
    }

    return toEmployeeDetail(employee);
  }

  private async executeStatusTransition(
    id: string,
    status: EmployeeStatusUpdateInput['status'],
  ): Promise<EmployeeStatusTransition> {
    for (let attempt = 1; attempt <= MAX_STATUS_UPDATE_ATTEMPTS; attempt += 1) {
      try {
        return await this.database.$transaction(
          (transaction) => this.transitionStatus(transaction, id, status),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < MAX_STATUS_UPDATE_ATTEMPTS
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Employee status transition exhausted its retry limit.');
  }

  private async transitionStatus(
    transaction: Prisma.TransactionClient,
    id: string,
    status: EmployeeStatusUpdateInput['status'],
  ): Promise<EmployeeStatusTransition> {
    const employee = await transaction.funcionario.findUnique({
      where: { id },
      select: employeeStatusSelect,
    });

    if (!employee) {
      throw new NotFoundException(EMPLOYEE_NOT_FOUND_ERROR);
    }

    const shouldDeactivateAccount =
      status === 'inactive' && employee.usuario?.ativo === true;

    if (employee.ativo === (status === 'active') && !shouldDeactivateAccount) {
      return { employee, revokedUserId: null };
    }

    if (status === 'inactive' && employee.ativo) {
      await this.ensureNoActiveOrders(transaction, id);
    }

    if (
      shouldDeactivateAccount &&
      employee.usuario?.perfil === Perfil.ADMINISTRADOR
    ) {
      await this.ensureAnotherActiveAdministrator(transaction);
    }

    if (shouldDeactivateAccount) {
      await transaction.usuario.update({
        where: { id: employee.usuario!.id },
        data: { ativo: false },
      });
    }

    const updatedEmployee = await transaction.funcionario.update({
      where: { id },
      data: { ativo: status === 'active' },
      select: employeeStatusSelect,
    });

    return {
      employee: updatedEmployee,
      revokedUserId: shouldDeactivateAccount ? employee.usuario!.id : null,
    };
  }

  private async ensureNoActiveOrders(
    transaction: Prisma.TransactionClient,
    employeeId: string,
  ): Promise<void> {
    const activeOrder = await transaction.ordemServico.findFirst({
      where: {
        responsavelId: employeeId,
        status: {
          in: [StatusOrdemServico.AGUARDANDO, StatusOrdemServico.EM_ANDAMENTO],
        },
      },
      select: { id: true },
    });

    if (activeOrder) {
      throw new ConflictException(EMPLOYEE_HAS_ACTIVE_ORDERS_ERROR);
    }
  }

  private async ensureAnotherActiveAdministrator(
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    const activeAdministrators = await transaction.usuario.count({
      where: {
        perfil: Perfil.ADMINISTRADOR,
        ativo: true,
      },
    });

    if (activeAdministrators <= 1) {
      throw new ConflictException(LAST_ACTIVE_ADMIN_REQUIRED_ERROR);
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
