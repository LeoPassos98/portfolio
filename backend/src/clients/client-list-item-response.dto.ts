import { ApiProperty } from '@nestjs/swagger';

export class ClientListItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  nome!: string;

  @ApiProperty({ example: '11999999999' })
  telefone!: string;

  @ApiProperty({ example: '12345678901', nullable: true })
  documento!: string | null;

  @ApiProperty({ example: true })
  ativo!: boolean;
}
