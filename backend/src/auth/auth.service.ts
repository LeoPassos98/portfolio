import { Injectable } from '@nestjs/common';
import { PasswordService } from './password/password.service.js';
import { DatabaseService } from '../database/database.service.js';
import { AuthSessionResponse } from './auth-session-response.dto.js';
import type { AuthenticatedUser } from './authenticated-user.interface.js';

type UserWithFuncionario = {
  id: string;
  perfil: AuthSessionResponse['perfil'];
  funcionarioId: string;
  deveAlterarSenha: boolean;
  funcionario: { nome: string } | null;
};

type CurrentAuthenticatedUser = UserWithFuncionario & {
  ativo: boolean;
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
      include: { funcionario: true },
    });

    if (!usuario || !usuario.ativo) {
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
        perfil: true,
        funcionarioId: true,
        ativo: true,
        deveAlterarSenha: true,
        funcionario: { select: { nome: true } },
      },
    });
  }

  async changeFirstAccessPassword(usuarioId: string, password: string) {
    const senhaHash = await this.passwordService.hash(password);

    return this.database.usuario.update({
      where: { id: usuarioId },
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
      perfil: usuario.perfil,
      funcionarioId: usuario.funcionarioId,
      ...(usuario.funcionario
        ? { funcionarioNome: usuario.funcionario.nome }
        : {}),
      deveAlterarSenha: usuario.deveAlterarSenha,
    };
  }

  toSessionResponse(usuario: AuthenticatedUser): AuthSessionResponse {
    return usuario;
  }
}
