import { ApiProperty } from '@nestjs/swagger';

export class CepLookupResponse {
  @ApiProperty({ example: 'Praça da Sé', nullable: true })
  logradouro!: string | null;

  @ApiProperty({ example: 'Sé', nullable: true })
  bairro!: string | null;

  @ApiProperty({ example: 'São Paulo', nullable: true })
  cidade!: string | null;

  @ApiProperty({ example: 'SP', nullable: true })
  uf!: string | null;
}
