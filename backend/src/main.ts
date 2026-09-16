import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/errors/http-exception.filter.js';
import { setupOpenApi } from './common/openapi/openapi.setup.js';
import { SessionStoreService } from './auth/session/session-store.service.js';
import { createCorsOptions } from './common/http/cors.options.js';
import { configureTrustProxy } from './common/http/trust-proxy.config.js';
import type { Environment } from './config/environment.validation.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      json: process.env.NODE_ENV === 'production',
    }),
  });
  const configService =
    app.get<ConfigService<Environment, true>>(ConfigService);
  const sessionStoreService = app.get(SessionStoreService);
  const frontendOrigin = configService.getOrThrow('FRONTEND_ORIGIN', {
    infer: true,
  });
  const nodeEnvironment = configService.getOrThrow('NODE_ENV', { infer: true });

  configureTrustProxy(app, nodeEnvironment);
  app.enableCors(createCorsOptions(frontendOrigin));
  app.use(sessionStoreService.middleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  setupOpenApi(app);
  app.enableShutdownHooks();
  const port = configService.getOrThrow<number>('PORT');

  await app.listen(port);
  new Logger('Bootstrap').log(`Application listening on port ${port}`);
}
await bootstrap();
