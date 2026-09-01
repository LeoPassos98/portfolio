import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Perfil } from '../../generated/prisma/client.js';
import { FORBIDDEN_ERROR } from '../auth-errors.js';
import { ROLES_METADATA_KEY } from '../roles.decorator.js';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<Perfil[]>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const perfil = request.authenticatedUser?.perfil;

    if (perfil && allowedRoles.includes(perfil)) {
      return true;
    }

    throw new ForbiddenException(FORBIDDEN_ERROR);
  }
}
