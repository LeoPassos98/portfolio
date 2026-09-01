import { Module } from '@nestjs/common';
import { SessionStoreService } from './session-store.service.js';

@Module({
  providers: [SessionStoreService],
  exports: [SessionStoreService],
})
export class SessionModule {}
