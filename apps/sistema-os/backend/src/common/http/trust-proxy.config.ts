import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Environment } from '../../config/environment.validation.js';

export function configureTrustProxy(
  app: NestExpressApplication,
  nodeEnvironment: Environment['NODE_ENV'],
): void {
  if (nodeEnvironment === 'production') {
    app.set('trust proxy', 1);
  }
}
