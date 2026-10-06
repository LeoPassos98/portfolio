import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { DemoCleanupOpportunisticService } from '../demo-cleanup/demo-cleanup-opportunistic.service.js';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { AuthSessionResponse } from './auth-session-response.dto.js';
import { createCsrfToken } from './csrf-token.js';
import { CsrfTokenResponse } from './csrf-token-response.dto.js';
import {
  firstAccessPasswordSchema,
  type FirstAccessPasswordInput,
} from './first-access-password.schema.js';
import { loginSchema, type LoginInput } from './auth-login.schema.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './guards/session.guard.js';

const INVALID_CREDENTIALS_ERROR = {
  code: 'AUTH_INVALID_CREDENTIALS',
  message: 'Invalid email or password',
} as const;

const FIRST_ACCESS_PASSWORD_NOT_REQUIRED_ERROR = {
  code: 'AUTH_FIRST_ACCESS_PASSWORD_NOT_REQUIRED',
  message: 'First access password change is not required',
} as const;

const CSRF_HEADER = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Token CSRF retornado por GET /auth/csrf para a sessão atual.',
} as const;

const CSRF_INVALID_TOKEN_RESPONSE = {
  description: 'Token CSRF ausente ou inválido (CSRF_INVALID_TOKEN).',
  schema: getHttpErrorResponseSchemaReference(),
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

function clearSessionCookie(
  response: Response,
  sessionCookie: Request['session']['cookie'],
): void {
  response.clearCookie('connect.sid', {
    httpOnly: sessionCookie.httpOnly,
    path: sessionCookie.path ?? '/',
    sameSite: sessionCookie.sameSite,
    secure: sessionCookie.secure === true,
  });
}

@Controller('auth')
@ApiTags('Autenticação')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly opportunisticCleanup: DemoCleanupOpportunisticService,
  ) {}

  @Get('csrf')
  @ApiOperation({ summary: 'Obtém o token CSRF da sessão atual' })
  @ApiOkResponse({ type: CsrfTokenResponse })
  async getCsrfToken(@Req() request: Request): Promise<CsrfTokenResponse> {
    if (!request.session.csrfToken) {
      request.session.csrfToken = createCsrfToken();
      await saveSession(request);
    }

    return { csrfToken: request.session.csrfToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(CSRF_HEADER)
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
    description:
      'Credenciais inválidas, conta inativa, DEMO expirada (DEMO_EXPIRED) ou janela de ativação encerrada (DEMO_ACTIVATION_EXPIRED).',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiForbiddenResponse(CSRF_INVALID_TOKEN_RESPONSE)
  @ApiConflictResponse({
    description: 'DEMO com provisionamento já em andamento ou estado inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Capacidade ativa da origem DEMO atingida.',
    headers: {
      'Retry-After': {
        description: 'Segundos até liberar capacidade.',
        schema: { type: 'integer', minimum: 1 },
      },
    },
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Capacidade global atingida ou provisionamento DEMO falhou.',
    headers: {
      'Retry-After': {
        description: 'Presente quando a capacidade global está esgotada.',
        schema: { type: 'integer', minimum: 1 },
      },
    },
    schema: getHttpErrorResponseSchemaReference(),
  })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const authentication = await this.authenticateLogin(input, response);

    if (!authentication) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_ERROR);
    }
    const { usuario, demoProvisionedNow } = authentication;

    await regenerateSession(request);
    request.session.usuarioId = usuario.id;
    await saveSession(request);

    const body = this.authService.toSessionResponse(
      this.authService.toAuthenticatedUser(usuario),
    );
    if (demoProvisionedNow) {
      // Register before returning, but schedule only after a successful response.
      response.once('finish', () => {
        if (response.statusCode === HttpStatus.OK) {
          this.opportunisticCleanup.requestCleanup();
        }
      });
    }
    return body;
  }

  @Post('first-access/password')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({
    summary: 'Troca a senha temporária obrigatória do primeiro acesso',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password', 'passwordConfirmation'],
      properties: {
        password: {
          type: 'string',
          format: 'password',
          minLength: 8,
          maxLength: 128,
        },
        passwordConfirmation: {
          type: 'string',
          format: 'password',
          minLength: 8,
          maxLength: 128,
        },
      },
    },
  })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiBadRequestResponse({
    description: 'Senha inválida ou confirmação diferente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse({
    description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiConflictResponse({
    description: 'A conta não possui troca obrigatória de senha pendente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiForbiddenResponse(CSRF_INVALID_TOKEN_RESPONSE)
  async changeFirstAccessPassword(
    @Body(new ZodValidationPipe(firstAccessPasswordSchema))
    input: FirstAccessPasswordInput,
    @Req() request: Request,
  ): Promise<AuthSessionResponse> {
    const usuario = request.authenticatedUser!;

    if (!usuario.deveAlterarSenha) {
      throw new ConflictException(FIRST_ACCESS_PASSWORD_NOT_REQUIRED_ERROR);
    }

    const usuarioAtualizado = await this.authService.changeFirstAccessPassword(
      usuario.id,
      usuario.environmentId,
      input.password,
    );

    await regenerateSession(request);
    request.session.usuarioId = usuarioAtualizado.id;
    await saveSession(request);

    return this.authService.toSessionResponse(
      this.authService.toAuthenticatedUser(usuarioAtualizado),
    );
  }

  @Get('session')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Consulta o usuário da sessão atual' })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({
    description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  async getSession(@Req() request: Request): Promise<AuthSessionResponse> {
    return this.authService.toSessionResponse(request.authenticatedUser!);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Encerra a sessão atual no servidor' })
  @ApiNoContentResponse({ description: 'Sessão encerrada.' })
  @ApiForbiddenResponse(CSRF_INVALID_TOKEN_RESPONSE)
  async logout(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const sessionCookie = request.session.cookie;

    try {
      await destroySession(request);
    } finally {
      clearSessionCookie(response, sessionCookie);
    }

    response.status(HttpStatus.NO_CONTENT).send();
  }

  private async authenticateLogin(input: LoginInput, response: Response) {
    try {
      return await this.authService.authenticate(input.email, input.password);
    } catch (error) {
      if (error instanceof HttpException) {
        const body = error.getResponse() as {
          details?: { retryAfterSeconds?: number };
        };
        if (body.details?.retryAfterSeconds) {
          response.setHeader(
            'Retry-After',
            String(body.details.retryAfterSeconds),
          );
        }
      }
      throw error;
    }
  }
}
