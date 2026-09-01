import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { CsrfGuard } from './csrf.guard.js';

function createContext(
  method: string,
  csrfToken?: string,
  headerToken?: string,
): ExecutionContext {
  const request = {
    method,
    session: { csrfToken },
    get: vi.fn().mockReturnValue(headerToken),
  } as unknown as Request;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function expectInvalidToken(action: () => boolean): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const exception = error as HttpException;

    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(exception.getResponse()).toEqual({
      code: 'CSRF_INVALID_TOKEN',
      message: 'CSRF token is invalid',
    });

    return;
  }

  throw new Error('Expected CsrfGuard to reject the request.');
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it.each(['GET', 'HEAD', 'OPTIONS'])('allows %s without a token', (method) => {
    expect(guard.canActivate(createContext(method))).toBe(true);
  });

  it('rejects POST without a token', () => {
    expectInvalidToken(() => guard.canActivate(createContext('POST')));
  });

  it('rejects POST with an incorrect token', () => {
    expectInvalidToken(() =>
      guard.canActivate(
        createContext('POST', 'token-correto', 'token-incorreto'),
      ),
    );
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'allows %s with the matching token',
    (method) => {
      expect(
        guard.canActivate(
          createContext(method, 'token-correto', 'token-correto'),
        ),
      ).toBe(true);
    },
  );
});
