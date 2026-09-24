import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DemoGenerationRateLimitService } from './demo-generation-rate-limit.service.js';
import { DemoOriginService } from './demo-origin.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [DemoOriginService, DemoGenerationRateLimitService],
  exports: [DemoOriginService, DemoGenerationRateLimitService],
})
export class DemoModule {}
