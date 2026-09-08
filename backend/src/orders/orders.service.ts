import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Perfil,
  Prisma,
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface.js';
import { DatabaseService } from '../database/database.service.js';
import { OrderDetailResponse } from './order-detail-response.dto.js';
import type { OrderCreateInput } from './order-create.schema.js';
import { OrderHistoryItemResponse } from './order-history-item-response.dto.js';
import { OrderListItemResponse } from './order-list-item-response.dto.js';
import type { OrderListQuery } from './order-list-query.schema.js';

export const ORDER_NOT_FOUND_ERROR = {
  code: 'ORDER_NOT_FOUND',
  message: 'Service order not found',
} as const;

export const ORDER_CLIENT_NOT_FOUND_ERROR = {
  code: 'ORDER_CLIENT_NOT_FOUND',
  message: 'Client not found',
} as const;

export const ORDER_CLIENT_INACTIVE_ERROR = {
  code: 'ORDER_CLIENT_INACTIVE',
  message: 'Client must be active to create a service order',
} as const;

export const ORDER_RESPONSIBLE_REQUIRED_ERROR = {
  code: 'ORDER_RESPONSIBLE_REQUIRED',
  message: 'An administrator must select a responsible employee',
} as const;

export const ORDER_RESPONSIBLE_NOT_FOUND_ERROR = {
  code: 'ORDER_RESPONSIBLE_NOT_FOUND',
  message: 'Responsible employee not found',
} as const;

export const ORDER_RESPONSIBLE_INACTIVE_ERROR = {
  code: 'ORDER_RESPONSIBLE_INACTIVE',
  message: 'Responsible employee must be active',
} as const;

const ORDER_COUNTER_ID = 1;
// Supports the required burst of up to 20 competing creations without an unbounded retry loop.
const MAX_SERIALIZABLE_TRANSACTION_ATTEMPTS = 25;

type LockedActiveRecord = {
  id: string;
  ativo: boolean;
};

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

