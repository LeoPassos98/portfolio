import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import type { OrderUpdateInput } from './order-update.schema.js';

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

export const ORDER_VERSION_CONFLICT_ERROR = {
  code: 'ORDER_VERSION_CONFLICT',
  message: 'Service order was changed by another request',
} as const;

export const ORDER_UPDATE_FORBIDDEN_ERROR = {
  code: 'ORDER_UPDATE_FORBIDDEN',
  message: 'User cannot update this service order',
} as const;

export const ORDER_UPDATE_INVALID_FOR_STATE_ERROR = {
  code: 'ORDER_UPDATE_INVALID_FOR_STATE',
  message: 'Service order cannot be updated in its current state',
} as const;

export const ORDER_RESPONSIBLE_CHANGE_FORBIDDEN_ERROR = {
  code: 'ORDER_RESPONSIBLE_CHANGE_FORBIDDEN',
  message: 'Employee cannot change the responsible employee',
} as const;

const ORDER_COUNTER_ID = 1;
// The creation burst defines the upper bound; updates keep the request version fixed on every retry.
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

type OrderDetailRecord = Prisma.OrdemServicoGetPayload<{
  select: typeof orderDetailSelect;
}>;

type OrderChangedFields = Record<
  | 'descricao'
  | 'valor'
  | 'observacoes'
  | 'status'
  | 'visibilidade'
  | 'responsavel',
  boolean
