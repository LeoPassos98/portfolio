import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import type { ClientListQuery } from './client-list-query.schema.js';
import { ClientDetailResponse } from './client-detail-response.dto.js';
import { ClientListItemResponse } from './client-list-item-response.dto.js';

export const CLIENT_NOT_FOUND_ERROR = {
  code: 'CLIENT_NOT_FOUND',
  message: 'Client not found',
} as const;

const clientListSelect = {
  id: true,
  nome: true,
  telefone: true,
  documento: true,
  ativo: true,
} satisfies Prisma.ClienteSelect;

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
} satisfies Prisma.ClienteSelect;

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
    } satisfies Prisma.ClienteWhereInput;

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
}
