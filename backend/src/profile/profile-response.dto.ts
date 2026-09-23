import { ApiProperty } from '@nestjs/swagger';
import { Perfil } from '../generated/prisma/client.js';

export class ProfileResponse {
  @ApiProperty({ example: 'Maria da Silva' })
  nome!: string;

  @ApiProperty({ example: '11999999999' })
  telefone!: string;

  @ApiProperty({ example: 'maria@example.com' })
  email!: string;

  @ApiProperty({ enum: Perfil, enumName: 'Perfil' })
  perfil!: Perfil;

  @ApiProperty({ example: true })
  funcionarioAtivo!: boolean;

  @ApiProperty({ example: true })
  contaAtiva!: boolean;
}
