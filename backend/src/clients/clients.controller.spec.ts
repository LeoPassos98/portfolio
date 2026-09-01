import 'dotenv/config';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { setupOpenApi } from '../common/openapi/openapi.setup.js';
import { DatabaseService } from '../database/database.service.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run client tests.');
}

type UserFixture = {
  userId: string;
  funcionarioId: string;
};

type ClientFixture = {
  id: string;
  nome: string;
  telefone: string;
  documento: string | null;
  email: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  ativo: boolean;
  criadoEm: Date;
};

type ClientFixtureOptions = Partial<Omit<ClientFixture, 'id' | 'criadoEm'>>;

function getSessionId(cookie: string | undefined): string {
  if (!cookie) {
    throw new Error('Expected a session cookie.');
  }

  const cookieValue = cookie.split(';', 1)[0]?.replace('connect.sid=', '');

  if (!cookieValue) {
    throw new Error('Expected a connect.sid cookie.');
  }

  const signedSessionId = decodeURIComponent(cookieValue);
  const sessionId = signedSessionId.slice(2).split('.', 1)[0];

  if (!signedSessionId.startsWith('s:') || !sessionId) {
    throw new Error('Expected a signed session identifier.');
  }

  return sessionId;
}

describe('ClientsController', () => {
  let app: Express;
  let database: DatabaseService;
  let nestApplication: INestApplication;
  let testingModule: TestingModule;
  let verificationPool: Pool | undefined;
  const clientIds: string[] = [];
  const funcionarioIds: string[] = [];
  const orderIds: string[] = [];
  const sessionIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    nestApplication = testingModule.createNestApplication();

    const sessionStoreService = nestApplication.get(SessionStoreService);
    nestApplication.use(sessionStoreService.middleware);
    nestApplication.useGlobalFilters(new HttpExceptionFilter());
    nestApplication.enableCors(createCorsOptions('http://localhost:5173'));
    setupOpenApi(nestApplication);
    await nestApplication.init();

    app = nestApplication.getHttpAdapter().getInstance() as Express;
    database = nestApplication.get(DatabaseService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  afterEach(async () => {
    if (sessionIds.length > 0) {
      await verificationPool?.query(
        'DELETE FROM "session" WHERE "sid" = ANY($1)',
        [sessionIds],
      );
    }

    if (orderIds.length > 0) {
      await database.ordemServico.deleteMany({
        where: { id: { in: orderIds } },
      });
    }

    if (clientIds.length > 0) {
      await database.cliente.deleteMany({ where: { id: { in: clientIds } } });
    }

    if (userIds.length > 0) {
      await database.usuario.deleteMany({ where: { id: { in: userIds } } });
    }

    if (funcionarioIds.length > 0) {
      await database.funcionario.deleteMany({
        where: { id: { in: funcionarioIds } },
      });
    }

    clientIds.length = 0;
    funcionarioIds.length = 0;
    orderIds.length = 0;
    sessionIds.length = 0;
    userIds.length = 0;
  });

  afterAll(async () => {
    await verificationPool?.end();
    await nestApplication.close();
  });

  async function createUserFixture({
    perfil = 'FUNCIONARIO',
    deveAlterarSenha = false,
  }: Partial<{
    perfil: 'ADMINISTRADOR' | 'FUNCIONARIO';
    deveAlterarSenha: boolean;
  }> = {}): Promise<UserFixture> {
    const suffix = crypto.randomUUID();
    const funcionario = await database.funcionario.create({
      data: {
        nome: `Funcionário ${suffix}`,
        telefone: '11999999999',
        email: `funcionario-${suffix}@example.test`,
      },
    });
    const usuario = await database.usuario.create({
      data: {
        emailLogin: `usuario-${suffix}@example.test`,
        senhaHash: 'test-only-password-hash',
        perfil,
        deveAlterarSenha,
        funcionarioId: funcionario.id,
      },
    });

    funcionarioIds.push(funcionario.id);
    userIds.push(usuario.id);

    return { userId: usuario.id, funcionarioId: funcionario.id };
  }

  async function createClientFixture(
    options: ClientFixtureOptions = {},
  ): Promise<ClientFixture> {
    const suffix = crypto.randomUUID();
    const client = await database.cliente.create({
      data: {
        nome: options.nome ?? `Cliente ${suffix}`,
        telefone: options.telefone ?? '11988887777',
        documento: options.documento ?? suffix.replace(/\D/g, ''),
        email: options.email ?? `cliente-${suffix}@example.test`,
        cep: options.cep ?? '01001000',
        logradouro: options.logradouro ?? 'Praça da Sé',
        numero: options.numero ?? '100',
        complemento: options.complemento ?? 'Sala 10',
        bairro: options.bairro ?? 'Sé',
        cidade: options.cidade ?? 'São Paulo',
        uf: options.uf ?? 'SP',
        ativo: options.ativo ?? true,
      },
    });

    clientIds.push(client.id);

    return client;
  }

  async function createAuthenticatedAgent({
    perfil,
    deveAlterarSenha,
  }: Partial<{
    perfil: 'ADMINISTRADOR' | 'FUNCIONARIO';
    deveAlterarSenha: boolean;
  }> = {}): Promise<{
    agent: SuperAgentTest;
    csrfToken: string;
    user: UserFixture;
  }> {
    const user = await createUserFixture({ perfil, deveAlterarSenha });
    const agent = request.agent(app);
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    const sessionId = getSessionId(response.headers['set-cookie']?.[0]);
    sessionIds.push(sessionId);
    const update = await verificationPool!.query(
      'UPDATE "session" SET "sess" = jsonb_set("sess"::jsonb, \'{usuarioId}\', to_jsonb($2::text))::json WHERE "sid" = $1',
      [sessionId, user.userId],
    );

    expect(update.rowCount).toBe(1);

    return { agent, csrfToken: response.body.csrfToken as string, user };
  }

  function createClientBody(overrides: Record<string, unknown> = {}) {
    return {
      nome: 'Maria da Silva',
      telefone: '11999999999',
      documento: '529.982.247-25',
      email: 'maria@example.test',
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '100',
      complemento: 'Sala 10',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
      ...overrides,
    };
  }

  function trackCreatedClient(response: request.Response): void {
    clientIds.push(response.body.id as string);
  }

  it('allows an administrator to create and persists an active client', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent({
      perfil: 'ADMINISTRADOR',
    });
    const response = await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(createClientBody())
      .expect(HttpStatus.CREATED);
    trackCreatedClient(response);

    const persisted = await database.cliente.findUniqueOrThrow({
      where: { id: response.body.id as string },
    });

    expect(response.body).toEqual({
      id: persisted.id,
      nome: persisted.nome,
      telefone: persisted.telefone,
      documento: persisted.documento,
      email: persisted.email,
      cep: persisted.cep,
      logradouro: persisted.logradouro,
      numero: persisted.numero,
      complemento: persisted.complemento,
      bairro: persisted.bairro,
      cidade: persisted.cidade,
      uf: persisted.uf,
      ativo: true,
      criadoEm: persisted.criadoEm.toISOString(),
    });
    expect(persisted.ativo).toBe(true);
    expect(response.body).not.toHaveProperty('ordens');
  });

  it('allows an employee to create a client', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent({
      perfil: 'FUNCIONARIO',
    });
    const response = await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createClientBody({
          nome: 'João Funcionário',
          documento: '04.252.011/0001-10',
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedClient(response);

    expect(response.body).toMatchObject({
      nome: 'João Funcionário',
      documento: '04252011000110',
      ativo: true,
    });
  });

  it('normalizes client creation input before persisting it', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createClientBody({
          nome: '  Maria Normalizada  ',
          telefone: '+55 (11) 99999-9999',
          documento: '529.982.247-25',
          email: '   ',
          cep: '01001-000',
          logradouro: '  Praça da Sé  ',
          numero: '  S/N  ',
          complemento: '   ',
          bairro: '  Sé  ',
          cidade: '  São Paulo  ',
          uf: ' sp ',
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedClient(response);

    expect(response.body).toMatchObject({
      nome: 'Maria Normalizada',
      telefone: '11999999999',
      documento: '52998224725',
      email: null,
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: 'S/N',
      complemento: null,
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
    });
  });

  it('accepts a valid CNPJ and stores only its digits', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createClientBody({
          nome: 'Empresa Válida',
          documento: '04.252.011/0001-10',
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedClient(response);

    expect(response.body.documento).toBe('04252011000110');
  });

  it('allows multiple clients without a document', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent();
    const firstResponse = await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createClientBody({
          nome: 'Cliente Sem Documento 1',
          documento: ' .-/',
        }),
      )
      .expect(HttpStatus.CREATED);
    const secondResponse = await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createClientBody({
          nome: 'Cliente Sem Documento 2',
          documento: undefined,
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedClient(firstResponse);
    trackCreatedClient(secondResponse);

    expect(firstResponse.body.documento).toBeNull();
    expect(secondResponse.body.documento).toBeNull();
  });

  it('returns CLIENT_DOCUMENT_ALREADY_EXISTS from the database unique constraint', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent();
    const firstResponse = await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(createClientBody({ nome: 'Documento Único' }))
      .expect(HttpStatus.CREATED);
    trackCreatedClient(firstResponse);

    await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(createClientBody({ nome: 'Documento Duplicado' }))
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'CLIENT_DOCUMENT_ALREADY_EXISTS',
        message: 'Client document already exists',
      });
  });

  it.each([
    ['invalid CPF', { documento: '529.982.247-24' }],
    ['invalid CNPJ', { documento: '04.252.011/0001-11' }],
    ['repeated document digits', { documento: '111.111.111-11' }],
    ['name shorter than two characters', { nome: ' A ' }],
    ['name longer than 120 characters', { nome: 'a'.repeat(121) }],
    ['invalid phone', { telefone: '119999999' }],
    ['invalid postal code', { cep: '01001-00' }],
    ['invalid UF', { uf: 'SPA' }],
    ['empty street', { logradouro: '   ' }],
    ['empty number', { numero: '   ' }],
    ['empty neighborhood', { bairro: '   ' }],
    ['empty city', { cidade: '   ' }],
    ['invalid email', { email: 'email-inválido' }],
  ])('rejects %s', async (_description, overrides) => {
    const { agent, csrfToken } = await createAuthenticatedAgent();

    await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(createClientBody(overrides))
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
        expect(body.details).toEqual(expect.any(Array));
      });
  });

  it('requires a session to create a client', async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    sessionIds.push(getSessionId(csrfResponse.headers['set-cookie']?.[0]));

    await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken as string)
      .send(createClientBody())
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });
  });

  it('requires first access password completion to create a client', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent({
      deveAlterarSenha: true,
    });

    await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send(createClientBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });
  });

  it('requires CSRF to create a client', async () => {
    const { agent } = await createAuthenticatedAgent();

    await agent
      .post('/clients')
      .send(createClientBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
  });

  it.each([
    ['ativo', false],
    ['status', 'inactive'],
    ['id', crypto.randomUUID()],
    ['criadoEm', new Date().toISOString()],
    ['campoInesperado', 'valor'],
  ])('rejects administrative or unexpected field %s', async (field, value) => {
    const { agent, csrfToken } = await createAuthenticatedAgent();

    await agent
      .post('/clients')
      .set('X-CSRF-Token', csrfToken)
      .send({ ...createClientBody(), [field]: value })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it('returns only active clients by default and only list DTO fields', async () => {
    const { agent } = await createAuthenticatedAgent();
    const activeClient = await createClientFixture({ nome: 'Cliente Ativo' });
    await createClientFixture({ nome: 'Cliente Inativo', ativo: false });

    const response = await agent.get('/clients').expect(HttpStatus.OK);

    expect(response.body).toEqual([
      {
        id: activeClient.id,
        nome: activeClient.nome,
        telefone: activeClient.telefone,
        documento: activeClient.documento,
        ativo: true,
      },
    ]);
    expect(Object.keys(response.body[0]).sort()).toEqual([
      'ativo',
      'documento',
      'id',
      'nome',
      'telefone',
    ]);
  });

  it('filters explicitly by active status', async () => {
    const { agent } = await createAuthenticatedAgent();
    const activeClient = await createClientFixture({ nome: 'Cliente Ativo' });
    await createClientFixture({ nome: 'Cliente Inativo', ativo: false });

    await agent
      .get('/clients?status=active')
      .expect(HttpStatus.OK)
      .expect([
        {
          id: activeClient.id,
          nome: activeClient.nome,
          telefone: activeClient.telefone,
          documento: activeClient.documento,
          ativo: true,
        },
      ]);
  });

  it('filters explicitly by inactive status', async () => {
    const { agent } = await createAuthenticatedAgent();
    await createClientFixture({ nome: 'Cliente Ativo' });
    const inactiveClient = await createClientFixture({
      nome: 'Cliente Inativo',
      ativo: false,
    });

    await agent
      .get('/clients?status=inactive')
      .expect(HttpStatus.OK)
      .expect([
        {
          id: inactiveClient.id,
          nome: inactiveClient.nome,
          telefone: inactiveClient.telefone,
          documento: inactiveClient.documento,
          ativo: false,
        },
      ]);
  });

  it('returns active and inactive clients when status is all', async () => {
    const { agent } = await createAuthenticatedAgent();
    const activeClient = await createClientFixture({ nome: 'Ana Ativa' });
    const inactiveClient = await createClientFixture({
      nome: 'Bruno Inativo',
      ativo: false,
    });

    const response = await agent
      .get('/clients?status=all')
      .expect(HttpStatus.OK);

    expect(response.body.map(({ id }) => id)).toEqual([
      activeClient.id,
      inactiveClient.id,
    ]);
  });

  it('rejects an invalid status with the global validation contract', async () => {
    const { agent } = await createAuthenticatedAgent();

    await agent
      .get('/clients?status=pending')
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
        expect(body.details).toEqual(expect.any(Array));
      });
  });

  it('searches client names case-insensitively after trimming the term', async () => {
    const { agent } = await createAuthenticatedAgent();
    const matchedClient = await createClientFixture({ nome: 'Maria da Silva' });
    await createClientFixture({ nome: 'Mariana Souza' });

    const response = await agent
      .get('/clients?search=%20mArIa%20DA%20sIlVa%20')
      .expect(HttpStatus.OK);

    expect(response.body.map(({ id }) => id)).toEqual([matchedClient.id]);
  });

  it('searches by a document stored as digits', async () => {
    const { agent } = await createAuthenticatedAgent();
    const matchedClient = await createClientFixture({
      nome: 'Documento CPF',
      documento: '12345678901',
    });

    const response = await agent
      .get('/clients?search=12345678901')
      .expect(HttpStatus.OK);

    expect(response.body.map(({ id }) => id)).toEqual([matchedClient.id]);
  });

  it('normalizes formatted CPF and CNPJ searches to find digit documents', async () => {
    const { agent } = await createAuthenticatedAgent();
    const cpfClient = await createClientFixture({
      nome: 'Documento CPF',
      documento: '12345678901',
    });
    const cnpjClient = await createClientFixture({
      nome: 'Documento CNPJ',
      documento: '12345678000199',
    });

    const cpfResponse = await agent
      .get('/clients?search=123.456.789-01')
      .expect(HttpStatus.OK);
    const cnpjResponse = await agent
      .get('/clients?search=12.345.678%2F0001-99')
      .expect(HttpStatus.OK);

    expect(cpfResponse.body.map(({ id }) => id)).toEqual([cpfClient.id]);
    expect(cnpjResponse.body.map(({ id }) => id)).toEqual([cnpjClient.id]);
  });

  it('returns an empty list when no client matches', async () => {
    const { agent } = await createAuthenticatedAgent();
    await createClientFixture({ nome: 'Cliente Existente' });

    await agent
      .get('/clients?search=inexistente')
      .expect(HttpStatus.OK)
      .expect([]);
  });

  it('orders client results by name and then id', async () => {
    const { agent } = await createAuthenticatedAgent();
    const ana = await createClientFixture({ nome: 'Ana' });
    const sameNameFirst = await createClientFixture({ nome: 'Mesmo Nome' });
    const sameNameSecond = await createClientFixture({ nome: 'Mesmo Nome' });
    const zoe = await createClientFixture({ nome: 'Zoe' });

    const response = await agent
      .get('/clients?status=all')
      .expect(HttpStatus.OK);
    const sameNameIds = [sameNameFirst.id, sameNameSecond.id].sort();

    expect(response.body.map(({ id }) => id)).toEqual([
      ana.id,
      ...sameNameIds,
      zoe.id,
    ]);
  });

  it('returns an active client detail with the complete DTO', async () => {
    const { agent } = await createAuthenticatedAgent();
    const client = await createClientFixture({
      nome: 'Cliente Completo',
      telefone: '11912345678',
      documento: '12345678901',
      email: 'cliente@example.test',
      cep: '01310930',
      logradouro: 'Avenida Paulista',
      numero: '1578',
      complemento: 'Conjunto 42',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
    });

    await agent
      .get(`/clients/${client.id}`)
      .expect(HttpStatus.OK)
      .expect({
        ...client,
        criadoEm: client.criadoEm.toISOString(),
      });
  });

  it('returns an inactive client detail', async () => {
    const { agent } = await createAuthenticatedAgent();
    const client = await createClientFixture({
      nome: 'Cliente Inativo',
      ativo: false,
    });

    const response = await agent
      .get(`/clients/${client.id}`)
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({ id: client.id, ativo: false });
  });

  it('rejects an invalid client id with the global validation contract', async () => {
    const { agent } = await createAuthenticatedAgent();

    await agent
      .get('/clients/not-a-uuid')
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it('returns CLIENT_NOT_FOUND for an unknown valid client id', async () => {
    const { agent } = await createAuthenticatedAgent();

    await agent
      .get(`/clients/${crypto.randomUUID()}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found',
      });
  });

  it('does not return orders when a client has them', async () => {
    const { agent, user } = await createAuthenticatedAgent();
    const client = await createClientFixture({ nome: 'Cliente com ordem' });
    const order = await database.ordemServico.create({
      data: {
        numero: `OS-${crypto.randomUUID()}`,
        descricao: 'Ordem usada apenas como fixture de leitura.',
        valor: '10.00',
        clienteId: client.id,
        responsavelId: user.funcionarioId,
      },
    });
    orderIds.push(order.id);

    const response = await agent
      .get(`/clients/${client.id}`)
      .expect(HttpStatus.OK);

    expect(response.body).not.toHaveProperty('ordens');
    expect(Object.keys(response.body).sort()).toEqual([
      'ativo',
      'bairro',
      'cep',
      'cidade',
      'complemento',
      'criadoEm',
      'documento',
      'email',
      'id',
      'logradouro',
      'nome',
      'numero',
      'telefone',
      'uf',
    ]);
  });

  it('requires a session to list clients', async () => {
    await request(app).get('/clients').expect(HttpStatus.UNAUTHORIZED).expect({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'AUTH_UNAUTHENTICATED',
      message: 'Authentication required',
    });
  });

  it('requires first access password completion', async () => {
    const { agent } = await createAuthenticatedAgent({
      deveAlterarSenha: true,
    });

    await agent.get('/clients').expect(HttpStatus.FORBIDDEN).expect({
      statusCode: HttpStatus.FORBIDDEN,
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
      message: 'Password change is required before accessing the application',
    });
  });

  it('allows an administrator to consult clients', async () => {
    const { agent } = await createAuthenticatedAgent({
      perfil: 'ADMINISTRADOR',
    });
    const client = await createClientFixture({
      nome: 'Cliente Administrativo',
    });

    await agent
      .get('/clients')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body.map(({ id }) => id)).toEqual([client.id]);
      });
  });

  it('allows an employee to consult clients', async () => {
    const { agent } = await createAuthenticatedAgent({ perfil: 'FUNCIONARIO' });
    const client = await createClientFixture({ nome: 'Cliente Funcionário' });

    await agent
      .get('/clients')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body.map(({ id }) => id)).toEqual([client.id]);
      });
  });

  it('documents client creation and read endpoints in OpenAPI', async () => {
    const response = await request(app)
      .get('/api/docs/openapi.json')
      .expect(HttpStatus.OK);
    const listOperation = response.body.paths['/clients'].get;
    const detailOperation = response.body.paths['/clients/{id}'].get;

    const createOperation = response.body.paths['/clients'].post;

    expect(Object.keys(response.body.paths['/clients']).sort()).toEqual([
      'get',
      'post',
    ]);
    expect(Object.keys(response.body.paths['/clients/{id}'])).toEqual(['get']);
    expect(listOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'status', in: 'query' }),
        expect.objectContaining({ name: 'search', in: 'query' }),
      ]),
    );
    expect(listOperation.responses).toHaveProperty('200');
    expect(listOperation.responses).toHaveProperty('400');
    expect(listOperation.responses).toHaveProperty('401');
    expect(listOperation.responses).toHaveProperty('403');
    expect(createOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      createOperation.requestBody.content['application/json'].schema,
    ).toMatchObject({
      additionalProperties: false,
      required: expect.arrayContaining([
        'nome',
        'telefone',
        'cep',
        'logradouro',
        'numero',
        'bairro',
        'cidade',
        'uf',
      ]),
      properties: expect.objectContaining({
        documento: expect.any(Object),
        email: expect.any(Object),
        complemento: expect.any(Object),
      }),
    });
    expect(createOperation.responses).toHaveProperty('201');
    expect(createOperation.responses).toHaveProperty('400');
    expect(createOperation.responses).toHaveProperty('401');
    expect(createOperation.responses).toHaveProperty('403');
    expect(createOperation.responses).toHaveProperty('409');
    expect(detailOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', in: 'path' }),
      ]),
    );
    expect(detailOperation.responses).toHaveProperty('200');
    expect(detailOperation.responses).toHaveProperty('400');
    expect(detailOperation.responses).toHaveProperty('401');
    expect(detailOperation.responses).toHaveProperty('403');
    expect(detailOperation.responses).toHaveProperty('404');
  });
});
