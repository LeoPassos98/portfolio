import type { NestExpressApplication } from '@nestjs/platform-express';
import { describe, expect, it, vi } from 'vitest';
import { configureTrustProxy } from './trust-proxy.config.js';

function createApplicationMock() {
  const set = vi.fn();
  const app = { set } as unknown as NestExpressApplication;

  return { app, set };
}

describe('configureTrustProxy', () => {
  it('trusts only the immediately preceding proxy hop in production', () => {
    const { app, set } = createApplicationMock();

    configureTrustProxy(app, 'production');

    expect(set).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it.each(['development', 'test'])(
    'preserves the Express default in %s',
    (nodeEnvironment) => {
      const { app, set } = createApplicationMock();

      configureTrustProxy(app, nodeEnvironment);

      expect(set).not.toHaveBeenCalled();
    },
  );
});
