import { ApiProperty } from '@nestjs/swagger';
import {
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';

class OrderDetailClientResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  nome!: string;
}

class OrderDetailResponsibleResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  nome!: string;
}

export class OrderDetailResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'OS-000001' })
  numero!: string;

  @ApiProperty()
  descricao!: string;

  @ApiProperty({ example: '1250.00', description: 'Decimal exato em texto.' })
  valor!: string;

  @ApiProperty({ nullable: true })
  observacoes!: string | null;

  @ApiProperty({ enum: StatusOrdemServico })
  status!: StatusOrdemServico;

  @ApiProperty({ enum: Visibilidade })
  visibilidade!: Visibilidade;

  @ApiProperty({ example: 1 })
  versao!: number;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: Date;

  @ApiProperty({ format: 'date-time' })
  atualizadoEm!: Date;

  @ApiProperty({ format: 'date-time', nullable: true })
  concluidoEm!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  canceladoEm!: Date | null;

  @ApiProperty({ type: OrderDetailClientResponse })
  cliente!: OrderDetailClientResponse;

  @ApiProperty({ type: OrderDetailResponsibleResponse })
  responsavel!: OrderDetailResponsibleResponse;
}
