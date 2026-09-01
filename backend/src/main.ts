import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/errors/http-exception.filter.js';
import { setupOpenApi } from './common/openapi/openapi.setup.js';
import { SessionStoreService } from './auth/session/session-store.service.js';
import { createCorsOptions } from './common/http/cors.options.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: process.env.NODE_ENV === 'production',
    }),
  });
  const configService = app.get(ConfigService);
  const sessionStoreService = app.get(SessionStoreService);
  const frontendOrigin = configService.getOrThrow<string>('FRONTEND_ORIGIN');

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
