import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PasswordService } from '../auth/password/password.service.js';
import { DatabaseService } from '../database/database.service.js';
import {
  Perfil,
  Prisma,
  type Prisma as PrismaTypes,
} from '../generated/prisma/client.js';
import type { DemoAccessResponse } from './demo-access-response.dto.js';
import type { DemoAccessInput } from './demo-access.schema.js';
import { DemoAdmissionLockService } from './demo-admission-lock.service.js';
import {
  DemoCapacityService,
  type DemoCapacityResult,
} from './demo-capacity.service.js';
import { DemoCredentialsService } from './demo-credentials.service.js';
import {
  DemoGenerationRateLimitService,
  type DemoGenerationRateLimitResult,
} from './demo-generation-rate-limit.service.js';
import { DemoOriginService } from './demo-origin.service.js';

export const DEMO_LOGIN_GENERATION_ATTEMPTS = 5;

export type DemoAccessBlockedResult =
  | Exclude<DemoCapacityResult, { allowed: true }>
  | (Exclude<DemoGenerationRateLimitResult, { allowed: true }> & {
      reason: 'rate-limit';
    });

export type DemoAccessResult =
  ({ allowed: true } & DemoAccessResponse) | DemoAccessBlockedResult;

export class DemoLoginGenerationExhaustedError extends Error {
  constructor() {
    super('Unable to allocate a DEMO login.');
    this.name = 'DemoLoginGenerationExhaustedError';
  }
}

@Injectable()
export class DemoAccessService {
  constructor(
    private readonly database: DatabaseService,
    private readonly origin: DemoOriginService,
    private readonly capacity: DemoCapacityService,
    private readonly rateLimit: DemoGenerationRateLimitService,
    private readonly admissionLocks: DemoAdmissionLockService,
    private readonly credentials: DemoCredentialsService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(
    input: DemoAccessInput,
    requestIp: string,
  ): Promise<DemoAccessResult> {
    const originIpHash = this.origin.hashRequestIp(requestIp);
    const capacityPrecheck = await this.capacity.inspect(originIpHash);

    if (!capacityPrecheck.allowed) return capacityPrecheck;

    const rateLimitPrecheck = await this.rateLimit.inspect(originIpHash);

    if (!rateLimitPrecheck.allowed) {
      return { ...rateLimitPrecheck, reason: 'rate-limit' };
    }

    let login = this.credentials.generateLogin();
    const password = this.credentials.generatePassword();
    const passwordHash = await this.passwordService.hash(password);

    for (
      let attempt = 1;
      attempt <= DEMO_LOGIN_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this.createShell({
          input,
          originIpHash,
          login,
          password,
          passwordHash,
        });
      } catch (error) {
        if (!this.isLoginCollision(error)) throw error;

        if (attempt === DEMO_LOGIN_GENERATION_ATTEMPTS) {
          throw new DemoLoginGenerationExhaustedError();
        }

        login = this.credentials.generateLogin();
      }
    }

    throw new DemoLoginGenerationExhaustedError();
  }

  private createShell(options: {
    input: DemoAccessInput;
    originIpHash: string;
    login: string;
    password: string;
    passwordHash: string;
  }): Promise<DemoAccessResult> {
    return this.database.$transaction(async (transaction) => {
      await this.admissionLocks.acquireGlobalLock(transaction);
      await this.admissionLocks.acquireOriginLock(
        transaction,
        options.originIpHash,
      );

      const referenceTime = await this.capacity.readReferenceTime(transaction);
      const capacityResult = await this.capacity.inspectInTransaction(
        transaction,
        options.originIpHash,
        referenceTime,
      );

      if (!capacityResult.allowed) return capacityResult;

      const rateLimitResult =
        await this.rateLimit.checkAndRegisterAttemptInTransaction(
          transaction,
          options.originIpHash,
          referenceTime,
        );

      if (!rateLimitResult.allowed) {
        return { ...rateLimitResult, reason: 'rate-limit' };
      }

      return this.persistShell(transaction, options, referenceTime);
    });
  }

  private async persistShell(
    transaction: PrismaTypes.TransactionClient,
    options: {
      input: DemoAccessInput;
      originIpHash: string;
      login: string;
      password: string;
      passwordHash: string;
    },
    criadoEm: Date,
  ): Promise<DemoAccessResult> {
    const environmentId = randomUUID();
    const referenceTimeEpochMs = criadoEm.getTime();
    const [environment] = await transaction.$queryRaw<
      Array<{
        id: string;
        criadoEmEpochMs: bigint;
        expiresAtEpochMs: bigint;
      }>
    >`
      INSERT INTO "environment" (
        "id",
        "tipo",
        "criado_em",
        "expires_at",
        "demo_status",
        "demo_data_mode",
        "tutorial_enabled",
        "origin_ip_hash",
        "provisioned_at"
      )
      VALUES (
        ${environmentId}::uuid,
        'DEMO',
        to_timestamp(${referenceTimeEpochMs} / 1000.0),
        to_timestamp(${referenceTimeEpochMs} / 1000.0) + INTERVAL '24 hours',
        'PENDENTE',
        ${options.input.dataMode}::"demo_data_mode",
        ${options.input.tutorialEnabled},
        ${options.originIpHash},
        NULL
      )
      RETURNING
        "id",
        FLOOR(EXTRACT(EPOCH FROM "criado_em") * 1000)::bigint
          AS "criadoEmEpochMs",
        FLOOR(EXTRACT(EPOCH FROM "expires_at") * 1000)::bigint
          AS "expiresAtEpochMs"
    `;
    const activationExpiresAt = new Date(
      Number(environment.criadoEmEpochMs) + 60 * 60 * 1_000,
    );
    const expiresAt = new Date(Number(environment.expiresAtEpochMs));
    const employee = await transaction.funcionario.create({
      data: {
        environmentId,
        nome: 'Administrador Demo',
        telefone: '31900000000',
        email: options.login,
        ativo: true,
      },
      select: { id: true },
    });

    await transaction.usuario.create({
      data: {
        environmentId,
        emailLogin: options.login,
        senhaHash: options.passwordHash,
        perfil: Perfil.ADMINISTRADOR,
        ativo: true,
        deveAlterarSenha: false,
        funcionarioId: employee.id,
      },
    });
    await transaction.contadorOrdemServico.create({
      data: { environmentId, ultimoNumero: 0 },
    });

    return {
      allowed: true,
      login: options.login,
      password: options.password,
      activationExpiresAt: activationExpiresAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private isLoginCollision(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const metadata = JSON.stringify(error.meta ?? {});

    return (
      /Usuario|usuario/.test(metadata) &&
      /emailLogin|email_login|usuario_email_login_key/i.test(metadata)
    );
  }
}
