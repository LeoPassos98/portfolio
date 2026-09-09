import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { FirstAccessCompletedGuard } from '../auth/guards/first-access-completed.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Perfil } from '../generated/prisma/client.js';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import {
  dashboardSituationQuerySchema,
  type DashboardSituationQuery,
} from './dashboard-situation-query.schema.js';
import {
  AdministratorDashboardSituationResponse,
  EmployeeDashboardSituationResponse,
  type DashboardSituationResponse,
} from './dashboard-situation-response.dto.js';
import { DashboardService } from './dashboard.service.js';

const errorResponseSchema = getHttpErrorResponseSchemaReference();

@Controller('dashboard')
@ApiTags('Dashboard')
@ApiExtraModels(
  AdministratorDashboardSituationResponse,
  EmployeeDashboardSituationResponse,
)
@UseGuards(SessionGuard, FirstAccessCompletedGuard, RoleGuard)
@Roles(Perfil.ADMINISTRADOR, Perfil.FUNCIONARIO)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('situation')
  @ApiOperation({
    summary: 'Consulta os indicadores atuais do Dashboard no escopo permitido',
  })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    schema: { type: 'string', format: 'uuid' },
    description:
      'Administrador consulta o funcionário indicado. Funcionário aceita somente o próprio identificador.',
  })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AdministratorDashboardSituationResponse) },
        { $ref: getSchemaPath(EmployeeDashboardSituationResponse) },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Query inválida, inclusive UUID inválido (VALIDATION_ERROR).',
    schema: errorResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
    schema: errorResponseSchema,
  })
  @ApiForbiddenResponse({
    description:
      'Primeiro acesso pendente ou Funcionário tentando consultar terceiro (DASHBOARD_SCOPE_FORBIDDEN).',
    schema: errorResponseSchema,
  })
  @ApiNotFoundResponse({
    description:
      'Funcionário solicitado por Administrador não existe (EMPLOYEE_NOT_FOUND).',
    schema: errorResponseSchema,
  })
  getSituation(
    @Req() request: Request,
    @Query(new ZodValidationPipe(dashboardSituationQuerySchema))
    query: DashboardSituationQuery,
  ): Promise<DashboardSituationResponse> {
    return this.dashboardService.getSituation(
      request.authenticatedUser!,
      query,
    );
  }
}
