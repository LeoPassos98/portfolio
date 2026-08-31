import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import type { HttpErrorResponse } from './http-error-response.interface.js';

export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

const HTTP_ERROR_CODES: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const errorResponse = this.toErrorResponse(exception);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private toErrorResponse(exception: unknown): HttpErrorResponse {
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : undefined,
      );

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (this.isZodValidationResponse(response)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: response.errors,
      };
    }

    return {
      statusCode,
      code: this.getCode(statusCode, response),
      message: this.getMessage(statusCode, response),
      ...this.getDetails(response),
    };
  }

  private getCode(statusCode: number, response: string | object): string {
    if (this.isRecord(response) && typeof response.code === 'string') {
      return response.code;
    }

    return HTTP_ERROR_CODES[statusCode] ?? `HTTP_${statusCode}`;
  }

  private getMessage(statusCode: number, response: string | object): string {
    if (typeof response === 'string') {
      return response;
    }

    if (this.isRecord(response) && typeof response.message === 'string') {
      return response.message;
    }

    return STATUS_CODES[statusCode] ?? 'HTTP error';
  }

  private getDetails(
    response: string | object,
  ): Pick<HttpErrorResponse, 'details'> | object {
    if (this.isRecord(response) && 'details' in response) {
      return { details: response.details };
    }

    return {};
  }

  private isZodValidationResponse(
    response: string | object,
  ): response is { message: string; errors: unknown } {
    return (
      this.isRecord(response) &&
      response.message === 'Validation failed' &&
      Array.isArray(response.errors)
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
