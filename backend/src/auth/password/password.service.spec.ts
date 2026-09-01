import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwordService = new PasswordService();
  const password = 'senha-de-teste-segura';

  it('gera um hash Argon2id sem expor a senha em texto puro', async () => {
    const hash = await passwordService.hash(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);
  });

  it('valida a senha correta e rejeita uma senha incorreta', async () => {
    const hash = await passwordService.hash(password);

    await expect(passwordService.verify(hash, password)).resolves.toBe(true);
    await expect(passwordService.verify(hash, 'senha-incorreta')).resolves.toBe(
      false,
    );
  });

  it('gera hashes distintos para a mesma senha e ambos validam', async () => {
    const [firstHash, secondHash] = await Promise.all([
      passwordService.hash(password),
      passwordService.hash(password),
    ]);

    expect(firstHash).not.toBe(secondHash);
    await expect(passwordService.verify(firstHash, password)).resolves.toBe(true);
    await expect(passwordService.verify(secondHash, password)).resolves.toBe(true);
  });
});
