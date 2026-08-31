import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
  type ArgumentsHost,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../validation/zod-validation.pipe.js';
import { ERROR_CODES, HttpExceptionFilter } from './http-exception.filter.js';
import type { HttpErrorResponse } from './http-error-response.interface.js';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function catchException(exception: unknown): HttpErrorResponse {
    let payload: HttpErrorResponse | undefined;

    const response = {
      status: (statusCode: number) => ({
        json: (body: HttpErrorResponse) => {
          payload = { ...body, statusCode };
        },
      }),
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as ArgumentsHost;

    filter.catch(exception, host);

    if (!payload) {
      throw new Error('Expected the exception filter to write a response');
    }

    return payload;
  }

  it('normalizes Zod validation errors with their issues', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        quantity: z.number().int().positive(),
      }),
    );

    let exception: unknown;
    try {
      pipe.transform({ quantity: 0 });
    } catch (error) {
      exception = error;
    }

    const response = catchException(exception);

    expect(response).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: [
        {
          code: 'too_small',
          path: ['quantity'],
        },
      ],
    });
  });

  it.each([
    [
      new UnauthorizedException(),
      HttpStatus.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    ],
    [new ForbiddenException(), HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN],
    [new NotFoundException(), HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND],
    [new ConflictException(), HttpStatus.CONFLICT, ERROR_CODES.CONFLICT],
  ])(
    'normalizes HTTP exceptions with status %i',
    (exception, statusCode, code) => {
      const response = catchException(exception);

      expect(response).toMatchObject({ statusCode, code });
    },
  );

  it('preserves the public fields of future domain HTTP exceptions', () => {
    const response = catchException(
      new HttpException(
        {
          code: 'RESOURCE_STATE_INVALID',
          message: 'Resource state is invalid',
          details: { currentState: 'closed' },
        },
        HttpStatus.CONFLICT,
      ),
    );

    expect(response).toEqual({
      statusCode: HttpStatus.CONFLICT,
      code: 'RESOURCE_STATE_INVALID',
      message: 'Resource state is invalid',
      details: { currentState: 'closed' },
    });
  });

  it('sanitizes unexpected errors', () => {
    const response = catchException(
      new Error('password=secret at /internal/service.ts:10'),
    );

    expect(response).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith('Unhandled exception');
  });

  it('always returns the required public contract fields', () => {
    for (const exception of [
      new BadRequestException(),
      new UnauthorizedException(),
      new Error('unexpected'),
    ]) {
      const response = catchException(exception);

      expect(response).toMatchObject({
        statusCode: expect.any(Number),
        code: expect.any(String),
        message: expect.any(String),
      });
    }
  });
});
