import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PasswordModule } from './auth/password/password.module.js';
import { SessionModule } from './auth/session/session.module.js';
import { validateEnvironment } from './config/environment.validation.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    PasswordModule,
    SessionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
