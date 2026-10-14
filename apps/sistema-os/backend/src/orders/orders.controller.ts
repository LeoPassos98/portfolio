import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Perfil } from '../generated/prisma/client.js';
import { FirstAccessCompletedGuard } from '../auth/guards/first-access-completed.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { OrderDetailResponse } from './order-detail-response.dto.js';
import {
  orderCreateSchema,
  type OrderCreateInput,
} from './order-create.schema.js';
import { OrderHistoryItemResponse } from './order-history-item-response.dto.js';
import { orderIdSchema, type OrderIdInput } from './order-id.schema.js';
import { OrderListItemResponse } from './order-list-item-response.dto.js';
import {
  orderListQuerySchema,
  type OrderListQuery,
} from './order-list-query.schema.js';
import { OrderResponsibleResponse } from './order-responsible-response.dto.js';
import {
  orderUpdateSchema,
  type OrderUpdateInput,
} from './order-update.schema.js';
import { OrdersService } from './orders.service.js';

const badRequestResponse = {
  description: 'Parâmetros de consulta ou identificador inválidos.',
  schema: getHttpErrorResponseSchemaReference(),
};

const unauthorizedResponse = {
  description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
  schema: getHttpErrorResponseSchemaReference(),
};

const forbiddenResponse = {
  description: 'A troca obrigatória de senha ainda não foi concluída.',
  schema: getHttpErrorResponseSchemaReference(),
};

const csrfHeader = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Token CSRF retornado por GET /auth/csrf para a sessão atual.',
} as const;

