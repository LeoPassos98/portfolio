import { ApiProperty } from '@nestjs/swagger';
import { Perfil } from '../generated/prisma/client.js';

export class EmployeeListAccountResponse {
  @ApiProperty({ example: true })
  ativo!: boolean;

  @ApiProperty({ enum: Perfil, enumName: 'Perfil' })
  perfil!: Perfil;
}

export class EmployeeListItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  nome!: string;

  @ApiProperty({ example: '11999999999' })
  telefone!: string;

  @ApiProperty({ example: 'maria@example.com' })
  email!: string;

  @ApiProperty({ example: true })
  ativo!: boolean;

  @ApiProperty({ type: EmployeeListAccountResponse, nullable: true })
  conta!: EmployeeListAccountResponse | null;
}
