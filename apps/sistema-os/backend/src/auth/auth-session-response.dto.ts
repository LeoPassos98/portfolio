import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Perfil } from '../generated/prisma/client.js';

export class AuthSessionResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: Perfil, enumName: 'Perfil' })
  perfil!: Perfil;

  @ApiProperty({ format: 'uuid' })
  funcionarioId!: string;

  @ApiPropertyOptional({ example: 'Maria da Silva' })
  funcionarioNome?: string;

  @ApiProperty({ example: true })
  deveAlterarSenha!: boolean;
}
