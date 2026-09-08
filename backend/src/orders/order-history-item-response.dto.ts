import { ApiProperty } from '@nestjs/swagger';
import {
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';

class OrderHistoryResponsibleResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  nome!: string;
}

class OrderHistoryAuthorResponse {
  @ApiProperty({
    format: 'uuid',
    description: 'Identidade histórica do usuário.',
  })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  nome!: string;
}

export class OrderHistoryItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 2 })
  versao!: number;

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

  @ApiProperty({ format: 'date-time', nullable: true })
  concluidoEm!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  canceladoEm!: Date | null;

  @ApiProperty({ format: 'date-time' })
  snapshotEm!: Date;

  @ApiProperty({ type: OrderHistoryResponsibleResponse })
  responsavel!: OrderHistoryResponsibleResponse;

  @ApiProperty({ type: OrderHistoryAuthorResponse })
  alteradoPor!: OrderHistoryAuthorResponse;
}
