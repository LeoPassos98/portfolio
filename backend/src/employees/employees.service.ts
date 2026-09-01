import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import { EmployeeDetailResponse } from './employee-detail-response.dto.js';
import type { EmployeeListQuery } from './employee-list-query.schema.js';
import { EmployeeListItemResponse } from './employee-list-item-response.dto.js';

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

@Injectable()
export class EmployeesService {
  constructor(private readonly database: DatabaseService) {}

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

    const { usuario, ...employeeDetail } = employee;

    return {
      ...employeeDetail,
      conta: usuario,
    };
  }
}
