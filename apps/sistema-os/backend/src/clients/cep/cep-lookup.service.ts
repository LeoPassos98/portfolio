import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CepLookupResponse } from './cep-lookup-response.dto.js';
import {
  CepProviderUnavailableError,
  ViaCepProvider,
} from './via-cep.provider.js';

export const CEP_NOT_FOUND_ERROR = {
  code: 'CEP_NOT_FOUND',
  message: 'Postal code not found',
} as const;

export const CEP_PROVIDER_UNAVAILABLE_ERROR = {
  code: 'CEP_PROVIDER_UNAVAILABLE',
  message: 'Postal code provider is unavailable',
} as const;

@Injectable()
export class CepLookupService {
  constructor(private readonly viaCepProvider: ViaCepProvider) {}

  async lookup(cep: string): Promise<CepLookupResponse> {
    try {
      const address = await this.viaCepProvider.lookup(cep);

      if (!address) {
        throw new NotFoundException(CEP_NOT_FOUND_ERROR);
      }

      return address;
    } catch (error: unknown) {
      if (error instanceof CepProviderUnavailableError) {
        throw new ServiceUnavailableException(CEP_PROVIDER_UNAVAILABLE_ERROR);
      }

      throw error;
    }
  }
}
