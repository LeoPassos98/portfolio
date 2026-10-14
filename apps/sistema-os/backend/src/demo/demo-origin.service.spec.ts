import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.validation.js';
import {
  DemoOriginService,
  InvalidDemoOriginIpError,
  normalizeDemoOriginIp,
} from './demo-origin.service.js';

const secret = 'test-demo-hmac-secret-with-at-least-32-characters';

function createService(hmacSecret = secret): DemoOriginService {
  const configService = new ConfigService<Environment, true>({
    DEMO_IP_HMAC_SECRET: hmacSecret,
  } as Environment);

  return new DemoOriginService(configService);
}

describe('DemoOriginService', () => {
  it('keeps a valid IPv4 address in canonical form', () => {
    expect(normalizeDemoOriginIp('179.198.78.33')).toBe('179.198.78.33');
  });

  it('maps IPv4-mapped IPv6 to the same canonical address and hash as IPv4', () => {
    const service = createService();

    expect(normalizeDemoOriginIp('::ffff:179.198.78.33')).toBe('179.198.78.33');
    expect(service.hashRequestIp('::ffff:179.198.78.33')).toBe(
      service.hashRequestIp('179.198.78.33'),
    );
  });

  it('canonicalizes equivalent expanded and compressed IPv6 addresses identically', () => {
    const service = createService();
    const expanded = '2001:0db8:0000:0000:0000:ff00:0042:8329';
    const compressed = '2001:db8::ff00:42:8329';

    expect(normalizeDemoOriginIp(expanded)).toBe(compressed);
    expect(service.hashRequestIp(expanded)).toBe(
      service.hashRequestIp(compressed),
    );
  });

  it.each(['not-an-ip', '192.168.1.999', '127.1', 'fe80::1%eth0'])(
    'fails closed for invalid or scoped input without exposing it: %s',
    (requestIp) => {
      expect(() => normalizeDemoOriginIp(requestIp)).toThrow(
        InvalidDemoOriginIpError,
      );

      try {
        normalizeDemoOriginIp(requestIp);
      } catch (error) {
        expect(String(error)).not.toContain(requestIp);
      }
    },
  );

  it('generates a deterministic lowercase SHA-256 hexadecimal HMAC', () => {
    const service = createService();
    const firstHash = service.hashRequestIp('203.0.113.10');

    expect(service.hashRequestIp('203.0.113.10')).toBe(firstHash);
    expect(firstHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes the hash when the canonical IP changes', () => {
    const service = createService();

    expect(service.hashRequestIp('203.0.113.10')).not.toBe(
      service.hashRequestIp('203.0.113.11'),
    );
  });

  it('changes the hash when the secret changes', () => {
    const firstService = createService();
    const secondService = createService(
      'another-demo-hmac-secret-with-at-least-32-characters',
    );

    expect(firstService.hashRequestIp('203.0.113.10')).not.toBe(
      secondService.hashRequestIp('203.0.113.10'),
    );
  });
});
