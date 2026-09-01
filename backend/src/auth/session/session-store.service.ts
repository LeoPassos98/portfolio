import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { Pool } from 'pg';
import type { Environment } from '../../config/environment.validation.js';
import { createSessionMiddleware } from './session.middleware.js';

@Injectable()
export class SessionStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionStoreService.name);
  private readonly pool: Pool;
  private readonly store: InstanceType<ReturnType<typeof connectPgSimple>>;
  readonly middleware;

  constructor(configService: ConfigService<Environment, true>) {
    const connectionString = configService.getOrThrow('DATABASE_URL', {
      infer: true,
    });
    const secret = configService.getOrThrow('SESSION_SECRET', { infer: true });
    const maxAgeMs = configService.getOrThrow('SESSION_MAX_AGE_MS', {
      infer: true,
    });
    const nodeEnvironment = configService.getOrThrow('NODE_ENV', {
      infer: true,
    });

    this.pool = new Pool({ connectionString });
    this.pool.on('error', () => {
      this.logger.error('Session store pool error');
    });

    const PostgreSqlSessionStore = connectPgSimple(session);

    this.store = new PostgreSqlSessionStore({
      pool: this.pool,
      tableName: 'session',
      createTableIfMissing: false,
      ttl: Math.ceil(maxAgeMs / 1_000),
      disableTouch: true,
    });
    this.middleware = createSessionMiddleware({
      store: this.store,
      secret,
      isProduction: nodeEnvironment === 'production',
      maxAgeMs,
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.store.close();
    } finally {
      await this.pool.end();
      this.logger.log('Session store disconnected');
    }
  }
}
