import { Injectable, Logger } from '@nestjs/common';
import { PasswordService } from '../auth/password/password.service.js';
import { DatabaseService } from '../database/database.service.js';
import { Perfil, type Prisma } from '../generated/prisma/client.js';
import type { AdminBootstrapInput } from './admin-bootstrap.schema.js';

export const ADMIN_BOOTSTRAP_LOCK = {
  namespace: 1_884_179_822,
  operation: 1_095_652_257,
} as const;

export class AdminBootstrapAlreadyInitializedError extends Error {
  constructor() {
    super('Bootstrap recusado: o sistema já possui usuário(s).');
    this.name = 'AdminBootstrapAlreadyInitializedError';
  }
}

export type AdminBootstrapResult = {
  funcionarioId: string;
  usuarioId: string;
  loginEmail: string;
};

@Injectable()
export class AdminBootstrapService {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly passwordService: PasswordService,
  ) {}

  createFirstAdministrator(
    input: AdminBootstrapInput,
  ): Promise<AdminBootstrapResult> {
    return this.database.$transaction(async (transaction) => {
      await this.acquireBootstrapLock(transaction);
      this.logger.log('Confirmando ausência de usuários...');

      if ((await transaction.usuario.count()) !== 0) {
        throw new AdminBootstrapAlreadyInitializedError();
      }

      this.logger.log('Criando primeiro Administrador...');
      const senhaHash = await this.passwordService.hash(input.password);
      const funcionario = await transaction.funcionario.create({
        data: {
          nome: input.nome,
          telefone: input.telefone,
          email: input.email,
          ativo: true,
        },
        select: { id: true },
      });
      const usuario = await transaction.usuario.create({
        data: {
          emailLogin: input.loginEmail,
          senhaHash,
          perfil: Perfil.ADMINISTRADOR,
          ativo: true,
          deveAlterarSenha: true,
          funcionarioId: funcionario.id,
        },
        select: { id: true, emailLogin: true },
      });

      return {
        funcionarioId: funcionario.id,
        usuarioId: usuario.id,
        loginEmail: usuario.emailLogin,
      };
    });
  }

  private async acquireBootstrapLock(
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    await transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(
        ${ADMIN_BOOTSTRAP_LOCK.namespace},
        ${ADMIN_BOOTSTRAP_LOCK.operation}
      )::text
    `;
  }
}
