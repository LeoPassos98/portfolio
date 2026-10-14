import { ApiProperty } from '@nestjs/swagger';

export class OrderResponsibleResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  nome!: string;
}
