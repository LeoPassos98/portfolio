import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordService } from '../auth/password/password.service.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';
import { UNAUTHENTICATED_ERROR } from '../auth/auth-errors.js';
import { DatabaseService } from '../database/database.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { ProfilePasswordUpdateInput } from './profile-password-update.schema.js';
import type { ProfileUpdateInput } from './profile-update.schema.js';
import type { ProfileResponse } from './profile-response.dto.js';

export const PROFILE_CURRENT_PASSWORD_INCORRECT_ERROR = {
  code: 'PROFILE_CURRENT_PASSWORD_INCORRECT',
  message: 'Current password is incorrect',
} as const;

const profileSelect = {
  nome: true,
  telefone: true,
  email: true,
  ativo: true,
  usuario: {
    select: {
      ativo: true,
      perfil: true,
    },
  },
} satisfies Prisma.FuncionarioSelect;

type ProfileEmployee = Prisma.FuncionarioGetPayload<{
  select: typeof profileSelect;
}>;

@Injectable()
export class ProfileService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwordService: PasswordService,
    private readonly sessionStoreService: SessionStoreService,
  ) {}

  async getProfile(
    environmentId: string,
    funcionarioId: string,
  ): Promise<ProfileResponse> {
    const employee = await this.database.funcionario.findUniqueOrThrow({
      where: {
        environmentId_id: { environmentId, id: funcionarioId },
      },
      select: profileSelect,
    });

    return this.toProfileResponse(employee);
  }

  async updateProfile(
    environmentId: string,
    funcionarioId: string,
    input: ProfileUpdateInput,
  ): Promise<ProfileResponse> {
    const employee = await this.database.funcionario.update({
      where: {
        environmentId_id: { environmentId, id: funcionarioId },
      },
      data: input,
      select: profileSelect,
    });

    return this.toProfileResponse(employee);
  }

  async changePassword(
    environmentId: string,
    usuarioId: string,
    input: ProfilePasswordUpdateInput,
  ): Promise<void> {
    const account = await this.database.usuario.findUnique({
      where: { environmentId_id: { environmentId, id: usuarioId } },
      select: { senhaHash: true },
    });

    if (!account) {
      throw new UnauthorizedException(UNAUTHENTICATED_ERROR);
    }

    const currentPasswordMatches = await this.passwordService.verify(
      account.senhaHash,
      input.currentPassword,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException(PROFILE_CURRENT_PASSWORD_INCORRECT_ERROR);
    }

    const senhaHash = await this.passwordService.hash(input.newPassword);

    await this.database.usuario.update({
      where: { environmentId_id: { environmentId, id: usuarioId } },
      data: { senhaHash },
    });
    await this.sessionStoreService.revokeUserSessions(usuarioId);
  }

  private toProfileResponse(employee: ProfileEmployee): ProfileResponse {
    return {
      nome: employee.nome,
      telefone: employee.telefone,
      email: employee.email,
      perfil: employee.usuario!.perfil,
      funcionarioAtivo: employee.ativo,
      contaAtiva: employee.usuario!.ativo,
    };
  }
}
