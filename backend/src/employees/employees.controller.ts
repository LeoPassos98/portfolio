import {
  Body,
  Controller,
  Get,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
  employeeAccessCreateSchema,
  type EmployeeAccessCreateInput,
} from './employee-access-create.schema.js';
import {
  employeeAccessProfileUpdateSchema,
  type EmployeeAccessProfileUpdateInput,
} from './employee-access-profile-update.schema.js';
import {
  employeeAccessLoginEmailUpdateSchema,
  type EmployeeAccessLoginEmailUpdateInput,
} from './employee-access-login-email-update.schema.js';
import {
  employeeAccessStatusUpdateSchema,
  type EmployeeAccessStatusUpdateInput,
} from './employee-access-status-update.schema.js';
import {
  employeeCreateSchema,
  type EmployeeCreateInput,
} from './employee-create.schema.js';
import { EmployeeDetailResponse } from './employee-detail-response.dto.js';
import {
  employeeIdSchema,
  type EmployeeIdInput,
} from './employee-id.schema.js';
import {
  employeeListQuerySchema,
  type EmployeeListQuery,
} from './employee-list-query.schema.js';
import { EmployeeListItemResponse } from './employee-list-item-response.dto.js';
import {
  employeeUpdateSchema,
  type EmployeeUpdateInput,
} from './employee-update.schema.js';
import {
  employeeStatusUpdateSchema,
  type EmployeeStatusUpdateInput,
} from './employee-status-update.schema.js';
import { EmployeesService } from './employees.service.js';

const badRequestResponse = {
  description: 'Parâmetros de consulta ou identificador inválidos.',
  schema: getHttpErrorResponseSchemaReference(),
};

const unauthorizedResponse = {
  description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
  schema: getHttpErrorResponseSchemaReference(),
};

const forbiddenResponse = {
  description:
    'A troca obrigatória de senha está pendente ou a conta não tem perfil de Administrador.',
  schema: getHttpErrorResponseSchemaReference(),
};

const csrfHeader = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Token CSRF retornado por GET /auth/csrf para a sessão atual.',
} as const;

