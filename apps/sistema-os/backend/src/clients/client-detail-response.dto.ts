import { ApiProperty } from '@nestjs/swagger';

export class ClientDetailResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  nome!: string;

  @ApiProperty({ example: '11999999999' })
  telefone!: string;

  @ApiProperty({ example: '12345678901', nullable: true })
  documento!: string | null;

  @ApiProperty({ example: 'maria@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '01001000' })
  cep!: string;

  @ApiProperty({ example: 'Praça da Sé' })
  logradouro!: string;

  @ApiProperty({ example: '100' })
  numero!: string;

  @ApiProperty({ example: 'Sala 10', nullable: true })
  complemento!: string | null;

  @ApiProperty({ example: 'Sé' })
  bairro!: string;

  @ApiProperty({ example: 'São Paulo' })
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;

  @ApiProperty({ example: true })
  ativo!: boolean;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: Date;
}
