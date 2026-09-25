import { ApiProperty } from '@nestjs/swagger';

export class DemoAccessResponse {
  @ApiProperty({
    example: 'demo-k7f2x9m4qa@leonardopassos.com',
  })
  login!: string;

  @ApiProperty({
    example: 'senhadademo-8m4q2x7r5k9p',
  })
  password!: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-09-24T16:00:00.000Z',
  })
  activationExpiresAt!: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-09-25T15:00:00.000Z',
  })
  expiresAt!: string;
}
