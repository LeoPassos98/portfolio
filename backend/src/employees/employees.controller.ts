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
import { Perfil } from '../generated/prisma/client.js';
import { FirstAccessCompletedGuard } from '../auth/guards/first-access-completed.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { EmployeeDetailResponse } from './employee-detail-response.dto.js';
import { employeeIdSchema, type EmployeeIdInput } from './employee-id.schema.js';
import {
  employeeListQuerySchema,
  type EmployeeListQuery,
} from './employee-list-query.schema.js';
import { EmployeeListItemResponse } from './employee-list-item-response.dto.js';
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

@Controller('employees')
@ApiTags('Funcionários')
@UseGuards(SessionGuard, FirstAccessCompletedGuard, RoleGuard)
@Roles(Perfil.ADMINISTRADOR)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

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
