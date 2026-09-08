import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Perfil,
  Prisma,
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface.js';
import { DatabaseService } from '../database/database.service.js';
import { OrderDetailResponse } from './order-detail-response.dto.js';
import { OrderListItemResponse } from './order-list-item-response.dto.js';
import type { OrderListQuery } from './order-list-query.schema.js';

export const ORDER_NOT_FOUND_ERROR = {
  code: 'ORDER_NOT_FOUND',
  message: 'Service order not found',
} as const;

const orderListSelect = {
  id: true,
  numero: true,
  status: true,
  valor: true,
  visibilidade: true,
  versao: true,
  criadoEm: true,
  atualizadoEm: true,
  cliente: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
} satisfies Prisma.OrdemServicoSelect;

const orderDetailSelect = {
  ...orderListSelect,
  descricao: true,
  observacoes: true,
  concluidoEm: true,
  canceladoEm: true,
} satisfies Prisma.OrdemServicoSelect;

const statusesByFilter: Partial<
  Record<OrderListQuery['status'], StatusOrdemServico[]>
> = {
  open: [StatusOrdemServico.AGUARDANDO, StatusOrdemServico.EM_ANDAMENTO],
  awaiting: [StatusOrdemServico.AGUARDANDO],
  'in-progress': [StatusOrdemServico.EM_ANDAMENTO],
  completed: [StatusOrdemServico.CONCLUIDO],
  cancelled: [StatusOrdemServico.CANCELADO],
};

@Injectable()
export class OrdersService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(
    authenticatedUser: AuthenticatedUser,
    { status, search }: OrderListQuery,
  ): Promise<OrderListItemResponse[]> {
    const conditions: Prisma.OrdemServicoWhereInput[] = [
      this.getVisibilityWhere(authenticatedUser),
    ];
    const statuses = statusesByFilter[status];

    if (statuses) {
      conditions.push({ status: { in: statuses } });
    }

    if (search) {
      conditions.push({
        OR: [
          { numero: { contains: search, mode: 'insensitive' } },
          { cliente: { nome: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.OrdemServicoWhereInput = { AND: conditions };

    const orders = await this.database.ordemServico.findMany({
      where,
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      select: orderListSelect,
    });

    return orders.map((order) => this.toListResponse(order));
  }

  async findOne(
    authenticatedUser: AuthenticatedUser,
    id: string,
  ): Promise<OrderDetailResponse> {
    const order = await this.database.ordemServico.findFirst({
      where: {
        id,
        ...this.getVisibilityWhere(authenticatedUser),
      },
      select: orderDetailSelect,
    });

    if (!order) {
      throw new NotFoundException(ORDER_NOT_FOUND_ERROR);
    }

    return {
      ...this.toListResponse(order),
      descricao: order.descricao,
      observacoes: order.observacoes,
      concluidoEm: order.concluidoEm,
      canceladoEm: order.canceladoEm,
    };
  }

  private getVisibilityWhere(
    authenticatedUser: AuthenticatedUser,
  ): Prisma.OrdemServicoWhereInput {
    if (authenticatedUser.perfil === Perfil.ADMINISTRADOR) {
      return {};
    }

    return {
      OR: [
        { responsavelId: authenticatedUser.funcionarioId },
        { visibilidade: Visibilidade.PUBLICA },
      ],
    };
  }

  private toListResponse(
    order: Prisma.OrdemServicoGetPayload<{ select: typeof orderListSelect }>,
  ): OrderListItemResponse {
    return {
      id: order.id,
      numero: order.numero,
      cliente: order.cliente,
      responsavel: order.responsavel,
      status: order.status,
      valor: order.valor.toFixed(2),
      visibilidade: order.visibilidade,
      criadoEm: order.criadoEm,
      atualizadoEm: order.atualizadoEm,
      versao: order.versao,
    };
  }
}
