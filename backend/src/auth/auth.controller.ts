import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { AuthSessionResponse } from './auth-session-response.dto.js';
import { loginSchema, type LoginInput } from './auth-login.schema.js';
import { AuthService } from './auth.service.js';

const INVALID_CREDENTIALS_ERROR = {
  code: 'AUTH_INVALID_CREDENTIALS',
  message: 'Invalid email or password',
} as const;

const UNAUTHENTICATED_ERROR = {
  code: 'AUTH_UNAUTHENTICATED',
  message: 'Authentication required',
} as const;

function regenerateSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function saveSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function destroySession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

@Controller('auth')
@ApiTags('Autenticação')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica credenciais e inicia uma sessão' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'usuario@exemplo.com' },
        password: { type: 'string', format: 'password' },
      },
    },
  })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiBadRequestResponse({
    description: 'Entrada inválida.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciais inválidas ou conta inativa.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Req() request: Request,
  ): Promise<AuthSessionResponse> {
    const usuario = await this.authService.authenticate(
      input.email,
      input.password,
    );

    if (!usuario) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_ERROR);
    }

    await regenerateSession(request);
    request.session.usuarioId = usuario.id;
    await saveSession(request);

    return this.authService.toSessionResponse(usuario);
  }

  @Get('session')
  @ApiOperation({ summary: 'Consulta o usuário da sessão atual' })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({
    description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  async getSession(@Req() request: Request): Promise<AuthSessionResponse> {
    const usuarioId = request.session.usuarioId;

    if (!usuarioId) {
      throw new UnauthorizedException(UNAUTHENTICATED_ERROR);
    }

    const usuario = await this.authService.getAuthenticatedUser(usuarioId);

    if (!usuario || !usuario.ativo) {
      await destroySession(request);
      throw new UnauthorizedException(UNAUTHENTICATED_ERROR);
    }

    return this.authService.toSessionResponse(usuario);
  }
}
