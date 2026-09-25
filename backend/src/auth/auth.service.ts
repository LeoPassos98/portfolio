import { Injectable } from '@nestjs/common';
import { PasswordService } from './password/password.service.js';
import { DatabaseService } from '../database/database.service.js';
import { AuthSessionResponse } from './auth-session-response.dto.js';
import type { AuthenticatedUser } from './authenticated-user.interface.js';
import { DemoStatus, TipoEnvironment } from '../generated/prisma/client.js';

type UserWithFuncionario = {
  id: string;
  environmentId: string;
  perfil: AuthSessionResponse['perfil'];
  funcionarioId: string;
  deveAlterarSenha: boolean;
  funcionario: { nome: string; environmentId: string } | null;
};

type CurrentAuthenticatedUser = UserWithFuncionario & {
  ativo: boolean;
  environment: {
    tipo: TipoEnvironment;
    expiresAt: Date | null;
    demoStatus: DemoStatus | null;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwordService: PasswordService,
  ) {}

  async authenticate(email: string, password: string) {
    const usuario = await this.database.usuario.findUnique({
      where: { emailLogin: email },
      include: { funcionario: true, environment: true },
    });

    if (!usuario || !this.isAuthenticationContextValid(usuario)) {
      return null;
    }

    const passwordMatches = await this.passwordService.verify(
      usuario.senhaHash,
      password,
    );

    if (!passwordMatches) {
      return null;
    }

    return usuario;
  }

  async getAuthenticatedUser(
    usuarioId: string,
  ): Promise<CurrentAuthenticatedUser | null> {
    return this.database.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        environmentId: true,
        perfil: true,
        funcionarioId: true,
        ativo: true,
        deveAlterarSenha: true,
        funcionario: { select: { nome: true, environmentId: true } },
        environment: {
          select: { tipo: true, expiresAt: true, demoStatus: true },
        },
      },
    });
  }

  async changeFirstAccessPassword(
    usuarioId: string,
    environmentId: string,
    password: string,
  ) {
    const senhaHash = await this.passwordService.hash(password);

    return this.database.usuario.update({
      where: { environmentId_id: { environmentId, id: usuarioId } },
      data: {
        senhaHash,
        deveAlterarSenha: false,
      },
      include: { funcionario: true },
    });
  }

  toAuthenticatedUser(usuario: UserWithFuncionario): AuthenticatedUser {
    return {
      id: usuario.id,
      environmentId: usuario.environmentId,
      perfil: usuario.perfil,
      funcionarioId: usuario.funcionarioId,
      ...(usuario.funcionario
        ? { funcionarioNome: usuario.funcionario.nome }
        : {}),
      deveAlterarSenha: usuario.deveAlterarSenha,
    };
  }

  toSessionResponse(usuario: AuthenticatedUser): AuthSessionResponse {
    return {
      id: usuario.id,
      perfil: usuario.perfil,
      funcionarioId: usuario.funcionarioId,
      ...(usuario.funcionarioNome
        ? { funcionarioNome: usuario.funcionarioNome }
        : {}),
      deveAlterarSenha: usuario.deveAlterarSenha,
    };
  }

  isAuthenticationContextValid(usuario: CurrentAuthenticatedUser): boolean {
    if (
      !usuario.ativo ||
      !usuario.funcionario ||
      usuario.funcionario.environmentId !== usuario.environmentId
    ) {
      return false;
    }

    if (usuario.environment.tipo === TipoEnvironment.PRINCIPAL) {
      return usuario.environment.expiresAt === null;
    }

    return (
      usuario.environment.demoStatus === DemoStatus.PRONTA &&
      usuario.environment.expiresAt !== null &&
      usuario.environment.expiresAt.getTime() > Date.now()
    );
  }
}