>;

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

    const order = await this.executeSerializableTransaction(
      (transaction) =>
        this.createInTransaction(transaction, input, responsavelId),
      'Order creation exhausted its retry limit.',
    );

    return this.toDetailResponse(order);
  }

  async update(
    authenticatedUser: AuthenticatedUser,
    id: string,
    input: OrderUpdateInput,
  ): Promise<OrderDetailResponse> {
    try {
      const order = await this.executeSerializableTransaction(
        (transaction) =>
          this.updateInTransaction(transaction, authenticatedUser, id, input),
        'Order update exhausted its retry limit.',
      );

      return this.toDetailResponse(order);
    } catch (error: unknown) {
      if (this.isHistoryVersionUniqueConstraintError(error)) {
        throw new ConflictException(ORDER_VERSION_CONFLICT_ERROR);
      }

      if (
        this.isSerializationConflictError(error) &&
        (await this.hasPersistedVersionChanged(id, input.versao))
      ) {
        throw new ConflictException(ORDER_VERSION_CONFLICT_ERROR);
      }

      throw error;
    }
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
    exhaustedMessage: string,
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

    throw new Error(exhaustedMessage);
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

  private async updateInTransaction(
    transaction: Prisma.TransactionClient,
    authenticatedUser: AuthenticatedUser,
    id: string,
    input: OrderUpdateInput,
  ): Promise<OrderDetailRecord> {
    const current = await transaction.ordemServico.findFirst({
      where: {
        id,
        ...this.getVisibilityWhere(authenticatedUser),
      },
      select: orderDetailSelect,
    });

    if (!current) {
      throw new NotFoundException(ORDER_NOT_FOUND_ERROR);
    }

    if (current.versao !== input.versao) {
      throw new ConflictException(ORDER_VERSION_CONFLICT_ERROR);
    }

    const currentResponsibleId = current.responsavel.id;
    const nextResponsibleId = input.responsavelId ?? currentResponsibleId;
    const responsibleChanged = nextResponsibleId !== currentResponsibleId;

    this.validateUpdateAuthorization(
      authenticatedUser,
      current,
      responsibleChanged,
    );

    const nextValue = new Prisma.Decimal(input.valor);
    const changedFields = {
      descricao: input.descricao !== current.descricao,
      valor: !nextValue.equals(current.valor),
      observacoes: input.observacoes !== current.observacoes,
      status: input.status !== current.status,
      visibilidade: input.visibilidade !== current.visibilidade,
      responsavel: responsibleChanged,
    };
    const hasChanges = Object.values(changedFields).some(Boolean);

    if (!hasChanges) {
      return current;
    }

    this.validateUpdateForState(
      authenticatedUser,
      current.status,
      input.status,
      changedFields,
    );

    if (responsibleChanged) {
      await this.validateActiveResponsible(transaction, nextResponsibleId);
    }

    const transitionDates = this.resolveTransitionDates(current, input.status);

    await transaction.historicoOrdemServico.create({
      data: {
        ordemServicoId: current.id,
        versao: current.versao,
        descricao: current.descricao,
        valor: current.valor,
        observacoes: current.observacoes,
        status: current.status,
        visibilidade: current.visibilidade,
        responsavelId: currentResponsibleId,
        concluidoEm: current.concluidoEm,
        canceladoEm: current.canceladoEm,
        alteradoPorUsuarioId: authenticatedUser.id,
      },
    });

    const update = await transaction.ordemServico.updateMany({
      where: { id: current.id, versao: input.versao },
      data: {
        descricao: input.descricao,
        valor: nextValue,
        observacoes: input.observacoes,
        status: input.status,
        visibilidade: input.visibilidade,
        responsavelId: nextResponsibleId,
        concluidoEm: transitionDates.concluidoEm,
        canceladoEm: transitionDates.canceladoEm,
        versao: { increment: 1 },
      },
    });

    if (update.count !== 1) {
      throw new ConflictException(ORDER_VERSION_CONFLICT_ERROR);
    }

    return transaction.ordemServico.findUniqueOrThrow({
      where: { id: current.id },
      select: orderDetailSelect,
    });
  }

  private validateUpdateAuthorization(
    authenticatedUser: AuthenticatedUser,
    current: OrderDetailRecord,
    responsibleChanged: boolean,
  ): void {
    if (authenticatedUser.perfil === Perfil.ADMINISTRADOR) return;

    if (current.responsavel.id !== authenticatedUser.funcionarioId) {
      throw new ForbiddenException(ORDER_UPDATE_FORBIDDEN_ERROR);
    }

    if (responsibleChanged) {
      throw new ForbiddenException(ORDER_RESPONSIBLE_CHANGE_FORBIDDEN_ERROR);
    }
  }

  private validateUpdateForState(
    authenticatedUser: AuthenticatedUser,
    currentStatus: StatusOrdemServico,
    nextStatus: StatusOrdemServico,
    changedFields: OrderChangedFields,
  ): void {
    const isOpen =
      currentStatus === StatusOrdemServico.AGUARDANDO ||
      currentStatus === StatusOrdemServico.EM_ANDAMENTO;

    if (isOpen) return;

    if (authenticatedUser.perfil === Perfil.FUNCIONARIO) {
      throw new ConflictException(ORDER_UPDATE_INVALID_FOR_STATE_ERROR);
    }

    if (currentStatus === StatusOrdemServico.CONCLUIDO) {
      const allowedStatus =
        nextStatus === StatusOrdemServico.CONCLUIDO ||
        nextStatus === StatusOrdemServico.AGUARDANDO ||
        nextStatus === StatusOrdemServico.EM_ANDAMENTO;

      if (!allowedStatus || changedFields.responsavel) {
        throw new ConflictException(ORDER_UPDATE_INVALID_FOR_STATE_ERROR);
      }

      return;
    }

    const isReopening =
      nextStatus === StatusOrdemServico.AGUARDANDO ||
      nextStatus === StatusOrdemServico.EM_ANDAMENTO;
    const changesOnlyStatus =
      changedFields.status &&
      !changedFields.descricao &&
      !changedFields.valor &&
      !changedFields.observacoes &&
      !changedFields.visibilidade &&
      !changedFields.responsavel;

    if (!isReopening || !changesOnlyStatus) {
      throw new ConflictException(ORDER_UPDATE_INVALID_FOR_STATE_ERROR);
    }
  }

  private async validateActiveResponsible(
    transaction: Prisma.TransactionClient,
    responsibleId: string,
  ): Promise<void> {
    const responsible = await transaction.funcionario.findUnique({
      where: { id: responsibleId },
      select: { ativo: true },
    });

    if (!responsible) {
      throw new NotFoundException(ORDER_RESPONSIBLE_NOT_FOUND_ERROR);
    }

    if (!responsible.ativo) {
      throw new ConflictException(ORDER_RESPONSIBLE_INACTIVE_ERROR);
    }
  }

  private resolveTransitionDates(
    current: OrderDetailRecord,
    nextStatus: StatusOrdemServico,
  ): Pick<OrderDetailRecord, 'concluidoEm' | 'canceladoEm'> {
    if (nextStatus === current.status) {
      return {
        concluidoEm: current.concluidoEm,
        canceladoEm: current.canceladoEm,
      };
    }

    if (nextStatus === StatusOrdemServico.CONCLUIDO) {
      return { concluidoEm: new Date(), canceladoEm: null };
    }

    if (nextStatus === StatusOrdemServico.CANCELADO) {
      return { concluidoEm: null, canceladoEm: new Date() };
    }

    return { concluidoEm: null, canceladoEm: null };
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

  private isHistoryVersionUniqueConstraintError(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const metadata = JSON.stringify(error.meta ?? {});

    return (
      /HistoricoOrdemServico|historico_ordem_servico/.test(metadata) &&
      /ordemServicoId|ordem_servico_id/.test(metadata) &&
      /versao/.test(metadata)
    );
  }

  private async hasPersistedVersionChanged(
    id: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const order = await this.database.ordemServico.findUnique({
      where: { id },
      select: { versao: true },
    });

    return order !== null && order.versao !== expectedVersion;
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
