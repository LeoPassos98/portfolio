import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { FirstAccessCompletedGuard } from '../auth/guards/first-access-completed.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { clientIdSchema, type ClientIdInput } from './client-id.schema.js';
import {
  clientListQuerySchema,
  type ClientListQuery,
} from './client-list-query.schema.js';
import { ClientDetailResponse } from './client-detail-response.dto.js';
import { ClientListItemResponse } from './client-list-item-response.dto.js';
import { ClientsService } from './clients.service.js';

const badRequestResponse = {
  description: 'Parâmetros de consulta ou identificador inválidos.',
  schema: getHttpErrorResponseSchemaReference(),
};

const unauthorizedResponse = {
  description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
  schema: getHttpErrorResponseSchemaReference(),
};

const passwordChangeRequiredResponse = {
  description: 'A troca obrigatória de senha ainda não foi concluída.',
  schema: getHttpErrorResponseSchemaReference(),
};

@Controller('clients')
@ApiTags('Clientes')
@UseGuards(SessionGuard, FirstAccessCompletedGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista clientes consultáveis' })
  @ApiQuery({
    name: 'status',
    enum: ['active', 'inactive', 'all'],
    required: false,
    description: 'Situação dos clientes. O padrão é active.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca por nome ou CPF/CNPJ.',
  })
  @ApiOkResponse({ type: ClientListItemResponse, isArray: true })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(passwordChangeRequiredResponse)
  findAll(
    @Query(new ZodValidationPipe(clientListQuerySchema)) query: ClientListQuery,
  ): Promise<ClientListItemResponse[]> {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta os detalhes de um cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ClientDetailResponse })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(passwordChangeRequiredResponse)
  @ApiNotFoundResponse({
    description: 'Cliente não encontrado.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  findOne(
    @Param(new ZodValidationPipe(clientIdSchema)) { id }: ClientIdInput,
  ): Promise<ClientDetailResponse> {
    return this.clientsService.findOne(id);
  }
}
