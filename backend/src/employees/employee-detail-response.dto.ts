import { ApiProperty } from '@nestjs/swagger';
import { Perfil } from '../generated/prisma/client.js';

export class EmployeeDetailAccountResponse {
  @ApiProperty({ example: 'maria@login.example.com' })
  emailLogin!: string;

  @ApiProperty({ example: true })
  ativo!: boolean;

  @ApiProperty({ enum: Perfil, enumName: 'Perfil' })
  perfil!: Perfil;
}

export class EmployeeDetailResponse {
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

  @ApiProperty({ format: 'date-time' })
  criadoEm!: Date;

  @ApiProperty({
    type: EmployeeDetailAccountResponse,
    nullable: true,
    description:
      'Conta de acesso opcional. No cadastro inicial de funcionário, é sempre null.',
  })
  conta!: EmployeeDetailAccountResponse | null;
}
