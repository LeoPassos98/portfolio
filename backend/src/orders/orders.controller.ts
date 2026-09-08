import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
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
import { orderIdSchema, type OrderIdInput } from './order-id.schema.js';
import { OrderListItemResponse } from './order-list-item-response.dto.js';
import {
  orderListQuerySchema,
  type OrderListQuery,
} from './order-list-query.schema.js';
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

@Controller('orders')
@ApiTags('Ordens de Serviço')
@UseGuards(SessionGuard, FirstAccessCompletedGuard, RoleGuard)
@Roles(Perfil.ADMINISTRADOR, Perfil.FUNCIONARIO)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
