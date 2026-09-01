import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PasswordModule } from './password/password.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { FirstAccessCompletedGuard } from './guards/first-access-completed.guard.js';
import { RoleGuard } from './guards/role.guard.js';
import { SessionGuard } from './guards/session.guard.js';

@Module({
  imports: [DatabaseModule, PasswordModule],
  controllers: [AuthController],
  providers: [AuthService, FirstAccessCompletedGuard, RoleGuard, SessionGuard],
  exports: [
    AuthService,
    FirstAccessCompletedGuard,
    RoleGuard,
    SessionGuard,
  ],
})
export class AuthModule {}
