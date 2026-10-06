import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from '../auth/auth.controller.js';
import type { AuthService } from '../auth/auth.service.js';
import {
  DEMO_OPPORTUNISTIC_CLEANUP_DELAY_MS as delay,
  DEMO_OPPORTUNISTIC_CLEANUP_INTERVAL_MS as interval,
  DemoCleanupOpportunisticService,
} from './demo-cleanup-opportunistic.service.js';
import type { DemoCleanupService } from './demo-cleanup.service.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('Opportunistic DEMO cleanup scheduling', () => {
  const completed = {
    status: 'completed' as const,
    environmentsDeleted: 0,
    sessionsDeleted: 0,
    generationAttemptsDeleted: 0,
  };
  let cleanup: ReturnType<typeof vi.fn>;
  let coordinator: DemoCleanupOpportunisticService;
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    cleanup = vi.fn().mockResolvedValue(completed);
    coordinator = new DemoCleanupOpportunisticService({
      cleanupOneBatchIfAvailable: cleanup,
    } as unknown as DemoCleanupService);
    errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    coordinator.onModuleDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('schedules once, waits 10 seconds and ignores requests while pending', async () => {
    coordinator.requestCleanup();
    coordinator.requestCleanup();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(cleanup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).not.toHaveBeenCalled();
  });

  it('keeps one task in flight even when it runs longer than an hour', async () => {
    const pending = deferred<typeof completed>();
    cleanup.mockReturnValue(pending.promise);
    coordinator.requestCleanup();
    await vi.advanceTimersByTimeAsync(delay + interval);
    coordinator.requestCleanup();
    expect(vi.getTimerCount()).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
    pending.resolve(completed);
    await pending.promise;
    await vi.advanceTimersByTimeAsync(0);
    coordinator.requestCleanup();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('measures the hour from the attempt, not from its scheduling', async () => {
    coordinator.requestCleanup();
    await vi.advanceTimersByTimeAsync(delay);
    await vi.advanceTimersByTimeAsync(interval - 1);
    coordinator.requestCleanup();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    coordinator.requestCleanup();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(delay);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it.each(['lock-unavailable', 'failure'])(
    'consumes the hour on %s and catches rejection without sensitive logs',
    async (outcome) => {
      if (outcome === 'failure') {
        cleanup.mockRejectedValue(
          new Error('sensitive SQL credentials marker'),
        );
      } else {
        cleanup.mockResolvedValue({ status: 'lock-unavailable' });
      }
      coordinator.requestCleanup();
      await vi.advanceTimersByTimeAsync(delay);
      coordinator.requestCleanup();
      await vi.advanceTimersByTimeAsync(interval - 1);
      coordinator.requestCleanup();
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      if (outcome === 'failure') {
        expect(errorLog).toHaveBeenCalledExactlyOnceWith(
          'Opportunistic DEMO cleanup failed.',
        );
      } else {
        expect(errorLog).not.toHaveBeenCalled();
      }
      await vi.advanceTimersByTimeAsync(1);
      coordinator.requestCleanup();
      await vi.advanceTimersByTimeAsync(delay);
      expect(cleanup).toHaveBeenCalledTimes(2);
    },
  );

  it('logs only an aggregate when environments are removed', async () => {
    cleanup.mockResolvedValue({ ...completed, environmentsDeleted: 4 });
    coordinator.requestCleanup();
    await vi.advanceTimersByTimeAsync(delay);
    expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith(
      'Opportunistic DEMO cleanup completed: 4 environments removed.',
    );
  });

  it('unrefs its one-shot timer and cancels pending work during shutdown', async () => {
    const schedule = setTimeout;
    const unref = vi.fn();
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      (callback, timeout) => {
        const timer = schedule(callback, timeout);
        vi.spyOn(timer, 'unref').mockImplementation(() => {
          unref();
          return timer;
        });
        return timer;
      },
    );
    coordinator.requestCleanup();
    expect(unref).toHaveBeenCalled();
    coordinator.onModuleDestroy();
    coordinator.requestCleanup();
    await vi.advanceTimersByTimeAsync(delay);
    expect(cleanup).not.toHaveBeenCalled();
  });

  function loginFixture(provisionedNow = true) {
    const usuario = { id: 'internal-user' };
    const body = { id: 'public-user' };
    const auth = {
      authenticate: vi.fn().mockResolvedValue({
        usuario,
        demoProvisionedNow: provisionedNow,
      }),
      toAuthenticatedUser: vi.fn().mockReturnValue(usuario),
      toSessionResponse: vi.fn().mockReturnValue(body),
    };
    const session = {
      regenerate: vi.fn((done) => done()),
      save: vi.fn((done) => done()),
    };
    const response = Object.assign(new EventEmitter(), { statusCode: 200 });
    const controller = new AuthController(
      auth as unknown as AuthService,
      coordinator,
    );
    const login = () =>
      controller.login(
        { email: 'test@example.test', password: 'test-password' },
        { session } as unknown as Request,
        response as unknown as Response,
      );
    return { auth, session, response, body, login };
  }

  it('registers finish only after saving; login completes while cleanup stays pending', async () => {
    const fixture = loginFixture();
    const saved = deferred<void>();
    fixture.session.save.mockImplementation((done) => {
      void saved.promise.then(() => done());
    });
    const pending = deferred<typeof completed>();
    cleanup.mockReturnValue(pending.promise);
    const login = fixture.login();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.session.save).toHaveBeenCalledOnce();
    expect(fixture.response.listenerCount('finish')).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    saved.resolve();
    expect(await login).toEqual(fixture.body);
    expect(fixture.response.listenerCount('finish')).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    fixture.response.emit('finish');
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(cleanup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(cleanup).toHaveBeenCalledOnce();
    pending.reject(new Error('private failure'));
    await vi.advanceTimersByTimeAsync(0);
    expect(errorLog).toHaveBeenCalledWith('Opportunistic DEMO cleanup failed.');
    expect(fixture.response.statusCode).toBe(200);
    expect(await login).toEqual(fixture.body);
  });

  it('does not register finish for a login without a new transition', async () => {
    const fixture = loginFixture(false);
    await fixture.login();
    expect(fixture.response.listenerCount('finish')).toBe(0);
    fixture.response.emit('finish');
    await vi.advanceTimersByTimeAsync(delay);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it.each(['invalid', 'provisioning', 'save', 'regenerate'])(
    'does not schedule on %s login failure',
    async (failure) => {
      const fixture = loginFixture();
      if (failure === 'invalid')
        fixture.auth.authenticate.mockResolvedValue(null);
      if (failure === 'provisioning')
        fixture.auth.authenticate.mockRejectedValue(new Error('failed'));
      if (failure === 'save')
        fixture.session.save.mockImplementation((done) =>
          done(new Error('failed')),
        );
      if (failure === 'regenerate')
        fixture.session.regenerate.mockImplementation((done) =>
          done(new Error('failed')),
        );
      await expect(fixture.login()).rejects.toThrow();
      expect(fixture.response.listenerCount('finish')).toBe(0);
      fixture.response.emit('finish');
      await vi.advanceTimersByTimeAsync(delay);
      expect(cleanup).not.toHaveBeenCalled();
    },
  );

  it('does not schedule if the HTTP pipeline finishes with an error status', async () => {
    const fixture = loginFixture();
    await fixture.login();
    fixture.response.statusCode = 500;
    fixture.response.emit('finish');
    await vi.advanceTimersByTimeAsync(delay);
    expect(cleanup).not.toHaveBeenCalled();
  });
});
