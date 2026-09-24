import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface.js';
import { AuthService } from '../auth/auth.service.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { Perfil } from '../generated/prisma/client.js';
import { RequestIpDebugController } from './request-ip-debug.controller.js';

const users: Readonly<Record<string, AuthenticatedUser>> = {
  administrator: {
    id: 'administrator',
    environmentId: 'environment-id',
    perfil: Perfil.ADMINISTRADOR,
    funcionarioId: 'administrator-employee-id',
    deveAlterarSenha: false,
  },
  employee: {
    id: 'employee',
    environmentId: 'environment-id',
    perfil: Perfil.FUNCIONARIO,
    funcionarioId: 'employee-id',
    deveAlterarSenha: false,
  },
};

describe('RequestIpDebugController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const authService = {
      getAuthenticatedUser: vi.fn((userId: string) => users[userId] ?? null),
      isAuthenticationContextValid: vi.fn(() => true),
      toAuthenticatedUser: vi.fn((user: AuthenticatedUser) => user),
    };
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [RequestIpDebugController],
      providers: [
        SessionGuard,
        RoleGuard,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    app.use((httpRequest: Request, _response: Response, next: NextFunction) => {
      httpRequest.session = {
        usuarioId: httpRequest.get('x-test-user-id'),
        destroy: (callback) => callback(),
      } as Request['session'];
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer())
      .get('/debug/request-ip')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('rejects an authenticated employee', async () => {
    await request(app.getHttpServer())
      .get('/debug/request-ip')
      .set('x-test-user-id', 'employee')
      .expect(HttpStatus.FORBIDDEN);
  });

  it('returns only the request IP diagnostic to an administrator', async () => {
    const response = await request(app.getHttpServer())
      .get('/debug/request-ip')
      .set('x-test-user-id', 'administrator')
      .set('x-forwarded-for', '203.0.113.10, 198.51.100.2')
      .set('x-real-ip', '203.0.113.10')
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({
      'request.socket.remoteAddress': expect.any(String),
      'request.ip': expect.any(String),
      'request.ips': [],
      'x-forwarded-for': '203.0.113.10, 198.51.100.2',
      'x-real-ip': '203.0.113.10',
    });
  });
});