@Controller('employees')
@ApiTags('Funcionários')
@UseGuards(SessionGuard, FirstAccessCompletedGuard, RoleGuard)
@Roles(Perfil.ADMINISTRADOR)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Cria um funcionário sem conta de acesso' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'telefone', 'email', 'status'],
      properties: {
        nome: { type: 'string', minLength: 2, maxLength: 120 },
        telefone: { type: 'string', example: '+55 (11) 99999-9999' },
        email: {
          type: 'string',
          format: 'email',
          example: 'maria@example.com',
        },
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    },
  })
  @ApiCreatedResponse({
    type: EmployeeDetailResponse,
    description: 'Funcionário criado sem conta de acesso (conta: null).',
  })
  @ApiBadRequestResponse({
    description: 'Corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, troca obrigatória de senha pendente ou conta sem perfil de Administrador.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  create(
    @Body(new ZodValidationPipe(employeeCreateSchema))
    input: EmployeeCreateInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.create(input);
  }

  @Post(':id/account')
  @ApiHeader(csrfHeader)
  @ApiOperation({
    summary: 'Cria a conta de acesso de um funcionário sem conta',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['loginEmail', 'profile', 'initialPassword', 'confirmPassword'],
      properties: {
        loginEmail: {
          type: 'string',
          format: 'email',
          example: 'maria@login.example.com',
        },
        profile: {
          type: 'string',
          enum: ['administrator', 'employee'],
        },
        initialPassword: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          format: 'password',
        },
        confirmPassword: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          format: 'password',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: EmployeeDetailResponse,
    description:
      'Conta criada com a mesma situação do Funcionário e troca obrigatória de senha pendente, sem expor credenciais.',
  })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, troca obrigatória de senha pendente ou conta sem perfil de Administrador.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description: 'Funcionário não encontrado (EMPLOYEE_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'Funcionário já possui conta (EMPLOYEE_ACCESS_ALREADY_EXISTS) ou e-mail de login já existe (LOGIN_EMAIL_ALREADY_EXISTS).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  createAccess(
    @Param(new ZodValidationPipe(employeeIdSchema)) { id }: EmployeeIdInput,
    @Body(new ZodValidationPipe(employeeAccessCreateSchema))
    input: EmployeeAccessCreateInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.createAccess(id, input);
  }

  @Patch(':id/account/status')
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Altera a situação da conta de acesso' })
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
  @ApiOkResponse({
    type: EmployeeDetailResponse,
    description:
      'Situação da conta alterada sem modificar o cadastro ou a credencial.',
  })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, troca obrigatória de senha pendente ou conta sem perfil de Administrador.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description:
      'Funcionário não encontrado (EMPLOYEE_NOT_FOUND) ou sem conta de acesso (EMPLOYEE_ACCESS_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'A ativação exige Funcionário ativo (EMPLOYEE_MUST_BE_ACTIVE_FOR_ACCOUNT_ACTIVATION) e a inativação preserva o último Administrador ativo (LAST_ACTIVE_ADMIN_REQUIRED).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  updateAccessStatus(
    @Param(new ZodValidationPipe(employeeIdSchema)) { id }: EmployeeIdInput,
    @Body(new ZodValidationPipe(employeeAccessStatusUpdateSchema))
    input: EmployeeAccessStatusUpdateInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.updateAccessStatus(id, input);
  }

  @Patch(':id/account/profile')
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Altera o perfil da conta de acesso' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['profile'],
      properties: {
        profile: {
          type: 'string',
          enum: ['administrator', 'employee'],
        },
      },
    },
  })
  @ApiOkResponse({
    type: EmployeeDetailResponse,
    description:
      'Perfil alterado sem modificar a situação, o cadastro ou as credenciais. Uma mudança real revoga todas as sessões da conta.',
  })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, troca obrigatória de senha pendente ou conta sem perfil de Administrador.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description:
      'Funcionário não encontrado (EMPLOYEE_NOT_FOUND) ou sem conta de acesso (EMPLOYEE_ACCESS_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'A despromoção preserva o último Administrador ativo (LAST_ACTIVE_ADMIN_REQUIRED).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  updateAccessProfile(
    @Param(new ZodValidationPipe(employeeIdSchema)) { id }: EmployeeIdInput,
    @Body(new ZodValidationPipe(employeeAccessProfileUpdateSchema))
    input: EmployeeAccessProfileUpdateInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.updateAccessProfile(id, input);
  }

  @Patch(':id/account/login-email')
  @ApiHeader(csrfHeader)
  @ApiOperation({
    summary: 'Altera o e-mail de login da conta de acesso',
    description:
      'Remove espaços externos e normaliza o e-mail para minúsculas antes de validar e persistir. Uma mudança real revoga todas as sessões da conta.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['loginEmail'],
      properties: {
        loginEmail: {
          type: 'string',
          format: 'email',
          example: 'maria@login.example.com',
        },
      },
    },
  })
  @ApiOkResponse({
    type: EmployeeDetailResponse,
    description:
      'E-mail de login alterado sem modificar cadastro, situação, perfil ou credenciais. Repetir o e-mail normalizado atual é idempotente e não revoga sessões.',
  })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, troca obrigatória de senha pendente ou conta sem perfil de Administrador.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description:
      'Funcionário não encontrado (EMPLOYEE_NOT_FOUND) ou sem conta de acesso (EMPLOYEE_ACCESS_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'E-mail de login já utilizado por outra conta (LOGIN_EMAIL_ALREADY_EXISTS).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  updateAccessLoginEmail(
    @Param(new ZodValidationPipe(employeeIdSchema)) { id }: EmployeeIdInput,
    @Body(new ZodValidationPipe(employeeAccessLoginEmailUpdateSchema))
    input: EmployeeAccessLoginEmailUpdateInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.updateAccessLoginEmail(id, input);
  }

  @Put(':id')
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Atualiza os dados cadastrais de um funcionário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'telefone', 'email'],
      properties: {
        nome: { type: 'string', minLength: 2, maxLength: 120 },
        telefone: { type: 'string', example: '+55 (11) 99999-9999' },
        email: {
          type: 'string',
          format: 'email',
          example: 'maria@example.com',
        },
      },
    },
  })
  @ApiOkResponse({ type: EmployeeDetailResponse })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, troca obrigatória de senha pendente ou conta sem perfil de Administrador.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description: 'Funcionário não encontrado (EMPLOYEE_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  update(
    @Param(new ZodValidationPipe(employeeIdSchema)) { id }: EmployeeIdInput,
    @Body(new ZodValidationPipe(employeeUpdateSchema))
    input: EmployeeUpdateInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.update(id, input);
  }

  @Patch(':id/status')
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Altera a situação de um funcionário' })
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
  @ApiOkResponse({ type: EmployeeDetailResponse })
  @ApiBadRequestResponse({
    description: 'Identificador ou corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido, troca obrigatória de senha pendente ou conta sem perfil de Administrador.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiNotFoundResponse({
    description: 'Funcionário não encontrado (EMPLOYEE_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description:
      'Funcionário possui OS ativa (EMPLOYEE_HAS_ACTIVE_ORDERS) ou a conta é o último Administrador ativo (LAST_ACTIVE_ADMIN_REQUIRED).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  updateStatus(
    @Param(new ZodValidationPipe(employeeIdSchema)) { id }: EmployeeIdInput,
    @Body(new ZodValidationPipe(employeeStatusUpdateSchema))
    input: EmployeeStatusUpdateInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.updateStatus(id, input);
  }

  @Get()
  @ApiOperation({ summary: 'Lista funcionários para administração' })
  @ApiQuery({
    name: 'status',
    enum: ['active', 'inactive', 'all'],
    required: false,
    description: 'Situação dos funcionários. O padrão é active.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca por nome, telefone ou e-mail de contato.',
  })
  @ApiOkResponse({ type: EmployeeListItemResponse, isArray: true })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(forbiddenResponse)
  findAll(
    @Query(new ZodValidationPipe(employeeListQuerySchema))
    query: EmployeeListQuery,
  ): Promise<EmployeeListItemResponse[]> {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta os detalhes de um funcionário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: EmployeeDetailResponse })
  @ApiBadRequestResponse(badRequestResponse)
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse(forbiddenResponse)
  @ApiNotFoundResponse({
    description: 'Funcionário não encontrado (EMPLOYEE_NOT_FOUND).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  findOne(
    @Param(new ZodValidationPipe(employeeIdSchema)) { id }: EmployeeIdInput,
  ): Promise<EmployeeDetailResponse> {
    return this.employeesService.findOne(id);
  }
}
