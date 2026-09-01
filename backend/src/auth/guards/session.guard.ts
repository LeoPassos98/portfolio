import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UNAUTHENTICATED_ERROR } from '../auth-errors.js';
import { AuthService } from '../auth.service.js';

function destroySession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const usuarioId = request.session.usuarioId;

    if (!usuarioId) {
      throw new UnauthorizedException(UNAUTHENTICATED_ERROR);
    }

    const usuario = await this.authService.getAuthenticatedUser(usuarioId);

    if (!usuario || !usuario.ativo) {
      await destroySession(request);
      throw new UnauthorizedException(UNAUTHENTICATED_ERROR);
    }

    request.authenticatedUser = this.authService.toAuthenticatedUser(usuario);

    return true;
  }
}
