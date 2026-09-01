import { ApiProperty } from '@nestjs/swagger';

export class CsrfTokenResponse {
  @ApiProperty({
    description: 'Token CSRF vinculado à sessão server-side atual.',
  })
  csrfToken!: string;
}
