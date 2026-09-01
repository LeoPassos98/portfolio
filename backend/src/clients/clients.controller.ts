import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Perfil } from '../generated/prisma/client.js';
import { FirstAccessCompletedGuard } from '../auth/guards/first-access-completed.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
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
import {
  clientStatusUpdateSchema,
  type ClientStatusUpdateInput,
} from './client-status-update.schema.js';
import {
  clientUpdateSchema,
  type ClientUpdateInput,
} from './client-update.schema.js';
import {
  cepParamSchema,
  type CepParamInput,
} from './cep/cep.schema.js';
import { CepLookupResponse } from './cep/cep-lookup-response.dto.js';
import { CepLookupService } from './cep/cep-lookup.service.js';
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
  constructor(
    private readonly clientsService: ClientsService,
    private readonly cepLookupService: CepLookupService,
  ) {}

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

  @Get('cep/:cep')
  @ApiOperation({ summary: 'Consulta o endereço correspondente a um CEP' })
  @ApiParam({
    name: 'cep',
    description: 'CEP com 8 dígitos, com ou sem máscara.',
    example: '01001-000',
  })
  @ApiOkResponse({ type: CepLookupResponse })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(passwordChangeRequiredResponse)
  @ApiNotFoundResponse({
    description: 'CEP não encontrado (CEP_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiServiceUnavailableResponse({
    description:
      'Fornecedor de CEP indisponível ou retornou uma resposta incompatível (CEP_PROVIDER_UNAVAILABLE).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  lookupCep(
    @Param(new ZodValidationPipe(cepParamSchema)) { cep }: CepParamInput,
  ): Promise<CepLookupResponse> {
    return this.cepLookupService.lookup(cep);
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

  @Put(':id')
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Atualiza os dados cadastrais de um cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
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
  @ApiOkResponse({ type: ClientDetailResponse })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, ou troca obrigatória de senha pendente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description: 'Cliente não encontrado.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'CPF/CNPJ já pertence a outro cliente (CLIENT_DOCUMENT_ALREADY_EXISTS).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  update(
    @Param(new ZodValidationPipe(clientIdSchema)) { id }: ClientIdInput,
    @Body(new ZodValidationPipe(clientUpdateSchema)) input: ClientUpdateInput,
  ): Promise<ClientDetailResponse> {
    return this.clientsService.update(id, input);
  }

  @Patch(':id/status')
  @UseGuards(RoleGuard)
  @Roles(Perfil.ADMINISTRADOR)
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Altera a situação de um cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    },
  })
  @ApiOkResponse({ type: ClientDetailResponse })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, primeiro acesso pendente ou perfil sem permissão.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description: 'Cliente não encontrado.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  updateStatus(
    @Param(new ZodValidationPipe(clientIdSchema)) { id }: ClientIdInput,
    @Body(new ZodValidationPipe(clientStatusUpdateSchema))
    input: ClientStatusUpdateInput,
  ): Promise<ClientDetailResponse> {
    return this.clientsService.updateStatus(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoleGuard)
  @Roles(Perfil.ADMINISTRADOR)
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Exclui definitivamente um cliente sem OS' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Cliente excluído definitivamente.' })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, primeiro acesso pendente ou perfil sem permissão.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description: 'Cliente não encontrado.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'Cliente possui OS vinculada e deve ser desativado em vez de excluído (CLIENT_HAS_ORDERS).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  async remove(
    @Param(new ZodValidationPipe(clientIdSchema)) { id }: ClientIdInput,
  ): Promise<void> {
    await this.clientsService.remove(id);
  }
}
