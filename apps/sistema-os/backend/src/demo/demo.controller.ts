import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { DemoAccessResponse } from './demo-access-response.dto.js';
import {
  DemoAccessService,
  type DemoAccessBlockedResult,
} from './demo-access.service.js';
import {
  demoAccessSchema,
  type DemoAccessInput,
} from './demo-access.schema.js';

const retryAfterHeader = {
  description: 'Segundos até uma nova tentativa poder ser admitida.',
  schema: { type: 'integer', minimum: 1 },
};

@Controller('demo')
@ApiTags('Demonstração')
export class DemoController {
  constructor(private readonly demoAccess: DemoAccessService) {}

  @Post('access')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Token retornado por GET /auth/csrf para a sessão anônima.',
  })
  @ApiOperation({ summary: 'Gera credenciais e o shell inicial de uma DEMO' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['dataMode', 'tutorialEnabled'],
      properties: {
        dataMode: { type: 'string', enum: ['EXEMPLO', 'VAZIO'] },
        tutorialEnabled: { type: 'boolean' },
      },
    },
  })
  @ApiCreatedResponse({ type: DemoAccessResponse })
  @ApiBadRequestResponse({
    description: 'Entrada inválida.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiForbiddenResponse({
    description: 'Token CSRF ausente ou inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Limite por origem, pendência ou geração atingido.',
    headers: { 'Retry-After': retryAfterHeader },
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Capacidade global de DEMOs atingida.',
    headers: { 'Retry-After': retryAfterHeader },
    schema: getHttpErrorResponseSchemaReference(),
  })
  async createAccess(
    @Body(new ZodValidationPipe(demoAccessSchema)) input: DemoAccessInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<DemoAccessResponse> {
    const result = await this.demoAccess.create(input, request.ip ?? '');

    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.retryAfterSeconds));
      this.throwBlocked(result);
    }

    const { allowed: _allowed, ...publicResponse } = result;

    return publicResponse;
  }

  private throwBlocked(result: DemoAccessBlockedResult): never {
    const details = {
      current: result.current,
      limit: result.limit,
      ...('windowSeconds' in result
        ? { windowSeconds: result.windowSeconds }
        : {}),
      retryAfterSeconds: result.retryAfterSeconds,
    };

    switch (result.reason) {
      case 'pending-limit':
        throw new HttpException(
          {
            code: 'DEMO_PENDING_LIMIT_REACHED',
            message: 'Pending demo access limit reached',
            details,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case 'origin-limit':
        throw new HttpException(
          {
            code: 'DEMO_ORIGIN_LIMIT_REACHED',
            message: 'Demo origin limit reached',
            details,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case 'global-capacity':
        throw new ServiceUnavailableException({
          code: 'DEMO_CAPACITY_REACHED',
          message: 'Demo capacity reached',
          details,
        });
      case 'rate-limit':
        throw new HttpException(
          {
            code: 'DEMO_GENERATION_RATE_LIMITED',
            message: 'Demo generation rate limit reached',
            details,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
    }
  }
}
