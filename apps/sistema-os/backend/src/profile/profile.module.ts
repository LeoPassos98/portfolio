import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PasswordModule } from '../auth/password/password.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, PasswordModule, SessionModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
