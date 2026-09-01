import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { Perfil } from '../../generated/prisma/client.js';
import { Roles } from '../roles.decorator.js';
import { RoleGuard } from './role.guard.js';

class RolesTestController {
  @Roles(Perfil.ADMINISTRADOR)
  administratorOnly(): void {}

  @Roles(Perfil.FUNCIONARIO)
  employeeOnly(): void {}

  @Roles(Perfil.ADMINISTRADOR, Perfil.FUNCIONARIO)
  administratorOrEmployee(): void {}

  unrestricted(): void {}
}

function createRequest(perfil: Perfil): Request {
  return {
    authenticatedUser: {
      id: 'usuario-id',
      perfil,
      funcionarioId: 'funcionario-id',
      deveAlterarSenha: false,
    },
  } as Request;
}

function createContext(
  request: Request,
  handler: () => void,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => RolesTestController,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function expectForbidden(action: () => boolean): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const exception = error as HttpException;

    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(exception.getResponse()).toEqual({
      code: 'AUTH_FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });

    return;
  }

  throw new Error('Expected RoleGuard to reject the request.');
}

describe('RoleGuard', () => {
  const guard = new RoleGuard(new Reflector());

  it('allows an administrator when the administrator role is required', () => {
    expect(
      guard.canActivate(
        createContext(
          createRequest(Perfil.ADMINISTRADOR),
          RolesTestController.prototype.administratorOnly,
        ),
      ),
    ).toBe(true);
  });

  it('uses only the authenticated user request state', () => {
    const request = createRequest(Perfil.ADMINISTRADOR);

    Object.defineProperty(request, 'session', {
      get: () => {
        throw new Error('RoleGuard must not read the session or the database.');
      },
    });

    expect(
      guard.canActivate(
        createContext(request, RolesTestController.prototype.administratorOnly),
      ),
    ).toBe(true);
  });

  it('rejects an employee when the administrator role is required', () => {
    expectForbidden(() =>
      guard.canActivate(
        createContext(
          createRequest(Perfil.FUNCIONARIO),
          RolesTestController.prototype.administratorOnly,
        ),
      ),
    );
  });

  it('allows an employee when the employee role is required', () => {
    expect(
      guard.canActivate(
        createContext(
          createRequest(Perfil.FUNCIONARIO),
          RolesTestController.prototype.employeeOnly,
        ),
      ),
    ).toBe(true);
  });

  it('allows either profile when multiple roles are declared', () => {
    for (const perfil of [Perfil.ADMINISTRADOR, Perfil.FUNCIONARIO]) {
      expect(
        guard.canActivate(
          createContext(
            createRequest(perfil),
            RolesTestController.prototype.administratorOrEmployee,
          ),
        ),
      ).toBe(true);
    }
  });

  it('does not restrict a handler without role metadata', () => {
    expect(
      guard.canActivate(
        createContext(
          createRequest(Perfil.FUNCIONARIO),
          RolesTestController.prototype.unrestricted,
        ),
      ),
    ).toBe(true);
  });
});
