import { Module } from '@nestjs/common';
import { PasswordModule } from '../auth/password/password.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { DemoAccessService } from './demo-access.service.js';
import { DemoAdmissionLockService } from './demo-admission-lock.service.js';
import { DemoCapacityService } from './demo-capacity.service.js';
import { DemoController } from './demo.controller.js';
import { DemoCredentialsService } from './demo-credentials.service.js';
import { DemoGenerationRateLimitService } from './demo-generation-rate-limit.service.js';
import { DemoOriginService } from './demo-origin.service.js';
import { DemoProvisioningService } from './demo-provisioning.service.js';
import { DemoSeedService } from './demo-seed.service.js';

@Module({
  imports: [DatabaseModule, PasswordModule],
  controllers: [DemoController],
  providers: [
    DemoAccessService,
    DemoAdmissionLockService,
    DemoCapacityService,
    DemoCredentialsService,
    DemoOriginService,
    DemoGenerationRateLimitService,
    DemoProvisioningService,
    DemoSeedService,
  ],
  exports: [
    DemoProvisioningService,
    DemoAdmissionLockService,
    DemoOriginService,
    DemoGenerationRateLimitService,
  ],
})
export class DemoModule {}
