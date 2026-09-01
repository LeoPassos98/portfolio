import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../auth.service.js';
import { SessionGuard } from './session.guard.js';

function createContext(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function createRequest(usuarioId?: string): Request {
  return {
    session: {
      usuarioId,
      destroy: vi.fn((callback: (error?: Error) => void) => callback()),
    },
  } as unknown as Request;
}

function isUnauthenticated(error: unknown): boolean {
  expect(error).toBeInstanceOf(HttpException);
  const exception = error as HttpException;

  expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  expect(exception.getResponse()).toEqual({
    code: 'AUTH_UNAUTHENTICATED',
    message: 'Authentication required',
  });

  return true;
}

describe('SessionGuard', () => {
  it('rejects a request without usuarioId', async () => {
    const authService = {
      getAuthenticatedUser: vi.fn(),
      toAuthenticatedUser: vi.fn(),
    } as unknown as AuthService;
    const guard = new SessionGuard(authService);

    await expect(
      guard.canActivate(createContext(createRequest())),
    ).rejects.toSatisfy(isUnauthenticated);
    expect(authService.getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it('allows an active user and places a safe principal in the request', async () => {
    const request = createRequest('usuario-id');
    const usuario = {
      id: 'usuario-id',
      perfil: 'FUNCIONARIO',
      funcionarioId: 'funcionario-id',
      funcionario: { nome: 'Maria da Silva' },
      deveAlterarSenha: true,
      ativo: true,
      senhaHash: 'hash-que-nao-pode-ser-exposto',
    };
    const authService = {
      getAuthenticatedUser: vi.fn().mockResolvedValue(usuario),
      toAuthenticatedUser: vi.fn(() => ({
        id: 'usuario-id',
        perfil: 'FUNCIONARIO',
        funcionarioId: 'funcionario-id',
        funcionarioNome: 'Maria da Silva',
        deveAlterarSenha: true,
      })),
    } as unknown as AuthService;
    const guard = new SessionGuard(authService);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(authService.getAuthenticatedUser).toHaveBeenCalledWith('usuario-id');
    expect(request.authenticatedUser).toEqual({
      id: 'usuario-id',
      perfil: 'FUNCIONARIO',
      funcionarioId: 'funcionario-id',
      funcionarioNome: 'Maria da Silva',
      deveAlterarSenha: true,
    });
    expect(request.authenticatedUser).not.toHaveProperty('senhaHash');
    expect(request.authenticatedUser).not.toHaveProperty('senha');
  });

  it.each([
    ['does not find the user', null],
    [
      'finds an inactive user',
      {
        id: 'usuario-id',
        perfil: 'FUNCIONARIO',
        funcionarioId: 'funcionario-id',
        funcionario: { nome: 'Maria da Silva' },
        deveAlterarSenha: false,
        ativo: false,
      },
    ],
  ])('destroys the session and rejects when it %s', async (_, usuario) => {
    const request = createRequest('usuario-id');
    const authService = {
      getAuthenticatedUser: vi.fn().mockResolvedValue(usuario),
      toAuthenticatedUser: vi.fn(),
    } as unknown as AuthService;
    const guard = new SessionGuard(authService);

    await expect(guard.canActivate(createContext(request))).rejects.toSatisfy(
      isUnauthenticated,
    );

    expect(request.session.destroy).toHaveBeenCalledOnce();
    expect(request.authenticatedUser).toBeUndefined();
  });
});
