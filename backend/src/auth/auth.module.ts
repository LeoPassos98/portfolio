import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PasswordModule } from './password/password.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [DatabaseModule, PasswordModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
