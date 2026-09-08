import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
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

  afterEach(async () => {
    if (sessionIds.length)
      await verificationPool.query(
        'DELETE FROM "session" WHERE "sid" = ANY($1)',
        [sessionIds],
      );
    if (historyIds.length)
      await database.historicoOrdemServico.deleteMany({
        where: { id: { in: historyIds } },
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
    } = {},
  ): Promise<UserFixture> {
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
    return { agent, user };
  }

  async function createOrderFixture(
    responsavelId: string,
    options: {
      numero?: string;
      clientName?: string;
      status?: StatusOrdemServico;
      visibilidade?: Visibilidade;
      valor?: string;
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
        descricao: 'Descrição da ordem.',
        valor: options.valor ?? '123.40',
        observacoes: 'Observação.',
        status: options.status ?? StatusOrdemServico.AGUARDANDO,
        visibilidade: options.visibilidade ?? Visibilidade.PRIVADA,
        clienteId: client.id,
        responsavelId,
      },
    });
    clientIds.push(client.id);
    orderIds.push(order.id);
    return { id: order.id, numero: order.numero };
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
