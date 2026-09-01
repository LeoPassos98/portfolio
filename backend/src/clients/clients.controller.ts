import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
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
import { FirstAccessCompletedGuard } from '../auth/guards/first-access-completed.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import {
  clientCreateSchema,
  type ClientCreateInput,
} from './client-create.schema.js';
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

const csrfHeader = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Token CSRF retornado por GET /auth/csrf para a sessão atual.',
} as const;

@Controller('clients')
@ApiTags('Clientes')
@UseGuards(SessionGuard, FirstAccessCompletedGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Cria um cliente' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'nome',
        'telefone',
        'cep',
        'logradouro',
        'numero',
        'bairro',
        'cidade',
        'uf',
      ],
      properties: {
        nome: { type: 'string', minLength: 2, maxLength: 120 },
        telefone: { type: 'string', example: '+55 (11) 99999-9999' },
        documento: { type: 'string', example: '529.982.247-25' },
        email: { type: 'string', format: 'email' },
        cep: { type: 'string', example: '01001-000' },
        logradouro: { type: 'string', example: 'Praça da Sé' },
        numero: { type: 'string', example: '100' },
        complemento: { type: 'string', example: 'Sala 10' },
        bairro: { type: 'string', example: 'Sé' },
        cidade: { type: 'string', example: 'São Paulo' },
        uf: { type: 'string', minLength: 2, maxLength: 2, example: 'SP' },
      },
    },
  })
  @ApiCreatedResponse({ type: ClientDetailResponse })
  @ApiBadRequestResponse({
    description: 'Corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, ou troca obrigatória de senha pendente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'CPF/CNPJ já pertence a outro cliente (CLIENT_DOCUMENT_ALREADY_EXISTS).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  create(
    @Body(new ZodValidationPipe(clientCreateSchema)) input: ClientCreateInput,
  ): Promise<ClientDetailResponse> {
    return this.clientsService.create(input);
  }

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
