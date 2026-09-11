import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PasswordModule } from '../auth/password/password.module.js';
import { environmentSchema } from '../config/environment.validation.js';
import { DatabaseModule } from '../database/database.module.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';

const bootstrapRuntimeEnvironmentSchema = environmentSchema.pick({
  DATABASE_URL: true,
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (environment) =>
        bootstrapRuntimeEnvironmentSchema.parse(environment),
    }),
    DatabaseModule,
    PasswordModule,
  ],
  providers: [AdminBootstrapService],
  exports: [AdminBootstrapService],
})
export class AdminBootstrapModule {}
