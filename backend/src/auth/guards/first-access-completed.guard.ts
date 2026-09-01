import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PASSWORD_CHANGE_REQUIRED_ERROR } from '../auth-errors.js';

@Injectable()
export class FirstAccessCompletedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.authenticatedUser?.deveAlterarSenha) {
      throw new ForbiddenException(PASSWORD_CHANGE_REQUIRED_ERROR);
    }

    return true;
  }
}
