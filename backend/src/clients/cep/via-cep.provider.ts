import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { CepLookupResponse } from './cep-lookup-response.dto.js';

const VIA_CEP_URL = 'https://viacep.com.br/ws';
export const VIA_CEP_TIMEOUT_MS = 5_000;

const viaCepNotFoundSchema = z.object({
  erro: z.literal(true),
});

const viaCepAddressSchema = z.object({
  logradouro: z.string(),
  bairro: z.string(),
  localidade: z.string(),
  uf: z.string(),
});

const viaCepResponseSchema = z.union([
  viaCepNotFoundSchema,
  viaCepAddressSchema,
]);

export class CepProviderUnavailableError extends Error {
  constructor() {
    super('CEP provider is unavailable');
  }
}

function nullableProviderString(value: string): string | null {
  const normalized = value.trim();

  return normalized === '' ? null : normalized;
}

@Injectable()
export class ViaCepProvider {
  async lookup(cep: string): Promise<CepLookupResponse | null> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), VIA_CEP_TIMEOUT_MS);

    try {
      const response = await fetch(`${VIA_CEP_URL}/${cep}/json/`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new CepProviderUnavailableError();
      }

      const payload = await response.json();
      const parsedPayload = viaCepResponseSchema.safeParse(payload);

      if (!parsedPayload.success) {
        throw new CepProviderUnavailableError();
      }

      if ('erro' in parsedPayload.data) {
        return null;
      }

      return {
        logradouro: nullableProviderString(parsedPayload.data.logradouro),
        bairro: nullableProviderString(parsedPayload.data.bairro),
        cidade: nullableProviderString(parsedPayload.data.localidade),
        uf: nullableProviderString(parsedPayload.data.uf),
      };
    } catch (error: unknown) {
      if (error instanceof CepProviderUnavailableError) {
        throw error;
      }

      throw new CepProviderUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }
}
