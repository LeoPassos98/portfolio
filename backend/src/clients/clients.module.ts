import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { CepLookupService } from './cep/cep-lookup.service.js';
import { ViaCepProvider } from './cep/via-cep.provider.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ClientsController],
  providers: [ClientsService, CepLookupService, ViaCepProvider],
})
export class ClientsModule {}
