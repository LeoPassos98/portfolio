import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { FirstAccessCompletedGuard } from './first-access-completed.guard.js';

function createContext(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('FirstAccessCompletedGuard', () => {
  it('rejects a user with a pending mandatory password change', () => {
    const request = {
      authenticatedUser: {
        id: 'usuario-id',
        perfil: 'FUNCIONARIO',
        funcionarioId: 'funcionario-id',
        deveAlterarSenha: true,
      },
    } as Request;
    const guard = new FirstAccessCompletedGuard();

    expect(() => guard.canActivate(createContext(request))).toThrow(
      HttpException,
    );

    try {
      guard.canActivate(createContext(request));
    } catch (error) {
      const exception = error as HttpException;

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.getResponse()).toEqual({
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });
    }
  });

  it('allows a user whose password change is completed', () => {
    const request = {
      authenticatedUser: {
        id: 'usuario-id',
        perfil: 'FUNCIONARIO',
        funcionarioId: 'funcionario-id',
        deveAlterarSenha: false,
      },
    } as Request;
    const guard = new FirstAccessCompletedGuard();

    expect(guard.canActivate(createContext(request))).toBe(true);
  });
});
