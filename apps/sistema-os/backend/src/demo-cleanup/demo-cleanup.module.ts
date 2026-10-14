import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { environmentSchema } from '../config/environment.validation.js';
import { DatabaseModule } from '../database/database.module.js';
import { DemoAdmissionLockService } from '../demo/demo-admission-lock.service.js';
import { DemoCleanupService } from './demo-cleanup.service.js';

export const demoCleanupEnvironmentSchema = environmentSchema.pick({
  DATABASE_URL: true,
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (environment) => {
        const result = demoCleanupEnvironmentSchema.safeParse(environment);
        if (!result.success) {
          throw new Error('DEMO cleanup requires a valid DATABASE_URL.');
        }
        return result.data;
      },
    }),
    DatabaseModule,
  ],
  providers: [DemoAdmissionLockService, DemoCleanupService],
  exports: [DemoCleanupService],
})
export class DemoCleanupModule {}