const orderHistorySelect = {
  id: true,
  versao: true,
  descricao: true,
  valor: true,
  observacoes: true,
  status: true,
  visibilidade: true,
  concluidoEm: true,
  canceladoEm: true,
  snapshotEm: true,
  responsavel: { select: { id: true, nome: true } },
  alteradoPorUsuario: {
    select: { id: true, funcionario: { select: { nome: true } } },
  },
} satisfies Prisma.HistoricoOrdemServicoSelect;

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

  async create(
    authenticatedUser: AuthenticatedUser,
    input: OrderCreateInput,
  ): Promise<OrderDetailResponse> {
    const responsavelId = this.resolveResponsibleId(authenticatedUser, input);

    const order = await this.executeSerializableTransaction((transaction) =>
      this.createInTransaction(transaction, input, responsavelId),
    );

    return this.toDetailResponse(order);
  }

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

    return this.toDetailResponse(order);
  }

  async findHistory(
    authenticatedUser: AuthenticatedUser,
    id: string,
  ): Promise<OrderHistoryItemResponse[]> {
    const order = await this.database.ordemServico.findFirst({
      where: {
        id,
        ...this.getVisibilityWhere(authenticatedUser),
      },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException(ORDER_NOT_FOUND_ERROR);
    }

    const history = await this.database.historicoOrdemServico.findMany({
      where: { ordemServicoId: order.id },
      orderBy: [{ versao: 'desc' }, { id: 'desc' }],
      select: orderHistorySelect,
    });

    return history.map((snapshot) => ({
      id: snapshot.id,
      versao: snapshot.versao,
      descricao: snapshot.descricao,
      valor: snapshot.valor.toFixed(2),
      observacoes: snapshot.observacoes,
      status: snapshot.status,
      visibilidade: snapshot.visibilidade,
      concluidoEm: snapshot.concluidoEm,
      canceladoEm: snapshot.canceladoEm,
      snapshotEm: snapshot.snapshotEm,
      responsavel: snapshot.responsavel,
      alteradoPor: {
        id: snapshot.alteradoPorUsuario.id,
        nome: snapshot.alteradoPorUsuario.funcionario.nome,
      },
    }));
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

  private resolveResponsibleId(
    authenticatedUser: AuthenticatedUser,
    input: OrderCreateInput,
  ): string {
    if (authenticatedUser.perfil === Perfil.FUNCIONARIO) {
      return authenticatedUser.funcionarioId;
    }

    if (!input.responsavelId) {
      throw new BadRequestException(ORDER_RESPONSIBLE_REQUIRED_ERROR);
    }

    return input.responsavelId;
  }

  private async executeSerializableTransaction<TResult>(
    operation: (transaction: Prisma.TransactionClient) => Promise<TResult>,
  ): Promise<TResult> {
    for (
      let attempt = 1;
      attempt <= MAX_SERIALIZABLE_TRANSACTION_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this.database.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        if (
          this.isSerializationConflictError(error) &&
          attempt < MAX_SERIALIZABLE_TRANSACTION_ATTEMPTS
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Order creation exhausted its retry limit.');
  }

  private async createInTransaction(
    transaction: Prisma.TransactionClient,
    input: OrderCreateInput,
    responsavelId: string,
  ): Promise<
    Prisma.OrdemServicoGetPayload<{ select: typeof orderDetailSelect }>
  > {
    await this.lockActiveClient(transaction, input.clienteId);
    await this.lockActiveResponsible(transaction, responsavelId);

    const counter = await transaction.contadorOrdemServico.update({
      where: { id: ORDER_COUNTER_ID },
      data: { ultimoNumero: { increment: 1 } },
      select: { ultimoNumero: true },
    });
    const numero = `OS-${String(counter.ultimoNumero).padStart(6, '0')}`;

    return transaction.ordemServico.create({
      data: {
        numero,
        clienteId: input.clienteId,
        responsavelId,
        descricao: input.descricao,
        valor: new Prisma.Decimal(input.valor),
        observacoes: input.observacoes,
        status: StatusOrdemServico.AGUARDANDO,
        visibilidade: input.visibilidade,
        versao: 1,
        concluidoEm: null,
        canceladoEm: null,
      },
      select: orderDetailSelect,
    });
  }

  private async lockActiveClient(
    transaction: Prisma.TransactionClient,
    clientId: string,
  ): Promise<void> {
    const clients = await transaction.$queryRaw<LockedActiveRecord[]>(
      Prisma.sql`
        SELECT "id", "ativo"
        FROM "cliente"
        WHERE "id" = ${clientId}::uuid
        FOR UPDATE
      `,
    );
    const client = clients[0];

    if (!client) {
      throw new NotFoundException(ORDER_CLIENT_NOT_FOUND_ERROR);
    }

    if (!client.ativo) {
      throw new ConflictException(ORDER_CLIENT_INACTIVE_ERROR);
    }
  }

  private async lockActiveResponsible(
    transaction: Prisma.TransactionClient,
    responsibleId: string,
  ): Promise<void> {
    const employees = await transaction.$queryRaw<LockedActiveRecord[]>(
      Prisma.sql`
        SELECT "id", "ativo"
        FROM "funcionario"
        WHERE "id" = ${responsibleId}::uuid
        FOR UPDATE
      `,
    );
    const employee = employees[0];

    if (!employee) {
      throw new NotFoundException(ORDER_RESPONSIBLE_NOT_FOUND_ERROR);
    }

    if (!employee.ativo) {
      throw new ConflictException(ORDER_RESPONSIBLE_INACTIVE_ERROR);
    }
  }

  private isSerializationConflictError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return (
        error.code === 'P2034' ||
        (error.code === 'P2010' &&
          this.hasSerializationOriginalCode(error.meta))
      );
    }

    return this.hasSerializationOriginalCode(error);
  }

  private hasSerializationOriginalCode(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    return (
      ('originalCode' in value && value.originalCode === '40001') ||
      ('cause' in value && this.hasSerializationOriginalCode(value.cause)) ||
      ('driverAdapterError' in value &&
        this.hasSerializationOriginalCode(value.driverAdapterError))
    );
  }

  private toDetailResponse(
    order: Prisma.OrdemServicoGetPayload<{ select: typeof orderDetailSelect }>,
  ): OrderDetailResponse {
    return {
      ...this.toListResponse(order),
      descricao: order.descricao,
      observacoes: order.observacoes,
      concluidoEm: order.concluidoEm,
      canceladoEm: order.canceladoEm,
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
