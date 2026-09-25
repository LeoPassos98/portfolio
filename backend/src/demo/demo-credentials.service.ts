import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';

export const DEMO_CREDENTIAL_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export const DEMO_LOGIN_IDENTIFIER_LENGTH = 10;
export const DEMO_PASSWORD_SUFFIX_LENGTH = 12;

function randomCharacters(length: number): string {
  return Array.from({ length }, () =>
    DEMO_CREDENTIAL_ALPHABET.charAt(randomInt(DEMO_CREDENTIAL_ALPHABET.length)),
  ).join('');
}

@Injectable()
export class DemoCredentialsService {
  generateLogin(): string {
    return `demo-${randomCharacters(DEMO_LOGIN_IDENTIFIER_LENGTH)}@leonardopassos.com`;
  }

  generatePassword(): string {
    return `senhadademo-${randomCharacters(DEMO_PASSWORD_SUFFIX_LENGTH)}`;
  }
}
