import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PasswordModule } from '../auth/password/password.module.js';
import { SessionModule } from '../auth/session/session.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, PasswordModule, SessionModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
