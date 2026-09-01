import { randomBytes, timingSafeEqual } from 'node:crypto';

const CSRF_TOKEN_BYTE_LENGTH = 32;

export function createCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_BYTE_LENGTH).toString('base64url');
}

export function matchesCsrfToken(
  expectedToken: string | undefined,
  receivedToken: string | undefined,
): boolean {
  if (!expectedToken || !receivedToken) {
    return false;
  }

  const expected = Buffer.from(expectedToken);
  const received = Buffer.from(receivedToken);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
