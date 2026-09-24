import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { FirstAccessCompletedGuard } from '../auth/guards/first-access-completed.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { getHttpErrorResponseSchemaReference } from '../common/errors/http-error-response.openapi.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import {
  profilePasswordUpdateSchema,
  type ProfilePasswordUpdateInput,
} from './profile-password-update.schema.js';
import { ProfileResponse } from './profile-response.dto.js';
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from './profile-update.schema.js';
import { ProfileService } from './profile.service.js';

const csrfHeader = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Token CSRF retornado por GET /auth/csrf para a sessão atual.',
} as const;

const unauthorizedResponse = {
  description: 'Sessão ausente, inválida ou associada a uma conta inativa.',
  schema: getHttpErrorResponseSchemaReference(),
} as const;

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

@Controller('profile')
@ApiTags('Meu perfil')
@UseGuards(SessionGuard, FirstAccessCompletedGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Consulta o perfil do usuário autenticado' })
  @ApiOkResponse({ type: ProfileResponse })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description: 'A troca obrigatória de senha está pendente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  getProfile(@Req() request: Request): Promise<ProfileResponse> {
    return this.profileService.getProfile(
      request.authenticatedUser!.environmentId,
      request.authenticatedUser!.funcionarioId,
    );
  }

  @Put()
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: 'Atualiza nome e telefone do usuário autenticado' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'telefone'],
      properties: {
        nome: { type: 'string', minLength: 2, maxLength: 120 },
        telefone: { type: 'string', example: '+55 (11) 99999-9999' },
      },
    },
  })
  @ApiOkResponse({ type: ProfileResponse })
  @ApiBadRequestResponse({
    description: 'Corpo da requisição inválido.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido ou troca obrigatória de senha pendente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  updateProfile(
    @Body(new ZodValidationPipe(profileUpdateSchema)) input: ProfileUpdateInput,
    @Req() request: Request,
  ): Promise<ProfileResponse> {
    return this.profileService.updateProfile(
      request.authenticatedUser!.environmentId,
      request.authenticatedUser!.funcionarioId,
      input,
    );
  }

  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(csrfHeader)
  @ApiOperation({
    summary: 'Altera voluntariamente a senha do usuário autenticado',
    description:
      'Exige a senha atual e revoga todas as sessões da conta após a alteração.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['currentPassword', 'newPassword', 'newPasswordConfirmation'],
      properties: {
        currentPassword: { type: 'string', format: 'password' },
        newPassword: {
          type: 'string',
          format: 'password',
          minLength: 8,
          maxLength: 128,
        },
        newPasswordConfirmation: { type: 'string', format: 'password' },
      },
    },
  })
  @ApiNoContentResponse({
    description: 'Senha alterada e todas as sessões da conta revogadas.',
  })
  @ApiBadRequestResponse({
    description:
      'Senha atual incorreta, nova senha inválida ou confirmação diferente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  @ApiUnauthorizedResponse(unauthorizedResponse)
  @ApiForbiddenResponse({
    description:
      'Token CSRF ausente ou inválido ou troca obrigatória de senha pendente.',
    schema: getHttpErrorResponseSchemaReference(),
  })
  async changePassword(
    @Body(new ZodValidationPipe(profilePasswordUpdateSchema))
    input: ProfilePasswordUpdateInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sessionCookie = request.session.cookie;

    await this.profileService.changePassword(
      request.authenticatedUser!.environmentId,
      request.authenticatedUser!.id,
      input,
    );
    clearSessionCookie(response, sessionCookie);
  }
}
