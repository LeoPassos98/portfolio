import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Prisma as PrismaTypes,
} from '../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import type { ClientCreateInput } from './client-create.schema.js';
import type { ClientListQuery } from './client-list-query.schema.js';
import type { ClientStatusUpdateInput } from './client-status-update.schema.js';
import type { ClientUpdateInput } from './client-update.schema.js';
import { ClientDetailResponse } from './client-detail-response.dto.js';
import { ClientListItemResponse } from './client-list-item-response.dto.js';

export const CLIENT_NOT_FOUND_ERROR = {
  code: 'CLIENT_NOT_FOUND',
  message: 'Client not found',
} as const;

export const CLIENT_DOCUMENT_ALREADY_EXISTS_ERROR = {
  code: 'CLIENT_DOCUMENT_ALREADY_EXISTS',
  message: 'Client document already exists',
} as const;

export const CLIENT_HAS_ORDERS_ERROR = {
  code: 'CLIENT_HAS_ORDERS',
  message:
    'Client has linked service orders and must be deactivated instead of deleted',
} as const;

const clientListSelect = {
  id: true,
  nome: true,
  telefone: true,
  documento: true,
  ativo: true,
} satisfies PrismaTypes.ClienteSelect;

const clientDetailSelect = {
  id: true,
  nome: true,
  telefone: true,
  documento: true,
  email: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
  ativo: true,
  criadoEm: true,
} satisfies PrismaTypes.ClienteSelect;

@Injectable()
export class ClientsService {
  constructor(private readonly database: DatabaseService) {}

  async findAll({
    status,
    search,
  }: ClientListQuery): Promise<ClientListItemResponse[]> {
    const documentSearch = search?.replace(/\D/g, '');
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
              ...(documentSearch
                ? [
                    {
                      documento: {
                        contains: documentSearch,
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    } satisfies PrismaTypes.ClienteWhereInput;

    return this.database.cliente.findMany({
      where,
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      select: clientListSelect,
    });
  }

  async findOne(id: string): Promise<ClientDetailResponse> {
    const client = await this.database.cliente.findUnique({
      where: { id },
      select: clientDetailSelect,
    });

    if (!client) {
      throw new NotFoundException(CLIENT_NOT_FOUND_ERROR);
    }

    return client;
  }

  async create(input: ClientCreateInput): Promise<ClientDetailResponse> {
    try {
      return await this.database.cliente.create({
        data: {
          ...input,
          ativo: true,
        },
        select: clientDetailSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(CLIENT_DOCUMENT_ALREADY_EXISTS_ERROR);
      }

      throw error;
    }
  }

  async update(
    id: string,
    input: ClientUpdateInput,
  ): Promise<ClientDetailResponse> {
    try {
      return await this.database.cliente.update({
        where: { id },
        data: input,
        select: clientDetailSelect,
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(CLIENT_DOCUMENT_ALREADY_EXISTS_ERROR);
        }

        if (error.code === 'P2025') {
          throw new NotFoundException(CLIENT_NOT_FOUND_ERROR);
        }
      }

      throw error;
    }
  }

  async updateStatus(
    id: string,
    { status }: ClientStatusUpdateInput,
  ): Promise<ClientDetailResponse> {
    try {
      return await this.database.cliente.update({
        where: { id },
        data: { ativo: status === 'active' },
        select: clientDetailSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(CLIENT_NOT_FOUND_ERROR);
      }

      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const order = await this.database.ordemServico.findFirst({
      where: { clienteId: id },
      select: { id: true },
    });

    if (order) {
      throw new ConflictException(CLIENT_HAS_ORDERS_ERROR);
    }

    try {
      await this.database.cliente.delete({ where: { id } });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(CLIENT_HAS_ORDERS_ERROR);
        }

        if (error.code === 'P2025') {
          throw new NotFoundException(CLIENT_NOT_FOUND_ERROR);
        }
      }

      throw error;
    }
  }
}
