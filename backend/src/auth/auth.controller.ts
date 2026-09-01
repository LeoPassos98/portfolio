import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { AuthSessionResponse } from './auth-session-response.dto.js';
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

    return this.authService.toSessionResponse(
      this.authService.toAuthenticatedUser(usuario),
    );
  }

  @Post('first-access/password')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
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
  @ApiOperation({ summary: 'Encerra a sessão atual no servidor' })
  @ApiNoContentResponse({ description: 'Sessão encerrada.' })
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
}
