import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import type { EmployeeCreateInput } from './employee-create.schema.js';
import { EmployeeDetailResponse } from './employee-detail-response.dto.js';
import type { EmployeeListQuery } from './employee-list-query.schema.js';
import { EmployeeListItemResponse } from './employee-list-item-response.dto.js';
import type { EmployeeUpdateInput } from './employee-update.schema.js';

export const EMPLOYEE_NOT_FOUND_ERROR = {
  code: 'EMPLOYEE_NOT_FOUND',
  message: 'Employee not found',
} as const;

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
  constructor(private readonly database: DatabaseService) {}

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
}
