import { Controller, Get, Req, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCorsOptions } from './cors.options.js';

const frontendOrigin = 'https://os.leonardopassos.com';
const unauthorizedOrigins = [
  'https://leonardopassos.com',
  'https://www.leonardopassos.com',
  'https://api.leonardopassos.com',
  'http://os.leonardopassos.com',
  'https://os.leonardopassos.com:444',
  'https://os.leonardopassos.com.attacker.example',
  'https://unrelated.example',
  'null',
];

// This HTTP fixture exercises CORS negotiation without sessions or PostgreSQL.
@Controller('cors-probe')
class CorsProbeController {
  @Get()
  get(@Req() incoming: Request) {
    return {
      receivedFixtureCookie:
        incoming.headers.cookie === 'cors_fixture=synthetic',
    };
  }
}

describe('single-origin CORS over HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CorsProbeController],
    }).compile();

    app = module.createNestApplication();
    app.enableCors(createCorsOptions(frontendOrigin));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows the OS origin with credentials and an explicit response origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/cors-probe')
      .set('Origin', frontendOrigin)
      .set('Cookie', 'cors_fixture=synthetic')
      .expect(200);

    expect(response.body).toEqual({ receivedFixtureCookie: true });
    expect(response.headers['access-control-allow-origin']).toBe(
      frontendOrigin,
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers.vary).toContain('Origin');
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  it.each(unauthorizedOrigins)(
    'does not authorize reading a response from origin %s',
    async (origin) => {
      const response = await request(app.getHttpServer())
        .get('/cors-probe')
        .set('Origin', origin)
        .expect(200);

      // A static origin produces a mismatch, not an HTTP authorization error.
      // The browser enforces that mismatch; auth and CSRF remain separate.
      expect(response.headers['access-control-allow-origin']).toBe(
        frontendOrigin,
      );
      expect(response.headers['access-control-allow-origin']).not.toBe(origin);
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'allows a credential-free %s preflight with Content-Type and X-CSRF-Token',
    async (method) => {
      const response = await request(app.getHttpServer())
        .options('/auth/login')
        .set('Origin', frontendOrigin)
        .set('Access-Control-Request-Method', method)
        .set('Access-Control-Request-Headers', 'content-type,x-csrf-token')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(
        frontendOrigin,
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(
        response.headers['access-control-allow-methods'].split(','),
      ).toContain(method);
      expect(
        response.headers['access-control-allow-headers']
          .toLowerCase()
          .split(','),
      ).toEqual(['content-type', 'x-csrf-token']);
      expect(response.headers).not.toHaveProperty('set-cookie');
    },
  );

  it.each(['https://leonardopassos.com', 'https://unrelated.example'])(
    'does not authorize a credentialed mutation preflight from %s',
    async (origin) => {
      const response = await request(app.getHttpServer())
        .options('/auth/logout')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,x-csrf-token')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(
        frontendOrigin,
      );
      expect(response.headers['access-control-allow-origin']).not.toBe(origin);
      expect(response.headers).not.toHaveProperty('set-cookie');
    },
  );
});
