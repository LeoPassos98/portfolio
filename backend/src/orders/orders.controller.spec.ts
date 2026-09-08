import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { setupOpenApi } from '../common/openapi/openapi.setup.js';
import { DatabaseService } from '../database/database.service.js';
import {
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run order tests.');
}

type UserFixture = { userId: string; funcionarioId: string };
type OrderFixture = { id: string; numero: string };

function getSessionId(cookie: string | undefined): string {
  if (!cookie) throw new Error('Expected a session cookie.');
  const signed = decodeURIComponent(
    cookie.split(';', 1)[0]!.replace('connect.sid=', ''),
  );
  const id = signed.slice(2).split('.', 1)[0];
  if (!signed.startsWith('s:') || !id) throw new Error('Expected session id.');
  return id;
}

describe('OrdersController', () => {
  let app: Express;
  let database: DatabaseService;
  let nestApplication: INestApplication;
  let testingModule: TestingModule;
  let verificationPool: Pool;
  let counterValueBeforeTest = 0;
  const clientIds: string[] = [];
  const funcionarioIds: string[] = [];
  const historyIds: string[] = [];
  const orderIds: string[] = [];
  const sessionIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    nestApplication = testingModule.createNestApplication();
    const sessions = nestApplication.get(SessionStoreService);
    nestApplication.use(sessions.middleware);
    nestApplication.useGlobalFilters(new HttpExceptionFilter());
    nestApplication.enableCors(createCorsOptions('http://localhost:5173'));
    setupOpenApi(nestApplication);
    await nestApplication.init();
    app = nestApplication.getHttpAdapter().getInstance() as Express;
    database = nestApplication.get(DatabaseService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  beforeEach(async () => {
    const counter = await database.contadorOrdemServico.findUniqueOrThrow({
      where: { id: 1 },
      select: { ultimoNumero: true },
    });
    counterValueBeforeTest = counter.ultimoNumero;
  });

  afterEach(async () => {
    if (sessionIds.length)
      await verificationPool.query(
        'DELETE FROM "session" WHERE "sid" = ANY($1)',
        [sessionIds],
      );
    if (historyIds.length || orderIds.length)
      await database.historicoOrdemServico.deleteMany({
        where: {
          OR: [
            { id: { in: historyIds } },
            { ordemServicoId: { in: orderIds } },
          ],
        },
      });
    if (orderIds.length)
      await database.ordemServico.deleteMany({
        where: { id: { in: orderIds } },
      });
    if (clientIds.length)
      await database.cliente.deleteMany({ where: { id: { in: clientIds } } });
    if (userIds.length)
      await database.usuario.deleteMany({ where: { id: { in: userIds } } });
    if (funcionarioIds.length)
      await database.funcionario.deleteMany({
        where: { id: { in: funcionarioIds } },
      });
    await database.contadorOrdemServico.update({
      where: { id: 1 },
      data: { ultimoNumero: counterValueBeforeTest },
    });
    clientIds.length = 0;
    funcionarioIds.length = 0;
    historyIds.length = 0;
    orderIds.length = 0;
    sessionIds.length = 0;
    userIds.length = 0;
  });

  afterAll(async () => {
    await verificationPool.end();
    await nestApplication.close();
  });

  async function createUserFixture(
    options: {
      perfil?: 'ADMINISTRADOR' | 'FUNCIONARIO';
      deveAlterarSenha?: boolean;
      ativo?: boolean;
      funcionarioAtivo?: boolean;
      nome?: string;
    } = {},
  ): Promise<UserFixture> {
    const suffix = crypto.randomUUID();
    const funcionario = await database.funcionario.create({
      data: {
        nome: options.nome ?? `Funcionário ${suffix}`,
        telefone: '11999999999',
        email: `funcionario-${suffix}@example.test`,
        ativo: options.funcionarioAtivo ?? true,
      },
    });
    const usuario = await database.usuario.create({
      data: {
        emailLogin: `login-${suffix}@example.test`,
        senhaHash: 'test-only-hash',
        perfil: options.perfil ?? 'FUNCIONARIO',
        ativo: options.ativo ?? true,
        deveAlterarSenha: options.deveAlterarSenha ?? false,
        funcionarioId: funcionario.id,
      },
    });
    funcionarioIds.push(funcionario.id);
    userIds.push(usuario.id);
    return { userId: usuario.id, funcionarioId: funcionario.id };
  }

  async function createAgent(
    options: Parameters<typeof createUserFixture>[0] = {},
  ) {
    const user = await createUserFixture(options);
    const agent = request.agent(app);
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    const sid = getSessionId(response.headers['set-cookie']?.[0]);
    sessionIds.push(sid);
    await verificationPool.query(
      'UPDATE "session" SET "sess" = jsonb_set("sess"::jsonb, \'{usuarioId}\', to_jsonb($2::text))::json WHERE "sid" = $1',
      [sid, user.userId],
    );
    return { agent, csrfToken: response.body.csrfToken as string, user };
  }

  async function createClientFixture(ativo = true) {
    const suffix = crypto.randomUUID();
    const client = await database.cliente.create({
      data: {
        nome: `Cliente ${suffix}`,
        telefone: '11988887777',
        cep: '01001000',
        logradouro: 'Praça da Sé',
        numero: '1',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
        ativo,
      },
    });
    clientIds.push(client.id);
    return client;
  }

  function createOrderBody(
    clienteId: string,
    responsavelId?: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      clienteId,
      ...(responsavelId ? { responsavelId } : {}),
      descricao: 'Descrição da ordem.',
      valor: '1250.99',
      ...overrides,
    };
  }

  function trackCreatedOrder(response: { body: { id: string } }): void {
    orderIds.push(response.body.id);
  }

  async function waitForBlockedOrderLock(tableName: string): Promise<void> {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const result = await verificationPool.query<{ blocked: boolean }>(
        `SELECT EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND wait_event_type = 'Lock'
            AND cardinality(pg_blocking_pids(pid)) > 0
            AND query LIKE '%' || $1 || '%'
        ) AS blocked`,
        [`FROM "${tableName}"`],
      );

      if (result.rows[0]?.blocked) return;

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for the ${tableName} row lock.`);
  }

  async function createOrderFixture(
    responsavelId: string,
    options: {
      numero?: string;
      clientName?: string;
      status?: StatusOrdemServico;
      visibilidade?: Visibilidade;
      valor?: string;
      descricao?: string;
      observacoes?: string | null;
      versao?: number;
      concluidoEm?: Date | null;
      canceladoEm?: Date | null;
      criadoEm?: Date;
    } = {},
  ): Promise<OrderFixture> {
    const suffix = crypto.randomUUID();
    const client = await database.cliente.create({
      data: {
        nome: options.clientName ?? `Cliente ${suffix}`,
        telefone: '11988887777',
        cep: '01001000',
        logradouro: 'Praça',
        numero: '1',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
      },
    });
    const order = await database.ordemServico.create({
      data: {
        numero: options.numero ?? `OS-${suffix}`,
        descricao: options.descricao ?? 'Descrição da ordem.',
        valor: options.valor ?? '123.40',
        observacoes:
          options.observacoes === undefined
            ? 'Observação.'
            : options.observacoes,
        status: options.status ?? StatusOrdemServico.AGUARDANDO,
        visibilidade: options.visibilidade ?? Visibilidade.PRIVADA,
        versao: options.versao ?? 1,
        concluidoEm: options.concluidoEm ?? null,
        canceladoEm: options.canceladoEm ?? null,
        ...(options.criadoEm ? { criadoEm: options.criadoEm } : {}),
        clienteId: client.id,
        responsavelId,
      },
    });
    clientIds.push(client.id);
    orderIds.push(order.id);
    return { id: order.id, numero: order.numero };
  }

  async function currentUpdateBody(
    orderId: string,
    overrides: Record<string, unknown> = {},
  ) {
    const order = await database.ordemServico.findUniqueOrThrow({
      where: { id: orderId },
    });

    return {
      versao: order.versao,
      descricao: order.descricao,
      valor: order.valor.toFixed(2),
      ...(order.observacoes === null ? {} : { observacoes: order.observacoes }),
      status: order.status,
      visibilidade: order.visibilidade,
      ...overrides,
    };
  }

  async function createHistoryFixture(
    orderId: string,
    responsavelId: string,
    alteradoPorUsuarioId: string,
    options: {
      versao: number;
      descricao?: string;
      valor?: string;
      observacoes?: string | null;
      status?: StatusOrdemServico;
      visibilidade?: Visibilidade;
      concluidoEm?: Date | null;
      canceladoEm?: Date | null;
      snapshotEm?: Date;
    },
  ) {
    const history = await database.historicoOrdemServico.create({
      data: {
        versao: options.versao,
        descricao:
          options.descricao ?? `Descrição da versão ${options.versao}.`,
        valor: options.valor ?? '123.40',
        observacoes: options.observacoes ?? null,
        status: options.status ?? StatusOrdemServico.AGUARDANDO,
        visibilidade: options.visibilidade ?? Visibilidade.PRIVADA,
        concluidoEm: options.concluidoEm ?? null,
        canceladoEm: options.canceladoEm ?? null,
        snapshotEm: options.snapshotEm,
        ordemServicoId: orderId,
        responsavelId,
        alteradoPorUsuarioId,
      },
    });
    historyIds.push(history.id);
    return history;
  }

  it('creates a private order for an administrator with normalized fields and explicit initial state', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const responsible = await createUserFixture();
    const client = await createClientFixture();
    const response = await administrator.agent
      .post('/orders')
      .set('X-CSRF-Token', administrator.csrfToken)
      .send(
        createOrderBody(client.id, responsible.funcionarioId, {
          descricao: '  Revisar equipamento  ',
          valor: '0',
          observacoes: '   ',
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedOrder(response);

    expect(response.body).toMatchObject({
      numero: expect.stringMatching(/^OS-\d{6}$/),
      descricao: 'Revisar equipamento',
      valor: '0.00',
      observacoes: null,
      status: StatusOrdemServico.AGUARDANDO,
      visibilidade: Visibilidade.PRIVADA,
      versao: 1,
      concluidoEm: null,
      canceladoEm: null,
      cliente: { id: client.id, nome: client.nome },
      responsavel: { id: responsible.funcionarioId },
    });
    expect(response.body.criadoEm).toEqual(expect.any(String));
    expect(response.body.atualizadoEm).toEqual(expect.any(String));

    const persisted = await database.ordemServico.findUniqueOrThrow({
      where: { id: response.body.id as string },
      include: { historicos: true },
    });
    expect(persisted).toMatchObject({
      status: StatusOrdemServico.AGUARDANDO,
      visibilidade: Visibilidade.PRIVADA,
      versao: 1,
      concluidoEm: null,
      canceladoEm: null,
      clienteId: client.id,
      responsavelId: responsible.funcionarioId,
    });
    expect(persisted.historicos).toEqual([]);
  });

  it('lets an administrator create a public order for an active employee', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const responsible = await createUserFixture();
    const client = await createClientFixture();
    const response = await administrator.agent
      .post('/orders')
      .set('X-CSRF-Token', administrator.csrfToken)
      .send(
        createOrderBody(client.id, responsible.funcionarioId, {
          visibilidade: 'PUBLICA',
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedOrder(response);

    expect(response.body).toMatchObject({
      visibilidade: Visibilidade.PUBLICA,
      responsavel: { id: responsible.funcionarioId },
    });
  });

  it('requires an administrator to select a responsible employee', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const client = await createClientFixture();

    await administrator.agent
      .post('/orders')
      .set('X-CSRF-Token', administrator.csrfToken)
      .send(createOrderBody(client.id))
      .expect(HttpStatus.BAD_REQUEST)
      .expect({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'ORDER_RESPONSIBLE_REQUIRED',
        message: 'An administrator must select a responsible employee',
      });
  });

  it.each([
    [
      'inexistente',
      '00000000-0000-0000-0000-000000000000',
      404,
      'ORDER_RESPONSIBLE_NOT_FOUND',
    ],
    ['inativo', null, 409, 'ORDER_RESPONSIBLE_INACTIVE'],
  ] as const)(
    'rejects an %s responsible employee selected by an administrator',
    async (_label, missingId, status, code) => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const inactive = missingId
        ? null
        : await createUserFixture({ funcionarioAtivo: false });
      const client = await createClientFixture();
      const counterBefore =
        await database.contadorOrdemServico.findUniqueOrThrow({
          where: { id: 1 },
        });

      await administrator.agent
        .post('/orders')
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(createOrderBody(client.id, missingId ?? inactive!.funcionarioId))
        .expect(status)
        .expect(({ body }) => expect(body.code).toBe(code));

      const counterAfter =
        await database.contadorOrdemServico.findUniqueOrThrow({
          where: { id: 1 },
        });
      expect(counterAfter.ultimoNumero).toBe(counterBefore.ultimoNumero);
    },
  );

  it('assigns an employee order to the authenticated employee and ignores a third-party responsible id', async () => {
    const employee = await createAgent();
    const other = await createUserFixture();
    const client = await createClientFixture();
    const response = await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(createOrderBody(client.id, other.funcionarioId))
      .expect(HttpStatus.CREATED);
    trackCreatedOrder(response);

    expect(response.body).toMatchObject({
      visibilidade: Visibilidade.PRIVADA,
      responsavel: { id: employee.user.funcionarioId },
    });
    expect(response.body.responsavel.id).not.toBe(other.funcionarioId);
  });

  it('lets an employee choose public visibility while remaining the responsible employee', async () => {
    const employee = await createAgent();
    const client = await createClientFixture();
    const response = await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(createOrderBody(client.id, undefined, { visibilidade: 'PUBLICA' }))
      .expect(HttpStatus.CREATED);
    trackCreatedOrder(response);

    expect(response.body).toMatchObject({
      visibilidade: Visibilidade.PUBLICA,
      responsavel: { id: employee.user.funcionarioId },
    });
  });

  it('rejects creation by an authenticated employee whose employee record is inactive', async () => {
    const employee = await createAgent({ funcionarioAtivo: false });
    const client = await createClientFixture();

    await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(createOrderBody(client.id))
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('ORDER_RESPONSIBLE_INACTIVE'),
      );
  });

  it.each([
    [
      'inexistente',
      '00000000-0000-0000-0000-000000000000',
      404,
      'ORDER_CLIENT_NOT_FOUND',
    ],
    ['inativo', null, 409, 'ORDER_CLIENT_INACTIVE'],
  ] as const)(
    'rejects an %s client without consuming a number',
    async (_label, missingId, status, code) => {
      const employee = await createAgent();
      const inactive = missingId ? null : await createClientFixture(false);
      const counterBefore =
        await database.contadorOrdemServico.findUniqueOrThrow({
          where: { id: 1 },
        });

      const response = await employee.agent
        .post('/orders')
        .set('X-CSRF-Token', employee.csrfToken)
        .send(createOrderBody(missingId ?? inactive!.id))
        .expect(status);
      expect(response.body).toMatchObject({ code });
      if (code === 'ORDER_CLIENT_INACTIVE') {
        expect(response.body.message).toBe(
          'Client must be active to create a service order',
        );
      }

      const counterAfter =
        await database.contadorOrdemServico.findUniqueOrThrow({
          where: { id: 1 },
        });
      expect(counterAfter.ultimoNumero).toBe(counterBefore.ultimoNumero);
    },
  );

  it('accepts description and notes boundaries and the Decimal(12,2) maximum', async () => {
    const employee = await createAgent();
    const client = await createClientFixture();
    const minimum = await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(
        createOrderBody(client.id, undefined, {
          descricao: 'abc',
          valor: '0.00',
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedOrder(minimum);
    const maximum = await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(
        createOrderBody(client.id, undefined, {
          descricao: 'd'.repeat(2000),
          observacoes: `  ${'o'.repeat(4000)}  `,
          valor: '9999999999.99',
        }),
      )
      .expect(HttpStatus.CREATED);
    trackCreatedOrder(maximum);

    expect(minimum.body).toMatchObject({ descricao: 'abc', valor: '0.00' });
    expect(maximum.body).toMatchObject({
      descricao: 'd'.repeat(2000),
      observacoes: 'o'.repeat(4000),
      valor: '9999999999.99',
    });
  });

  it.each([
    ['0', '0.00'],
    ['0.00', '0.00'],
    ['15.5', '15.50'],
    ['1250.99', '1250.99'],
  ] as const)('accepts canonical decimal %s', async (valor, expected) => {
    const employee = await createAgent();
    const client = await createClientFixture();
    const response = await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(createOrderBody(client.id, undefined, { valor }))
      .expect(HttpStatus.CREATED);
    trackCreatedOrder(response);

    expect(response.body.valor).toBe(expected);
  });

  it.each([
    ['-1'],
    ['NaN'],
    ['Infinity'],
    ['1e3'],
    ['1.234'],
    ['10000000000'],
    [15.5],
  ])('rejects invalid monetary value %s', async (valor) => {
    const employee = await createAgent();
    const client = await createClientFixture();

    await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(createOrderBody(client.id, undefined, { valor }))
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));
  });

  it.each([
    [{ descricao: 'ab' }],
    [{ descricao: 'd'.repeat(2001) }],
    [{ observacoes: 'o'.repeat(4001) }],
    [{ visibilidade: 'INTERNA' }],
  ])('rejects invalid order fields %#', async (overrides) => {
    const employee = await createAgent();
    const client = await createClientFixture();

    await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(createOrderBody(client.id, undefined, overrides))
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));
  });

  it('rejects every server-owned field in the creation body', async () => {
    const employee = await createAgent();
    const client = await createClientFixture();
    const serverOwnedFields = [
      'numero',
      'status',
      'versao',
      'criadoEm',
      'atualizadoEm',
      'concluidoEm',
      'canceladoEm',
    ];

    for (const field of serverOwnedFields) {
      await employee.agent
        .post('/orders')
        .set('X-CSRF-Token', employee.csrfToken)
        .send(createOrderBody(client.id, undefined, { [field]: 'forbidden' }))
        .expect(HttpStatus.BAD_REQUEST)
        .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));
    }
  });

  it('creates concurrent orders with a unique contiguous sequence from the persistent counter', async () => {
    const employee = await createAgent();
    const client = await createClientFixture();
    const counter = await database.contadorOrdemServico.findUniqueOrThrow({
      where: { id: 1 },
    });
    const requestCount = 12;

    const responses = await Promise.all(
      Array.from({ length: requestCount }, (_, index) =>
        employee.agent
          .post('/orders')
          .set('X-CSRF-Token', employee.csrfToken)
          .send(
            createOrderBody(client.id, undefined, {
              descricao: `Ordem concorrente ${index}.`,
            }),
          )
          .expect(HttpStatus.CREATED),
      ),
    );
    responses.forEach(trackCreatedOrder);

    const numbers = responses.map(({ body }) => body.numero as string).sort();
    expect(new Set(numbers).size).toBe(requestCount);
    expect(numbers.every((number) => /^OS-\d{6}$/.test(number))).toBe(true);
    expect(numbers).toEqual(
      Array.from(
        { length: requestCount },
        (_, index) =>
          `OS-${String(counter.ultimoNumero + index + 1).padStart(6, '0')}`,
      ),
    );

    const persistedCount = await database.ordemServico.count({
      where: { id: { in: responses.map(({ body }) => body.id as string) } },
    });
    expect(persistedCount).toBe(requestCount);
    const updatedCounter =
      await database.contadorOrdemServico.findUniqueOrThrow({
        where: { id: 1 },
      });
    expect(updatedCounter.ultimoNumero).toBe(
      counter.ultimoNumero + requestCount,
    );
    const uniqueIndex = await verificationPool.query<{ indexdef: string }>(
      `SELECT indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'ordem_servico'
         AND indexname = 'ordem_servico_numero_key'`,
    );
    expect(uniqueIndex.rows[0]?.indexdef).toContain('UNIQUE INDEX');
  });

  it('observes a client deactivation that holds the row lock before creation validates it', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const responsible = await createUserFixture();
    const client = await createClientFixture();
    const blocker = await verificationPool.connect();
    let transactionOpen = false;

    try {
      await blocker.query('BEGIN');
      transactionOpen = true;
      await blocker.query(
        'UPDATE "cliente" SET "ativo" = false WHERE "id" = $1',
        [client.id],
      );
      const pendingCreation = administrator.agent
        .post('/orders')
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(createOrderBody(client.id, responsible.funcionarioId))
        .then((response) => response);

      await waitForBlockedOrderLock('cliente');
      await blocker.query('COMMIT');
      transactionOpen = false;
      const response = await pendingCreation;

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body.code).toBe('ORDER_CLIENT_INACTIVE');
      expect(
        await database.ordemServico.count({ where: { clienteId: client.id } }),
      ).toBe(0);
    } finally {
      if (transactionOpen) await blocker.query('ROLLBACK');
      blocker.release();
    }
  });

  it('observes a responsible deactivation that holds the row lock before creation validates it', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const responsible = await createUserFixture();
    const client = await createClientFixture();
    const blocker = await verificationPool.connect();
    let transactionOpen = false;

    try {
      await blocker.query('BEGIN');
      transactionOpen = true;
      await blocker.query(
        'UPDATE "funcionario" SET "ativo" = false WHERE "id" = $1',
        [responsible.funcionarioId],
      );
      const pendingCreation = administrator.agent
        .post('/orders')
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(createOrderBody(client.id, responsible.funcionarioId))
        .then((response) => response);

      await waitForBlockedOrderLock('funcionario');
      await blocker.query('COMMIT');
      transactionOpen = false;
      const response = await pendingCreation;

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body.code).toBe('ORDER_RESPONSIBLE_INACTIVE');
      expect(
        await database.ordemServico.count({
          where: { responsavelId: responsible.funcionarioId },
        }),
      ).toBe(0);
    } finally {
      if (transactionOpen) await blocker.query('ROLLBACK');
      blocker.release();
    }
  });

  it('protects creation with session, first access and CSRF', async () => {
    const client = await createClientFixture();
    const unauthenticated = request.agent(app);
    const csrf = await unauthenticated.get('/auth/csrf').expect(HttpStatus.OK);
    const sid = getSessionId(csrf.headers['set-cookie']?.[0]);
    sessionIds.push(sid);
    await unauthenticated
      .post('/orders')
      .set('X-CSRF-Token', csrf.body.csrfToken as string)
      .send(createOrderBody(client.id))
      .expect(HttpStatus.UNAUTHORIZED);

    const pending = await createAgent({ deveAlterarSenha: true });
    await pending.agent
      .post('/orders')
      .set('X-CSRF-Token', pending.csrfToken)
      .send(createOrderBody(client.id))
      .expect(HttpStatus.FORBIDDEN)
      .expect(({ body }) =>
        expect(body.code).toBe('AUTH_PASSWORD_CHANGE_REQUIRED'),
      );

    const employee = await createAgent();
    await employee.agent
      .post('/orders')
      .set('X-CSRF-Token', 'invalid-token')
      .send(createOrderBody(client.id))
      .expect(HttpStatus.FORBIDDEN)
      .expect(({ body }) => expect(body.code).toBe('CSRF_INVALID_TOKEN'));
  });

  it('documents order creation and its stable errors in OpenAPI', async () => {
    const response = await request(app)
      .get('/api/docs/openapi.json')
      .expect(HttpStatus.OK);
    const operation = response.body.paths['/orders'].post;

    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      operation.requestBody.content['application/json'].schema,
    ).toMatchObject({
      additionalProperties: false,
      required: ['clienteId', 'descricao', 'valor'],
      properties: expect.objectContaining({
        clienteId: expect.objectContaining({ format: 'uuid' }),
        responsavelId: expect.objectContaining({ format: 'uuid' }),
        valor: expect.objectContaining({ type: 'string' }),
        visibilidade: expect.objectContaining({
          enum: ['PRIVADA', 'PUBLICA'],
          default: 'PRIVADA',
        }),
      }),
    });
    expect(operation.responses).toHaveProperty('201');
    expect(operation.responses).toHaveProperty('400');
    expect(operation.responses).toHaveProperty('401');
    expect(operation.responses).toHaveProperty('403');
    expect(operation.responses).toHaveProperty('404');
    expect(operation.responses).toHaveProperty('409');
    expect(operation.responses['400'].description).toContain(
      'ORDER_RESPONSIBLE_REQUIRED',
    );
    expect(operation.responses['404'].description).toContain(
      'ORDER_CLIENT_NOT_FOUND',
    );
    expect(operation.responses['409'].description).toContain(
      'ORDER_CLIENT_INACTIVE',
    );
  });

  describe('PUT /orders/:id', () => {
    it.each([
      ['descrição', { descricao: 'Descrição atualizada.' }],
      ['valor', { valor: '9876.54' }],
      ['observações', { observacoes: '  Nova observação.  ' }],
      ['visibilidade', { visibilidade: Visibilidade.PUBLICA }],
    ])(
      'lets the responsible employee update %s on an open order',
      async (_, overrides) => {
        const employee = await createAgent();
        const order = await createOrderFixture(employee.user.funcionarioId);
        const response = await employee.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', employee.csrfToken)
          .send(await currentUpdateBody(order.id, overrides))
          .expect(HttpStatus.OK);

        expect(response.body.versao).toBe(2);
        if ('observacoes' in overrides) {
          expect(response.body.observacoes).toBe('Nova observação.');
        }
        expect(
          await database.historicoOrdemServico.count({
            where: { ordemServicoId: order.id },
          }),
        ).toBe(1);
      },
    );

    it('normalizes blank observations to null during update', async () => {
      const employee = await createAgent();
      const order = await createOrderFixture(employee.user.funcionarioId);

      const response = await employee.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', employee.csrfToken)
        .send(await currentUpdateBody(order.id, { observacoes: '   ' }))
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ observacoes: null, versao: 2 });
    });

    it.each([
      [StatusOrdemServico.AGUARDANDO, StatusOrdemServico.EM_ANDAMENTO],
      [StatusOrdemServico.EM_ANDAMENTO, StatusOrdemServico.AGUARDANDO],
      [StatusOrdemServico.AGUARDANDO, StatusOrdemServico.CONCLUIDO],
      [StatusOrdemServico.EM_ANDAMENTO, StatusOrdemServico.CANCELADO],
    ])(
      'lets the responsible employee transition %s to %s',
      async (currentStatus, nextStatus) => {
        const employee = await createAgent();
        const order = await createOrderFixture(employee.user.funcionarioId, {
          status: currentStatus,
        });
        const response = await employee.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', employee.csrfToken)
          .send(await currentUpdateBody(order.id, { status: nextStatus }))
          .expect(HttpStatus.OK);

        expect(response.body).toMatchObject({ status: nextStatus, versao: 2 });
        expect(response.body.concluidoEm).toEqual(
          nextStatus === StatusOrdemServico.CONCLUIDO
            ? expect.any(String)
            : null,
        );
        expect(response.body.canceladoEm).toEqual(
          nextStatus === StatusOrdemServico.CANCELADO
            ? expect.any(String)
            : null,
        );
      },
    );

    it('rejects a responsible change requested by an employee', async () => {
      const employee = await createAgent();
      const other = await createUserFixture();
      const order = await createOrderFixture(employee.user.funcionarioId);

      await employee.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', employee.csrfToken)
        .send(
          await currentUpdateBody(order.id, {
            responsavelId: other.funcionarioId,
          }),
        )
        .expect(HttpStatus.FORBIDDEN)
        .expect(({ body }) =>
          expect(body.code).toBe('ORDER_RESPONSIBLE_CHANGE_FORBIDDEN'),
        );

      const persisted = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
        include: { historicos: true },
      });
      expect(persisted).toMatchObject({
        responsavelId: employee.user.funcionarioId,
        versao: 1,
        historicos: [],
      });
    });

    it('forbids an employee from updating another employee public order', async () => {
      const employee = await createAgent();
      const other = await createUserFixture();
      const order = await createOrderFixture(other.funcionarioId, {
        visibilidade: Visibilidade.PUBLICA,
      });

      await employee.agent.get(`/orders/${order.id}`).expect(HttpStatus.OK);
      await employee.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', employee.csrfToken)
        .send(
          await currentUpdateBody(order.id, { descricao: 'Sem permissão.' }),
        )
        .expect(HttpStatus.FORBIDDEN)
        .expect(({ body }) => expect(body.code).toBe('ORDER_UPDATE_FORBIDDEN'));
    });

    it('does not reveal another employee private order during update', async () => {
      const employee = await createAgent();
      const other = await createUserFixture();
      const order = await createOrderFixture(other.funcionarioId);
      const body = await currentUpdateBody(order.id, {
        descricao: 'Sem acesso.',
      });
      const inaccessible = await employee.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', employee.csrfToken)
        .send(body)
        .expect(HttpStatus.NOT_FOUND);
      const absent = await employee.agent
        .put('/orders/00000000-0000-0000-0000-000000000000')
        .set('X-CSRF-Token', employee.csrfToken)
        .send(body)
        .expect(HttpStatus.NOT_FOUND);

      expect(inaccessible.body).toEqual(absent.body);
      expect(inaccessible.body.code).toBe('ORDER_NOT_FOUND');
    });

    it.each([StatusOrdemServico.CONCLUIDO, StatusOrdemServico.CANCELADO])(
      'rejects employee changes to an own terminal %s order',
      async (status) => {
        const employee = await createAgent();
        const order = await createOrderFixture(employee.user.funcionarioId, {
          status,
          concluidoEm:
            status === StatusOrdemServico.CONCLUIDO ? new Date() : null,
          canceladoEm:
            status === StatusOrdemServico.CANCELADO ? new Date() : null,
        });

        await employee.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', employee.csrfToken)
          .send(await currentUpdateBody(order.id, { descricao: 'Bloqueada.' }))
          .expect(HttpStatus.CONFLICT)
          .expect(({ body }) =>
            expect(body.code).toBe('ORDER_UPDATE_INVALID_FOR_STATE'),
          );

        expect(
          await database.historicoOrdemServico.count({
            where: { ordemServicoId: order.id },
          }),
        ).toBe(0);
        expect(
          await database.ordemServico.findUniqueOrThrow({
            where: { id: order.id },
          }),
        ).toMatchObject({ versao: 1, descricao: 'Descrição da ordem.' });
      },
    );

    it('updates every editable open-order field for an administrator and snapshots the old state', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const previousResponsible = await createUserFixture();
      const nextResponsible = await createUserFixture();
      const order = await createOrderFixture(previousResponsible.funcionarioId);
      const before = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
      });
      const response = await administrator.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(
          await currentUpdateBody(order.id, {
            descricao: '  Estado administrativo novo.  ',
            valor: '456.7',
            observacoes: '  Observação nova.  ',
            status: StatusOrdemServico.EM_ANDAMENTO,
            visibilidade: Visibilidade.PUBLICA,
            responsavelId: nextResponsible.funcionarioId,
          }),
        )
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        descricao: 'Estado administrativo novo.',
        valor: '456.70',
        observacoes: 'Observação nova.',
        status: StatusOrdemServico.EM_ANDAMENTO,
        visibilidade: Visibilidade.PUBLICA,
        versao: 2,
        responsavel: { id: nextResponsible.funcionarioId },
      });
      expect(new Date(response.body.atualizadoEm).getTime()).toBeGreaterThan(
        before.atualizadoEm.getTime(),
      );
      const snapshot = await database.historicoOrdemServico.findFirstOrThrow({
        where: { ordemServicoId: order.id },
      });
      expect(snapshot).toMatchObject({
        versao: 1,
        descricao: 'Descrição da ordem.',
        observacoes: 'Observação.',
        status: StatusOrdemServico.AGUARDANDO,
        visibilidade: Visibilidade.PRIVADA,
        responsavelId: previousResponsible.funcionarioId,
        concluidoEm: null,
        canceladoEm: null,
        alteradoPorUsuarioId: administrator.user.userId,
      });
      expect(snapshot.valor.toFixed(2)).toBe('123.40');

      const history = await administrator.agent
        .get(`/orders/${order.id}/history`)
        .expect(HttpStatus.OK);
      expect(history.body).toHaveLength(1);
      expect(history.body[0]).toMatchObject({
        versao: 1,
        responsavel: { id: previousResponsible.funcionarioId },
        alteradoPor: { id: administrator.user.userId },
      });
    });

    it.each([
      [
        'inexistente',
        '00000000-0000-0000-0000-000000000000',
        HttpStatus.NOT_FOUND,
        'ORDER_RESPONSIBLE_NOT_FOUND',
      ],
      ['inativo', null, HttpStatus.CONFLICT, 'ORDER_RESPONSIBLE_INACTIVE'],
    ] as const)(
      'rejects an %s new responsible employee without changing the order',
      async (_label, missingId, status, code) => {
        const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
        const previousResponsible = await createUserFixture();
        const inactive = missingId
          ? null
          : await createUserFixture({ funcionarioAtivo: false });
        const order = await createOrderFixture(
          previousResponsible.funcionarioId,
        );

        await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(
            await currentUpdateBody(order.id, {
              responsavelId: missingId ?? inactive!.funcionarioId,
            }),
          )
          .expect(status)
          .expect(({ body }) => expect(body.code).toBe(code));

        const persisted = await database.ordemServico.findUniqueOrThrow({
          where: { id: order.id },
          include: { historicos: true },
        });
        expect(persisted).toMatchObject({
          responsavelId: previousResponsible.funcionarioId,
          versao: 1,
          historicos: [],
        });
      },
    );

    it('lets an administrator correct a completed order without replacing its completion timestamp', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const completedAt = new Date('2026-09-08T10:00:00.000Z');
      const order = await createOrderFixture(responsible.funcionarioId, {
        status: StatusOrdemServico.CONCLUIDO,
        concluidoEm: completedAt,
      });
      const response = await administrator.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(
          await currentUpdateBody(order.id, {
            descricao: 'Correção administrativa.',
            valor: '222.22',
            observacoes: 'Correção de observação.',
            visibilidade: Visibilidade.PUBLICA,
          }),
        )
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        status: StatusOrdemServico.CONCLUIDO,
        concluidoEm: completedAt.toISOString(),
        canceladoEm: null,
        responsavel: { id: responsible.funcionarioId },
        versao: 2,
      });
      const snapshot = await database.historicoOrdemServico.findFirstOrThrow({
        where: { ordemServicoId: order.id },
      });
      expect(snapshot.concluidoEm).toEqual(completedAt);
      expect(snapshot.canceladoEm).toBeNull();
    });

    it.each([StatusOrdemServico.AGUARDANDO, StatusOrdemServico.EM_ANDAMENTO])(
      'lets an administrator reopen a completed order to %s',
      async (status) => {
        const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
        const responsible = await createUserFixture();
        const completedAt = new Date('2026-09-08T11:00:00.000Z');
        const order = await createOrderFixture(responsible.funcionarioId, {
          status: StatusOrdemServico.CONCLUIDO,
          concluidoEm: completedAt,
        });
        const response = await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(await currentUpdateBody(order.id, { status }))
          .expect(HttpStatus.OK);

        expect(response.body).toMatchObject({
          status,
          concluidoEm: null,
          canceladoEm: null,
          versao: 2,
        });
        const snapshot = await database.historicoOrdemServico.findFirstOrThrow({
          where: { ordemServicoId: order.id },
        });
        expect(snapshot.concluidoEm).toEqual(completedAt);
      },
    );

    it.each([
      ['cancelar diretamente', { status: StatusOrdemServico.CANCELADO }],
      [
        'trocar responsável ao reabrir',
        { status: StatusOrdemServico.AGUARDANDO },
      ],
    ])(
      'rejects an administrator trying to %s a completed order',
      async (label, overrides) => {
        const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
        const responsible = await createUserFixture();
        const other = await createUserFixture();
        const order = await createOrderFixture(responsible.funcionarioId, {
          status: StatusOrdemServico.CONCLUIDO,
          concluidoEm: new Date(),
        });
        const requestOverrides =
          label === 'trocar responsável ao reabrir'
            ? { ...overrides, responsavelId: other.funcionarioId }
            : overrides;

        await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(await currentUpdateBody(order.id, requestOverrides))
          .expect(HttpStatus.CONFLICT)
          .expect(({ body }) =>
            expect(body.code).toBe('ORDER_UPDATE_INVALID_FOR_STATE'),
          );
      },
    );

    it.each([StatusOrdemServico.AGUARDANDO, StatusOrdemServico.EM_ANDAMENTO])(
      'lets an administrator reopen a cancelled order to %s only',
      async (status) => {
        const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
        const responsible = await createUserFixture();
        const cancelledAt = new Date('2026-09-08T12:00:00.000Z');
        const order = await createOrderFixture(responsible.funcionarioId, {
          status: StatusOrdemServico.CANCELADO,
          canceladoEm: cancelledAt,
        });
        const response = await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(await currentUpdateBody(order.id, { status }))
          .expect(HttpStatus.OK);

        expect(response.body).toMatchObject({
          status,
          concluidoEm: null,
          canceladoEm: null,
          versao: 2,
        });
        const snapshot = await database.historicoOrdemServico.findFirstOrThrow({
          where: { ordemServicoId: order.id },
        });
        expect(snapshot.canceladoEm).toEqual(cancelledAt);
      },
    );

    it.each([
      ['descrição', { descricao: 'Mudança combinada.' }],
      ['valor', { valor: '999.99' }],
      ['observação', { observacoes: 'Mudança combinada.' }],
      ['visibilidade', { visibilidade: Visibilidade.PUBLICA }],
      ['responsável', { responsavelId: 'placeholder' }],
    ])(
      'rejects %s changes combined with reopening a cancelled order',
      async (_, fieldOverride) => {
        const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
        const responsible = await createUserFixture();
        const other = await createUserFixture();
        const order = await createOrderFixture(responsible.funcionarioId, {
          status: StatusOrdemServico.CANCELADO,
          canceladoEm: new Date(),
        });
        const override =
          fieldOverride.responsavelId === 'placeholder'
            ? { responsavelId: other.funcionarioId }
            : fieldOverride;

        await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(
            await currentUpdateBody(order.id, {
              status: StatusOrdemServico.AGUARDANDO,
              ...override,
            }),
          )
          .expect(HttpStatus.CONFLICT)
          .expect(({ body }) =>
            expect(body.code).toBe('ORDER_UPDATE_INVALID_FOR_STATE'),
          );

        expect(
          await database.historicoOrdemServico.count({
            where: { ordemServicoId: order.id },
          }),
        ).toBe(0);
      },
    );

    it('rejects keeping a cancelled order while changing data or moving it directly to completed', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId, {
        status: StatusOrdemServico.CANCELADO,
        canceladoEm: new Date(),
      });

      for (const overrides of [
        { descricao: 'Não pode.' },
        { status: StatusOrdemServico.CONCLUIDO },
      ]) {
        await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(await currentUpdateBody(order.id, overrides))
          .expect(HttpStatus.CONFLICT)
          .expect(({ body }) =>
            expect(body.code).toBe('ORDER_UPDATE_INVALID_FOR_STATE'),
          );
      }
    });

    it('returns an exact no-op without a snapshot, version increment, or updated timestamp', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);
      const before = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
      });
      const response = await administrator.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(
          await currentUpdateBody(order.id, {
            descricao: '  Descrição da ordem.  ',
            valor: '123.4',
            observacoes: '  Observação.  ',
            responsavelId: responsible.funcionarioId,
          }),
        )
        .expect(HttpStatus.OK);
      const after = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
      });

      expect(response.body).toMatchObject({ versao: 1 });
      expect(after.atualizadoEm).toEqual(before.atualizadoEm);
      expect(after.versao).toBe(1);
      expect(
        await database.historicoOrdemServico.count({
          where: { ordemServicoId: order.id },
        }),
      ).toBe(0);
    });

    it('rejects a sequential stale request without a second snapshot', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);
      await administrator.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(await currentUpdateBody(order.id, { descricao: 'Vencedora.' }))
        .expect(HttpStatus.OK);
      const staleBody = await currentUpdateBody(order.id, { versao: 1 });

      await administrator.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(staleBody)
        .expect(HttpStatus.CONFLICT)
        .expect(({ body }) => expect(body.code).toBe('ORDER_VERSION_CONFLICT'));

      const persisted = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
        include: { historicos: true },
      });
      expect(persisted).toMatchObject({
        descricao: 'Vencedora.',
        versao: 2,
      });
      expect(persisted.historicos).toHaveLength(1);
    });

    it('allows exactly one of two concurrent updates based on the same version', async () => {
      const firstAdministrator = await createAgent({
        perfil: 'ADMINISTRADOR',
      });
      const secondAdministrator = await createAgent({
        perfil: 'ADMINISTRADOR',
      });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);
      const baseBody = await currentUpdateBody(order.id);
      const [first, second] = await Promise.all([
        firstAdministrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', firstAdministrator.csrfToken)
          .send({ ...baseBody, descricao: 'Concorrente A.' }),
        secondAdministrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', secondAdministrator.csrfToken)
          .send({ ...baseBody, descricao: 'Concorrente B.' }),
      ]);

      expect([first.status, second.status].sort()).toEqual([
        HttpStatus.OK,
        HttpStatus.CONFLICT,
      ]);
      const winner = first.status === HttpStatus.OK ? first : second;
      const loser = first.status === HttpStatus.CONFLICT ? first : second;
      expect(loser.body.code).toBe('ORDER_VERSION_CONFLICT');
      const persisted = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
        include: { historicos: true },
      });
      expect(persisted).toMatchObject({
        descricao: winner.body.descricao,
        versao: 2,
      });
      expect(persisted.historicos).toHaveLength(1);
      expect(persisted.historicos[0]).toMatchObject({
        versao: 1,
        descricao: 'Descrição da ordem.',
      });
      expect(persisted.descricao).not.toBe(
        loser === first ? 'Concorrente A.' : 'Concorrente B.',
      );
    });

    it('appends exact snapshots across sequential versions', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);
      const changes = [
        { descricao: 'Versão dois.' },
        { valor: '200.25' },
        { status: StatusOrdemServico.EM_ANDAMENTO },
      ];

      for (const change of changes) {
        await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(await currentUpdateBody(order.id, change))
          .expect(HttpStatus.OK);
      }

      const persisted = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
        include: { historicos: { orderBy: { versao: 'asc' } } },
      });
      expect(persisted.versao).toBe(4);
      expect(persisted.historicos.map(({ versao }) => versao)).toEqual([
        1, 2, 3,
      ]);
      expect(persisted.historicos[0]).toMatchObject({
        descricao: 'Descrição da ordem.',
        status: StatusOrdemServico.AGUARDANDO,
      });
      expect(persisted.historicos[0]!.valor.toFixed(2)).toBe('123.40');
      expect(persisted.historicos[1]!.descricao).toBe('Versão dois.');
      expect(persisted.historicos[1]!.valor.toFixed(2)).toBe('123.40');
      expect(persisted.historicos[2]!.valor.toFixed(2)).toBe('200.25');
      expect(persisted.historicos[2]!.status).toBe(
        StatusOrdemServico.AGUARDANDO,
      );
    });

    it('rolls back the snapshot when the conditioned update fails before commit', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);
      const functionName = 'test_reject_order_update';
      const triggerName = 'test_reject_order_update_trigger';

      try {
        await verificationPool.query(
          `CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger AS $$
         BEGIN
           IF NEW.descricao = 'Forçar rollback transacional.' THEN
             RAISE EXCEPTION 'deterministic test rejection';
           END IF;
           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql`,
        );
        await verificationPool.query(
          `CREATE TRIGGER ${triggerName}
         BEFORE UPDATE ON "ordem_servico"
         FOR EACH ROW EXECUTE FUNCTION ${functionName}()`,
        );

        await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(
            await currentUpdateBody(order.id, {
              descricao: 'Forçar rollback transacional.',
            }),
          )
          .expect(HttpStatus.INTERNAL_SERVER_ERROR);
      } finally {
        await verificationPool.query(
          `DROP TRIGGER IF EXISTS ${triggerName} ON "ordem_servico"`,
        );
        await verificationPool.query(
          `DROP FUNCTION IF EXISTS ${functionName}()`,
        );
      }

      const persisted = await database.ordemServico.findUniqueOrThrow({
        where: { id: order.id },
        include: { historicos: true },
      });
      expect(persisted).toMatchObject({
        descricao: 'Descrição da ordem.',
        versao: 1,
        historicos: [],
      });
    });

    it('linearizes reassignment against concurrent responsible deactivation', async () => {
      const updateAdministrator = await createAgent({
        perfil: 'ADMINISTRADOR',
      });
      const statusAdministrator = await createAgent({
        perfil: 'ADMINISTRADOR',
      });
      const previousResponsible = await createUserFixture();
      const nextResponsible = await createUserFixture();
      const order = await createOrderFixture(previousResponsible.funcionarioId);
      const [updateResponse, deactivationResponse] = await Promise.all([
        updateAdministrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', updateAdministrator.csrfToken)
          .send(
            await currentUpdateBody(order.id, {
              responsavelId: nextResponsible.funcionarioId,
            }),
          ),
        statusAdministrator.agent
          .patch(`/employees/${nextResponsible.funcionarioId}/status`)
          .set('X-CSRF-Token', statusAdministrator.csrfToken)
          .send({ status: 'inactive' }),
      ]);
      const [persistedOrder, persistedResponsible] = await Promise.all([
        database.ordemServico.findUniqueOrThrow({
          where: { id: order.id },
          include: { historicos: true },
        }),
        database.funcionario.findUniqueOrThrow({
          where: { id: nextResponsible.funcionarioId },
        }),
      ]);

      if (updateResponse.status === HttpStatus.OK) {
        expect(deactivationResponse.status).toBe(HttpStatus.CONFLICT);
        expect(deactivationResponse.body.code).toBe(
          'EMPLOYEE_HAS_ACTIVE_ORDERS',
        );
        expect(persistedOrder).toMatchObject({
          responsavelId: nextResponsible.funcionarioId,
          versao: 2,
        });
        expect(persistedOrder.historicos).toHaveLength(1);
        expect(persistedResponsible.ativo).toBe(true);
      } else {
        expect(updateResponse.status).toBe(HttpStatus.CONFLICT);
        expect(updateResponse.body.code).toBe('ORDER_RESPONSIBLE_INACTIVE');
        expect(deactivationResponse.status).toBe(HttpStatus.OK);
        expect(persistedOrder).toMatchObject({
          responsavelId: previousResponsible.funcionarioId,
          versao: 1,
          historicos: [],
        });
        expect(persistedResponsible.ativo).toBe(false);
      }
    });

    it.each([
      [{ versao: 0 }],
      [{ versao: 1.5 }],
      [{ versao: '1' }],
      [{ descricao: 'ab' }],
      [{ valor: '1e3' }],
      [{ status: 'FINALIZADA' }],
      [{ visibilidade: 'INTERNA' }],
      [{ responsavelId: 'not-a-uuid' }],
    ])('rejects invalid update input %#', async (overrides) => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);

      await administrator.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(await currentUpdateBody(order.id, overrides))
        .expect(HttpStatus.BAD_REQUEST)
        .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));
    });

    it('rejects immutable and server-owned fields in the update body', async () => {
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);
      const forbiddenFields = [
        'clienteId',
        'numero',
        'criadoEm',
        'atualizadoEm',
        'concluidoEm',
        'canceladoEm',
      ];

      for (const field of forbiddenFields) {
        await administrator.agent
          .put(`/orders/${order.id}`)
          .set('X-CSRF-Token', administrator.csrfToken)
          .send(await currentUpdateBody(order.id, { [field]: 'forbidden' }))
          .expect(HttpStatus.BAD_REQUEST)
          .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));
      }
    });

    it('protects order updates with UUID validation, session, first access, and CSRF', async () => {
      const responsible = await createUserFixture();
      const order = await createOrderFixture(responsible.funcionarioId);
      const body = await currentUpdateBody(order.id);
      const unauthenticated = request.agent(app);
      const csrf = await unauthenticated
        .get('/auth/csrf')
        .expect(HttpStatus.OK);
      sessionIds.push(getSessionId(csrf.headers['set-cookie']?.[0]));
      await unauthenticated
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', csrf.body.csrfToken as string)
        .send(body)
        .expect(HttpStatus.UNAUTHORIZED);
      const pending = await createAgent({ deveAlterarSenha: true });
      await pending.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', pending.csrfToken)
        .send(body)
        .expect(HttpStatus.FORBIDDEN);
      const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
      await administrator.agent
        .put(`/orders/${order.id}`)
        .set('X-CSRF-Token', 'invalid')
        .send(body)
        .expect(HttpStatus.FORBIDDEN);
      await administrator.agent
        .put('/orders/not-a-uuid')
        .set('X-CSRF-Token', administrator.csrfToken)
        .send(body)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('documents atomic order updates and stable errors in OpenAPI', async () => {
      const response = await request(app)
        .get('/api/docs/openapi.json')
        .expect(HttpStatus.OK);
      const operation = response.body.paths['/orders/{id}'].put;

      expect(operation.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'id', in: 'path' }),
          expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
        ]),
      );
      expect(
        operation.requestBody.content['application/json'].schema,
      ).toMatchObject({
        additionalProperties: false,
        required: ['versao', 'descricao', 'valor', 'status', 'visibilidade'],
        properties: expect.objectContaining({
          versao: expect.objectContaining({ minimum: 1 }),
          responsavelId: expect.objectContaining({ format: 'uuid' }),
        }),
      });
      expect(operation.responses).toHaveProperty('200');
      expect(operation.responses['403'].description).toContain(
        'ORDER_UPDATE_FORBIDDEN',
      );
      expect(operation.responses['404'].description).toContain(
        'ORDER_RESPONSIBLE_NOT_FOUND',
      );
      expect(operation.responses['409'].description).toContain(
        'ORDER_VERSION_CONFLICT',
      );
    });
  });

  it('allows an administrator to list private and public orders and read either detail', async () => {
    const { agent, user } = await createAgent({ perfil: 'ADMINISTRADOR' });
    const privateOrder = await createOrderFixture(user.funcionarioId, {
      numero: 'OS-ADMIN-PRIVATE',
    });
    const publicOrder = await createOrderFixture(user.funcionarioId, {
      numero: 'OS-ADMIN-PUBLIC',
      visibilidade: Visibilidade.PUBLICA,
    });
    const list = await agent.get('/orders').expect(HttpStatus.OK);
    expect(list.body.map((order: { id: string }) => order.id)).toEqual(
      expect.arrayContaining([privateOrder.id, publicOrder.id]),
    );
    expect(
      list.body.find((order: { id: string }) => order.id === privateOrder.id),
    ).toMatchObject({
      valor: '123.40',
      versao: 1,
      cliente: expect.any(Object),
      responsavel: expect.any(Object),
    });
    for (const order of [privateOrder, publicOrder]) {
      await agent
        .get(`/orders/${order.id}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body).toMatchObject({
            id: order.id,
            descricao: 'Descrição da ordem.',
            valor: '123.40',
            versao: 1,
          });
          expect(response.body).not.toHaveProperty('historicos');
        });
    }
  });

  it('lets an employee read own private and public orders', async () => {
    const { agent, user } = await createAgent();
    const ownPrivate = await createOrderFixture(user.funcionarioId);
    const ownPublic = await createOrderFixture(user.funcionarioId, {
      visibilidade: Visibilidade.PUBLICA,
    });
    const list = await agent.get('/orders').expect(HttpStatus.OK);
    expect(list.body.map((order: { id: string }) => order.id)).toEqual(
      expect.arrayContaining([ownPrivate.id, ownPublic.id]),
    );
    await agent.get(`/orders/${ownPrivate.id}`).expect(HttpStatus.OK);
  });

  it('lets an employee read another employee public order but not private order', async () => {
    const { agent } = await createAgent();
    const other = await createUserFixture();
    const publicOrder = await createOrderFixture(other.funcionarioId, {
      visibilidade: Visibilidade.PUBLICA,
    });
    const privateOrder = await createOrderFixture(other.funcionarioId);
    const list = await agent.get('/orders').expect(HttpStatus.OK);
    expect(list.body.map((order: { id: string }) => order.id)).toContain(
      publicOrder.id,
    );
    expect(list.body.map((order: { id: string }) => order.id)).not.toContain(
      privateOrder.id,
    );
    await agent.get(`/orders/${publicOrder.id}`).expect(HttpStatus.OK);
    const inaccessible = await agent
      .get(`/orders/${privateOrder.id}`)
      .expect(HttpStatus.NOT_FOUND);
    const absent = await agent
      .get('/orders/00000000-0000-0000-0000-000000000000')
      .expect(HttpStatus.NOT_FOUND);
    expect(inaccessible.body).toEqual(absent.body);
    expect(inaccessible.body).toMatchObject({
      code: 'ORDER_NOT_FOUND',
      message: 'Service order not found',
    });
  });

  it('allows an administrator to read history from private and public orders', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const privateOrder = await createOrderFixture(
      administrator.user.funcionarioId,
    );
    const publicOrder = await createOrderFixture(
      administrator.user.funcionarioId,
      { visibilidade: Visibilidade.PUBLICA },
    );
    await createHistoryFixture(
      privateOrder.id,
      administrator.user.funcionarioId,
      administrator.user.userId,
      { versao: 1 },
    );
    await createHistoryFixture(
      publicOrder.id,
      administrator.user.funcionarioId,
      administrator.user.userId,
      { versao: 1 },
    );

    await administrator.agent
      .get(`/orders/${privateOrder.id}/history`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body).toHaveLength(1));
    await administrator.agent
      .get(`/orders/${publicOrder.id}/history`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body).toHaveLength(1));
  });

  it('allows an employee to read the history of an own private order', async () => {
    const employee = await createAgent();
    const order = await createOrderFixture(employee.user.funcionarioId);
    await createHistoryFixture(
      order.id,
      employee.user.funcionarioId,
      employee.user.userId,
      { versao: 1 },
    );

    await employee.agent
      .get(`/orders/${order.id}/history`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body).toHaveLength(1));
  });

  it('uses current visibility, not snapshot visibility, to authorize history', async () => {
    const employee = await createAgent();
    const other = await createUserFixture();
    const currentPrivate = await createOrderFixture(other.funcionarioId, {
      visibilidade: Visibilidade.PRIVADA,
    });
    const currentPublic = await createOrderFixture(other.funcionarioId, {
      visibilidade: Visibilidade.PUBLICA,
    });
    await createHistoryFixture(
      currentPrivate.id,
      other.funcionarioId,
      other.userId,
      { versao: 1, visibilidade: Visibilidade.PUBLICA },
    );
    await createHistoryFixture(
      currentPublic.id,
      other.funcionarioId,
      other.userId,
      { versao: 1, visibilidade: Visibilidade.PRIVADA },
    );

    const inaccessible = await employee.agent
      .get(`/orders/${currentPrivate.id}/history`)
      .expect(HttpStatus.NOT_FOUND);
    const absent = await employee.agent
      .get('/orders/00000000-0000-0000-0000-000000000000/history')
      .expect(HttpStatus.NOT_FOUND);
    expect(inaccessible.body).toEqual(absent.body);
    expect(inaccessible.body).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'ORDER_NOT_FOUND',
      message: 'Service order not found',
    });

    const accessible = await employee.agent
      .get(`/orders/${currentPublic.id}/history`)
      .expect(HttpStatus.OK);
    expect(accessible.body).toHaveLength(1);
    expect(accessible.body[0]).toMatchObject({
      visibilidade: Visibilidade.PRIVADA,
    });
  });

  it('returns deterministic, safe historical snapshots with their own responsible and author', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const previousResponsible = await createUserFixture();
    const order = await createOrderFixture(administrator.user.funcionarioId);
    const firstSnapshot = await createHistoryFixture(
      order.id,
      previousResponsible.funcionarioId,
      previousResponsible.userId,
      {
        versao: 1,
        descricao: 'Primeira descrição.',
        valor: '10',
        observacoes: null,
        status: StatusOrdemServico.CONCLUIDO,
        visibilidade: Visibilidade.PRIVADA,
        concluidoEm: new Date('2026-09-01T10:00:00.000Z'),
        canceladoEm: null,
        snapshotEm: new Date('2026-09-01T11:00:00.000Z'),
      },
    );
    const secondSnapshot = await createHistoryFixture(
      order.id,
      administrator.user.funcionarioId,
      administrator.user.userId,
      {
        versao: 2,
        descricao: 'Segunda descrição.',
        valor: '1000.5',
        observacoes: 'Observação histórica.',
        status: StatusOrdemServico.CANCELADO,
        visibilidade: Visibilidade.PUBLICA,
        concluidoEm: null,
        canceladoEm: new Date('2026-09-02T10:00:00.000Z'),
        snapshotEm: new Date('2026-09-02T11:00:00.000Z'),
      },
    );

    const response = await administrator.agent
      .get(`/orders/${order.id}/history`)
      .expect(HttpStatus.OK);
    expect(
      response.body.map((snapshot: { id: string }) => snapshot.id),
    ).toEqual([secondSnapshot.id, firstSnapshot.id]);
    expect(response.body[0]).toEqual({
      id: secondSnapshot.id,
      versao: 2,
      descricao: 'Segunda descrição.',
      valor: '1000.50',
      observacoes: 'Observação histórica.',
      status: StatusOrdemServico.CANCELADO,
      visibilidade: Visibilidade.PUBLICA,
      concluidoEm: null,
      canceladoEm: '2026-09-02T10:00:00.000Z',
      snapshotEm: '2026-09-02T11:00:00.000Z',
      responsavel: {
        id: administrator.user.funcionarioId,
        nome: expect.stringContaining('Funcionário'),
      },
      alteradoPor: {
        id: administrator.user.userId,
        nome: expect.stringContaining('Funcionário'),
      },
    });
    expect(response.body[1]).toMatchObject({
      id: firstSnapshot.id,
      valor: '10.00',
      observacoes: null,
      concluidoEm: '2026-09-01T10:00:00.000Z',
      canceladoEm: null,
      responsavel: { id: previousResponsible.funcionarioId },
      alteradoPor: { id: previousResponsible.userId },
    });
    expect(JSON.stringify(response.body)).not.toContain('senhaHash');
    expect(JSON.stringify(response.body)).not.toContain('emailLogin');
  });

  it('returns an empty history for an accessible order without snapshots', async () => {
    const employee = await createAgent();
    const order = await createOrderFixture(employee.user.funcionarioId);

    await employee.agent
      .get(`/orders/${order.id}/history`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body).toEqual([]));
  });

  it.each([
    ['all', StatusOrdemServico.AGUARDANDO, true],
    ['open', StatusOrdemServico.AGUARDANDO, true],
    ['open', StatusOrdemServico.CONCLUIDO, false],
    ['awaiting', StatusOrdemServico.AGUARDANDO, true],
    ['in-progress', StatusOrdemServico.EM_ANDAMENTO, true],
    ['completed', StatusOrdemServico.CONCLUIDO, true],
    ['cancelled', StatusOrdemServico.CANCELADO, true],
  ] as const)('filters status %s', async (filter, status, included) => {
    const { agent, user } = await createAgent();
    const order = await createOrderFixture(user.funcionarioId, { status });
    const response = await agent
      .get('/orders')
      .query({ status: filter })
      .expect(HttpStatus.OK);
    expect(
      response.body.map((item: { id: string }) => item.id).includes(order.id),
    ).toBe(included);
  });

  it('trims and searches by number or client name, combining search and status without widening scope', async () => {
    const { agent, user } = await createAgent();
    const other = await createUserFixture();
    const matching = await createOrderFixture(user.funcionarioId, {
      numero: 'OS-SEARCH-01',
      clientName: 'Acme Oficina',
      status: StatusOrdemServico.EM_ANDAMENTO,
    });
    const privateOther = await createOrderFixture(other.funcionarioId, {
      numero: 'OS-SEARCH-HIDDEN',
      clientName: 'Acme Oculta',
      status: StatusOrdemServico.EM_ANDAMENTO,
    });
    const byNumber = await agent
      .get('/orders')
      .query({ search: '  search-01  ' })
      .expect(HttpStatus.OK);
    expect(byNumber.body.map((item: { id: string }) => item.id)).toContain(
      matching.id,
    );
    const byClient = await agent
      .get('/orders')
      .query({ search: 'ACME OFICINA', status: 'in-progress' })
      .expect(HttpStatus.OK);
    expect(byClient.body.map((item: { id: string }) => item.id)).toContain(
      matching.id,
    );
    const hidden = await agent
      .get('/orders')
      .query({ search: 'Acme', status: 'open' })
      .expect(HttpStatus.OK);
    expect(hidden.body.map((item: { id: string }) => item.id)).not.toContain(
      privateOther.id,
    );
    const blank = await agent
      .get('/orders')
      .query({ search: '   ' })
      .expect(HttpStatus.OK);
    expect(blank.body.map((item: { id: string }) => item.id)).toContain(
      matching.id,
    );
  });

  it('filters an administrator list by responsible, status, and search', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const responsibleA = await createUserFixture();
    const responsibleB = await createUserFixture();
    const matching = await createOrderFixture(responsibleA.funcionarioId, {
      numero: 'OS-RESPONSIBLE-MATCH',
      clientName: 'Cliente Responsável',
      status: StatusOrdemServico.EM_ANDAMENTO,
    });
    const sameResponsibleWrongStatus = await createOrderFixture(
      responsibleA.funcionarioId,
      {
        numero: 'OS-RESPONSIBLE-COMPLETED',
        status: StatusOrdemServico.CONCLUIDO,
      },
    );
    const otherResponsible = await createOrderFixture(
      responsibleB.funcionarioId,
      {
        numero: 'OS-RESPONSIBLE-OTHER',
        clientName: 'Cliente Responsável',
        status: StatusOrdemServico.EM_ANDAMENTO,
      },
    );

    const onlyA = await administrator.agent
      .get('/orders')
      .query({ responsibleId: responsibleA.funcionarioId })
      .expect(HttpStatus.OK);
    expect(onlyA.body.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([matching.id, sameResponsibleWrongStatus.id]),
    );
    expect(onlyA.body.map((item: { id: string }) => item.id)).not.toContain(
      otherResponsible.id,
    );

    const combined = await administrator.agent
      .get('/orders')
      .query({
        responsibleId: responsibleA.funcionarioId,
        status: 'in-progress',
        search: 'responsável',
      })
      .expect(HttpStatus.OK);
    expect(combined.body.map((item: { id: string }) => item.id)).toEqual([
      matching.id,
    ]);
  });

  it('keeps an employee responsible filter inside the contextual visibility policy', async () => {
    const employeeA = await createAgent();
    const employeeB = await createUserFixture();
    const ownPrivate = await createOrderFixture(employeeA.user.funcionarioId, {
      numero: 'OS-A-PRIVATE',
      clientName: 'Escopo A',
    });
    const ownPublic = await createOrderFixture(employeeA.user.funcionarioId, {
      numero: 'OS-A-PUBLIC',
      clientName: 'Escopo A',
      visibilidade: Visibilidade.PUBLICA,
      status: StatusOrdemServico.EM_ANDAMENTO,
    });
    const publicB = await createOrderFixture(employeeB.funcionarioId, {
      numero: 'OS-B-PUBLIC',
      clientName: 'Escopo B',
      visibilidade: Visibilidade.PUBLICA,
      status: StatusOrdemServico.EM_ANDAMENTO,
    });
    const privateB = await createOrderFixture(employeeB.funcionarioId, {
      numero: 'OS-B-PRIVATE',
      clientName: 'Escopo B',
      status: StatusOrdemServico.EM_ANDAMENTO,
    });

    const own = await employeeA.agent
      .get('/orders')
      .query({ responsibleId: employeeA.user.funcionarioId })
      .expect(HttpStatus.OK);
    expect(own.body.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([ownPrivate.id, ownPublic.id]),
    );

    const thirdParty = await employeeA.agent
      .get('/orders')
      .query({
        responsibleId: employeeB.funcionarioId,
        status: 'in-progress',
        search: 'Escopo B',
      })
      .expect(HttpStatus.OK);
    expect(thirdParty.body.map((item: { id: string }) => item.id)).toEqual([
      publicB.id,
    ]);
    expect(
      thirdParty.body.map((item: { id: string }) => item.id),
    ).not.toContain(privateB.id);
  });

  it('lists deterministic responsible options from accessible orders without administrative data', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const responsibleB = await createUserFixture({ nome: 'Bruno Responsável' });
    const responsibleA = await createUserFixture({ nome: 'Ana Responsável' });
    await createOrderFixture(responsibleB.funcionarioId);
    await createOrderFixture(responsibleB.funcionarioId, {
      status: StatusOrdemServico.CONCLUIDO,
    });
    await createOrderFixture(responsibleA.funcionarioId, {
      status: StatusOrdemServico.CANCELADO,
    });
    await database.funcionario.update({
      where: { id: responsibleA.funcionarioId },
      data: { ativo: false },
    });

    const response = await administrator.agent
      .get('/orders/responsibles')
      .expect(HttpStatus.OK);
    const options = response.body.filter((item: { id: string }) =>
      [responsibleA.funcionarioId, responsibleB.funcionarioId].includes(
        item.id,
      ),
    );
    expect(options).toEqual([
      { id: responsibleA.funcionarioId, nome: 'Ana Responsável' },
      { id: responsibleB.funcionarioId, nome: 'Bruno Responsável' },
    ]);
    expect(JSON.stringify(options)).not.toMatch(
      /telefone|email|usuario|perfil|ativo/i,
    );
  });

  it('does not expose responsible options from inaccessible private orders', async () => {
    const employeeA = await createAgent();
    const employeeB = await createUserFixture({ nome: 'Beatriz Pública' });
    const employeeC = await createUserFixture({ nome: 'Carla Privada' });
    await createOrderFixture(employeeA.user.funcionarioId);
    await createOrderFixture(employeeB.funcionarioId, {
      visibilidade: Visibilidade.PUBLICA,
    });
    await createOrderFixture(employeeC.funcionarioId);

    const response = await employeeA.agent
      .get('/orders/responsibles')
      .expect(HttpStatus.OK);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: employeeA.user.funcionarioId }),
        expect.objectContaining({ id: employeeB.funcionarioId }),
      ]),
    );
    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: employeeC.funcionarioId }),
      ]),
    );
    for (const option of response.body) {
      expect(Object.keys(option).sort()).toEqual(['id', 'nome']);
    }
  });

  it('filters createdAt with inclusive createdFrom and exclusive createdBefore', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const responsible = await createUserFixture();
    const before = await createOrderFixture(responsible.funcionarioId, {
      numero: 'OS-TIME-BEFORE',
      criadoEm: new Date('2026-09-08T02:59:59.000Z'),
    });
    const atFrom = await createOrderFixture(responsible.funcionarioId, {
      numero: 'OS-TIME-FROM',
      criadoEm: new Date('2026-09-08T03:00:00.000Z'),
      status: StatusOrdemServico.EM_ANDAMENTO,
      clientName: 'Intervalo Temporal',
    });
    const atBefore = await createOrderFixture(responsible.funcionarioId, {
      numero: 'OS-TIME-BEFORE-LIMIT',
      criadoEm: new Date('2026-09-09T03:00:00.000Z'),
      status: StatusOrdemServico.EM_ANDAMENTO,
      clientName: 'Intervalo Temporal',
    });
    const after = await createOrderFixture(responsible.funcionarioId, {
      numero: 'OS-TIME-AFTER',
      criadoEm: new Date('2026-09-09T03:00:01.000Z'),
    });

    const from = await administrator.agent
      .get('/orders')
      .query({ createdFrom: '2026-09-08T03:00:00.000Z' })
      .expect(HttpStatus.OK);
    expect(from.body.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([atFrom.id, atBefore.id, after.id]),
    );
    expect(from.body.map((item: { id: string }) => item.id)).not.toContain(
      before.id,
    );

    const beforeLimit = await administrator.agent
      .get('/orders')
      .query({ createdBefore: '2026-09-09T03:00:00.000Z' })
      .expect(HttpStatus.OK);
    expect(beforeLimit.body.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([before.id, atFrom.id]),
    );
    expect(beforeLimit.body.map((item: { id: string }) => item.id)).not.toEqual(
      expect.arrayContaining([atBefore.id, after.id]),
    );

    const combined = await administrator.agent
      .get('/orders')
      .query({
        responsibleId: responsible.funcionarioId,
        createdFrom: '2026-09-08T03:00:00.000Z',
        createdBefore: '2026-09-09T03:00:00.000Z',
        status: 'in-progress',
        search: 'Intervalo',
      })
      .expect(HttpStatus.OK);
    expect(combined.body.map((item: { id: string }) => item.id)).toEqual([
      atFrom.id,
    ]);
  });

  it('smokes contextual list, detail, and filters with temporary PostgreSQL fixtures', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const employeeA = await createAgent();
    const employeeB = await createUserFixture();
    const privateA = await createOrderFixture(employeeA.user.funcionarioId, {
      numero: 'OS-SMOKE-A-PRIVATE',
      status: StatusOrdemServico.AGUARDANDO,
    });
    const publicA = await createOrderFixture(employeeA.user.funcionarioId, {
      numero: 'OS-SMOKE-A-PUBLIC',
      visibilidade: Visibilidade.PUBLICA,
      status: StatusOrdemServico.EM_ANDAMENTO,
    });
    const privateB = await createOrderFixture(employeeB.funcionarioId, {
      numero: 'OS-SMOKE-B-PRIVATE',
      status: StatusOrdemServico.CONCLUIDO,
    });
    await createHistoryFixture(
      privateA.id,
      employeeA.user.funcionarioId,
      employeeA.user.userId,
      { versao: 1, valor: '15.5' },
    );
    await createHistoryFixture(
      publicA.id,
      employeeA.user.funcionarioId,
      employeeA.user.userId,
      { versao: 1 },
    );
    await createHistoryFixture(
      privateB.id,
      employeeB.funcionarioId,
      employeeB.userId,
      { versao: 1, visibilidade: Visibilidade.PUBLICA },
    );
    const adminList = await administrator.agent
      .get('/orders')
      .expect(HttpStatus.OK);
    expect(adminList.body.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([privateA.id, publicA.id, privateB.id]),
    );
    const employeeList = await employeeA.agent
      .get('/orders')
      .expect(HttpStatus.OK);
    expect(employeeList.body.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([privateA.id, publicA.id]),
    );
    expect(
      employeeList.body.map((item: { id: string }) => item.id),
    ).not.toContain(privateB.id);
    await employeeA.agent.get(`/orders/${publicA.id}`).expect(HttpStatus.OK);
    await employeeA.agent
      .get(`/orders/${privateB.id}`)
      .expect(HttpStatus.NOT_FOUND);
    const adminHistory = await administrator.agent
      .get(`/orders/${privateB.id}/history`)
      .expect(HttpStatus.OK);
    expect(adminHistory.body[0].valor).toBe('123.40');
    const ownHistory = await employeeA.agent
      .get(`/orders/${privateA.id}/history`)
      .expect(HttpStatus.OK);
    expect(ownHistory.body[0].valor).toBe('15.50');
    await employeeA.agent
      .get(`/orders/${publicA.id}/history`)
      .expect(HttpStatus.OK);
    await employeeA.agent
      .get(`/orders/${privateB.id}/history`)
      .expect(HttpStatus.NOT_FOUND);
    const open = await employeeA.agent
      .get('/orders')
      .query({ status: 'open', search: 'OS-SMOKE-A' })
      .expect(HttpStatus.OK);
    expect(open.body.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([privateA.id, publicA.id]),
    );
  });

  it('rejects invalid query and ids for order and history reads', async () => {
    const { agent } = await createAgent();
    await agent
      .get('/orders')
      .query({ status: 'unknown' })
      .expect(HttpStatus.BAD_REQUEST);
    for (const query of [
      { responsibleId: 'not-a-uuid' },
      { createdFrom: '2026-09-08' },
      { createdBefore: 'not-a-datetime' },
      {
        createdFrom: '2026-09-09T03:00:00.000Z',
        createdBefore: '2026-09-08T03:00:00.000Z',
      },
      {
        createdFrom: '2026-09-08T03:00:00.000Z',
        createdBefore: '2026-09-08T03:00:00.000Z',
      },
    ]) {
      await agent.get('/orders').query(query).expect(HttpStatus.BAD_REQUEST);
    }
    await agent.get('/orders/not-a-uuid').expect(HttpStatus.BAD_REQUEST);
    await agent
      .get('/orders/not-a-uuid/history')
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('requires a valid session, completed first access, and an active account', async () => {
    await request.agent(app).get('/orders').expect(HttpStatus.UNAUTHORIZED);
    await request
      .agent(app)
      .get('/orders/00000000-0000-0000-0000-000000000000/history')
      .expect(HttpStatus.UNAUTHORIZED);
    const pending = await createAgent({ deveAlterarSenha: true });
    await pending.agent.get('/orders').expect(HttpStatus.FORBIDDEN).expect({
      statusCode: 403,
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
      message: 'Password change is required before accessing the application',
    });
    await pending.agent
      .get('/orders/00000000-0000-0000-0000-000000000000/history')
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: 403,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });
    const inactive = await createAgent({ ativo: false });
    await inactive.agent.get('/orders').expect(HttpStatus.UNAUTHORIZED);
  });
});