@Controller('orders')
@ApiTags('Ordens de Serviço')
@UseGuards(SessionGuard, FirstAccessCompletedGuard, RoleGuard)
@Roles(Perfil.ADMINISTRADOR, Perfil.FUNCIONARIO)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Cria uma ordem de serviço' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['clienteId', 'descricao', 'valor'],
      properties: {
        clienteId: { type: 'string', format: 'uuid' },
        responsavelId: {
          type: 'string',
          format: 'uuid',
          description:
            'Obrigatório para Administrador e ignorado para Funcionário.',
        },
        descricao: { type: 'string', minLength: 3, maxLength: 2000 },
        valor: {
          type: 'string',
          pattern: '^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$',
          example: '1250.99',
        },
        observacoes: { type: 'string', maxLength: 4000 },
        visibilidade: {
          type: 'string',
          enum: ['PRIVADA', 'PUBLICA'],
          default: 'PRIVADA',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: OrderDetailResponse })
  @ApiBadRequestResponse({
    description:
      'Body inválido (VALIDATION_ERROR) ou responsável não informado por Administrador (ORDER_RESPONSIBLE_REQUIRED).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, ou troca obrigatória de senha pendente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description:
      'Cliente inexistente (ORDER_CLIENT_NOT_FOUND) ou responsável inexistente (ORDER_RESPONSIBLE_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'Cliente inativo (ORDER_CLIENT_INACTIVE) ou responsável inativo (ORDER_RESPONSIBLE_INACTIVE).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  create(
    @Req() request: Request,
    @Body(new ZodValidationPipe(orderCreateSchema)) input: OrderCreateInput,
  ): Promise<OrderDetailResponse> {
    return this.ordersService.create(request.authenticatedUser!, input);
  }

  @Put(':id')
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Atualiza atomicamente uma ordem de serviço' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['versao', 'descricao', 'valor', 'status', 'visibilidade'],
      properties: {
        versao: { type: 'integer', minimum: 1 },
        descricao: { type: 'string', minLength: 3, maxLength: 2000 },
        valor: {
          type: 'string',
          pattern: '^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$',
          example: '1250.99',
        },
        observacoes: { type: 'string', maxLength: 4000 },
        status: {
          type: 'string',
          enum: ['AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'],
        },
        visibilidade: {
          type: 'string',
          enum: ['PRIVADA', 'PUBLICA'],
        },
        responsavelId: {
          type: 'string',
          format: 'uuid',
          description:
            'Opcional. Quando omitido, preserva o responsável atual.',
        },
      },
    },
  })
  @ApiOkResponse({ type: OrderDetailResponse })
  @ApiBadRequestResponse({
    description: 'Identificador ou body inválido (VALIDATION_ERROR).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF inválido, primeiro acesso pendente, OS pública de terceiro (ORDER_UPDATE_FORBIDDEN) ou tentativa de transferência por Funcionário (ORDER_RESPONSIBLE_CHANGE_FORBIDDEN).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description:
      'OS inexistente/privada sem acesso (ORDER_NOT_FOUND) ou novo responsável inexistente (ORDER_RESPONSIBLE_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'Versão desatualizada (ORDER_VERSION_CONFLICT), estado/transição inválidos (ORDER_UPDATE_INVALID_FOR_STATE) ou novo responsável inativo (ORDER_RESPONSIBLE_INACTIVE).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  update(
    @Req() request: Request,
    @Param(new ZodValidationPipe(orderIdSchema)) { id }: OrderIdInput,
    @Body(new ZodValidationPipe(orderUpdateSchema)) input: OrderUpdateInput,
  ): Promise<OrderDetailResponse> {
    return this.ordersService.update(request.authenticatedUser!, id, input);
  }

  @Get()
  @ApiOperation({ summary: 'Lista ordens de serviço acessíveis' })
  @ApiQuery({
    name: 'status',
    enum: ['all', 'open', 'awaiting', 'in-progress', 'completed', 'cancelled'],
    required: false,
    description: 'Situação da OS. O padrão é all.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca por número da OS ou nome do Cliente.',
  })
  @ApiQuery({
    name: 'responsibleId',
    required: false,
    schema: { type: 'string', format: 'uuid' },
    description: 'Restringe a lista ao responsável informado.',
  })
  @ApiQuery({
    name: 'createdFrom',
    required: false,
    schema: { type: 'string', format: 'date-time' },
    description: 'Início inclusivo do período: criadoEm >= createdFrom.',
  })
  @ApiQuery({
    name: 'createdBefore',
    required: false,
    schema: { type: 'string', format: 'date-time' },
    description: 'Fim exclusivo do período: criadoEm < createdBefore.',
  })
  @ApiOkResponse({ type: OrderListItemResponse, isArray: true })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(forbiddenResponse)
  findAll(
    @Req() request: Request,
    @Query(new ZodValidationPipe(orderListQuerySchema)) query: OrderListQuery,
  ): Promise<OrderListItemResponse[]> {
    return this.ordersService.findAll(request.authenticatedUser!, query);
  }

  @Get('responsibles')
  @ApiOperation({
    summary: 'Lista responsáveis das ordens de serviço acessíveis',
  })
  @ApiOkResponse({ type: OrderResponsibleResponse, isArray: true })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(forbiddenResponse)
  findResponsibles(
    @Req() request: Request,
  ): Promise<OrderResponsibleResponse[]> {
    return this.ordersService.findResponsibles(request.authenticatedUser!);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Consulta o histórico de uma ordem de serviço acessível',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderHistoryItemResponse, isArray: true })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(forbiddenResponse)
  @ApiNotFoundResponse({
    description: 'Ordem de serviço não encontrada ou não acessível.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  findHistory(
    @Req() request: Request,
    @Param(new ZodValidationPipe(orderIdSchema)) { id }: OrderIdInput,
  ): Promise<OrderHistoryItemResponse[]> {
    return this.ordersService.findHistory(request.authenticatedUser!, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma ordem de serviço acessível' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderDetailResponse })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(forbiddenResponse)
  @ApiNotFoundResponse({
    description: 'Ordem de serviço não encontrada ou não acessível.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  findOne(
    @Req() request: Request,
    @Param(new ZodValidationPipe(orderIdSchema)) { id }: OrderIdInput,
  ): Promise<OrderDetailResponse> {
    return this.ordersService.findOne(request.authenticatedUser!, id);
  }
}
