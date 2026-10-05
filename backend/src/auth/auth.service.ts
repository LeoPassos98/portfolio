import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  DEMO_EXPIRED_ERROR,
  DemoProvisioningService,
} from '../demo/demo-provisioning.service.js';
import { PasswordService } from './password/password.service.js';
import { DatabaseService } from '../database/database.service.js';
import { AuthSessionResponse } from './auth-session-response.dto.js';
import type { AuthenticatedUser } from './authenticated-user.interface.js';
import { DemoStatus, TipoEnvironment } from '../generated/prisma/client.js';
import { readDemoEnvironmentTime } from '../demo/demo-environment-time.js';

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
    private readonly demoProvisioning: DemoProvisioningService,
  ) {}

  async authenticate(email: string, password: string) {
    const usuario = await this.database.usuario.findUnique({
      where: { emailLogin: email },
      include: { funcionario: true, environment: true },
    });

    if (!usuario || !this.isCredentialCandidateValid(usuario)) {
      return null;
    }

    if (
      usuario.environment.tipo === TipoEnvironment.PRINCIPAL &&
      !this.isAuthenticationContextValid(usuario)
    )
      return null;

    const passwordMatches = await this.passwordService.verify(
      usuario.senhaHash,
      password,
    );

    if (!passwordMatches) {
      return null;
    }

    if (usuario.environment.tipo === TipoEnvironment.PRINCIPAL) return usuario;

    Object.assign(
      usuario.environment,
      await readDemoEnvironmentTime(this.database, usuario.environmentId),
    );

    if (
      !usuario.environment.expiresAt ||
      usuario.environment.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException(DEMO_EXPIRED_ERROR);
    }
    if (usuario.environment.demoStatus !== DemoStatus.PRONTA) {
      await this.demoProvisioning.ensureReady(
        usuario.environmentId,
        usuario.environment.originIpHash!,
        usuario.id,
      );
    }
    const current = await this.getAuthenticatedUser(usuario.id);
    if (!current || !this.isAuthenticationContextValid(current)) return null;
    return current;
  }

  async getAuthenticatedUser(
    usuarioId: string,
  ): Promise<CurrentAuthenticatedUser | null> {
    const usuario = await this.database.usuario.findUnique({
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
    if (usuario?.environment.tipo === TipoEnvironment.DEMO) {
      const time = await readDemoEnvironmentTime(
        this.database,
        usuario.environmentId,
      );
      usuario.environment.expiresAt = time?.expiresAt ?? null;
    }
    return usuario;
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
    if (!this.isCredentialCandidateValid(usuario)) return false;

    if (usuario.environment.tipo === TipoEnvironment.PRINCIPAL) {
      return usuario.environment.expiresAt === null;
    }

    return (
      usuario.environment.demoStatus === DemoStatus.PRONTA &&
      usuario.environment.expiresAt !== null &&
      usuario.environment.expiresAt.getTime() > Date.now()
    );
  }

  private isCredentialCandidateValid(
    usuario: CurrentAuthenticatedUser,
  ): boolean {
    if (
      !usuario.ativo ||
      !usuario.funcionario ||
      usuario.funcionario.environmentId !== usuario.environmentId
    ) {
      return false;
    }

    return true;
  }
}
