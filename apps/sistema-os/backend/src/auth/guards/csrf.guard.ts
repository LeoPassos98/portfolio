import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { CSRF_INVALID_TOKEN_ERROR } from '../auth-errors.js';
import { matchesCsrfToken } from '../csrf-token.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    if (
      !matchesCsrfToken(request.session.csrfToken, request.get('X-CSRF-Token'))
    ) {
      throw new ForbiddenException(CSRF_INVALID_TOKEN_ERROR);
    }

    return true;
  }
}
