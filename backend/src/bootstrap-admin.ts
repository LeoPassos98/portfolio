import { ConsoleLogger, Logger } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdminBootstrapModule } from './bootstrap/admin-bootstrap.module.js';
import {
  AdminBootstrapAlreadyInitializedError,
  AdminBootstrapService,
} from './bootstrap/admin-bootstrap.service.js';
import {
  AdminBootstrapConfigurationError,
  parseAdminBootstrapEnvironment,
} from './bootstrap/admin-bootstrap.schema.js';

const logger = new Logger('AdminBootstrapCommand');

async function runAdminBootstrap(): Promise<void> {
  let application: INestApplicationContext | undefined;

  try {
    logger.log('Validando configuração...');
    application = await NestFactory.createApplicationContext(
      AdminBootstrapModule,
      { logger: new ConsoleLogger() },
    );
    const input = parseAdminBootstrapEnvironment(process.env);
    const result = await application
      .get(AdminBootstrapService)
      .createFirstAdministrator(input);

    logger.log('Administrador inicial criado.');
    logger.log(`E-mail de login: ${result.loginEmail}`);
    logger.log('Troca de senha obrigatória no primeiro acesso.');
  } catch (error: unknown) {
    process.exitCode = 1;

    if (
      error instanceof AdminBootstrapConfigurationError ||
      error instanceof AdminBootstrapAlreadyInitializedError
    ) {
      logger.error(error.message);

      if (error instanceof AdminBootstrapAlreadyInitializedError) {
        logger.error('Nenhuma alteração foi realizada.');
      }

      return;
    }

    logger.error(
      'Falha inesperada no bootstrap. Nenhuma credencial foi registrada.',
    );
  } finally {
    await application?.close();
  }
}

await runAdminBootstrap();
