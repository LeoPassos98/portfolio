import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CepProviderUnavailableError,
  ViaCepProvider,
  VIA_CEP_TIMEOUT_MS,
} from './via-cep.provider.js';

describe('ViaCepProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('aborts the native fetch request after the configured timeout', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Request aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new ViaCepProvider();
    const lookup = provider.lookup('01001000');
    const lookupError = expect(lookup).rejects.toBeInstanceOf(
      CepProviderUnavailableError,
    );

    await vi.advanceTimersByTimeAsync(VIA_CEP_TIMEOUT_MS);

    await lookupError;
    expect(fetchMock).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01001000/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
