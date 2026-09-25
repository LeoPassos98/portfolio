import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_CREDENTIAL_ALPHABET,
  DemoCredentialsService,
} from './demo-credentials.service.js';

describe('DemoCredentialsService', () => {
  const service = new DemoCredentialsService();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a login with the approved prefix, domain, length, and alphabet', () => {
    const login = service.generateLogin();
    const match = /^demo-([a-z2-9]{10})@leonardopassos\.com$/.exec(login);

    expect(match).not.toBeNull();
    expect(match?.[1]).toHaveLength(10);
    expect([...match![1]]).toSatisfy((characters: string[]) =>
      characters.every((character) =>
        DEMO_CREDENTIAL_ALPHABET.includes(character),
      ),
    );
    expect(match?.[1]).not.toMatch(/[0o1l]/);
  });

  it('generates a password with the approved prefix, length, and alphabet', () => {
    const password = service.generatePassword();
    const match = /^senhadademo-([a-z2-9]{12})$/.exec(password);

    expect(match).not.toBeNull();
    expect(match?.[1]).toHaveLength(12);
    expect([...match![1]]).toSatisfy((characters: string[]) =>
      characters.every((character) =>
        DEMO_CREDENTIAL_ALPHABET.includes(character),
      ),
    );
    expect(match?.[1]).not.toMatch(/[0o1l]/);
  });

  it('generates login and password through independent operations without Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random must not be used.');
    });

    expect(() => service.generateLogin()).not.toThrow();
    expect(() => service.generatePassword()).not.toThrow();
    expect(mathRandom).not.toHaveBeenCalled();
  });
});
