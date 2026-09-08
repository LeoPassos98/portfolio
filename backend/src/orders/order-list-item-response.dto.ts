import { ApiProperty } from '@nestjs/swagger';
import {
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';

class OrderClientResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  nome!: string;
}

class OrderResponsibleResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  nome!: string;
}

export class OrderListItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'OS-000001' })
  numero!: string;

  @ApiProperty({ type: OrderClientResponse })
  cliente!: OrderClientResponse;

  @ApiProperty({ type: OrderResponsibleResponse })
  responsavel!: OrderResponsibleResponse;

  @ApiProperty({ enum: StatusOrdemServico })
  status!: StatusOrdemServico;

  @ApiProperty({ example: '1250.00', description: 'Decimal exato em texto.' })
  valor!: string;

  @ApiProperty({ enum: Visibilidade })
  visibilidade!: Visibilidade;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: Date;

  @ApiProperty({ format: 'date-time' })
  atualizadoEm!: Date;

  @ApiProperty({ example: 1 })
  versao!: number;
}
