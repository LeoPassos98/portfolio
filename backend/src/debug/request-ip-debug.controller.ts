import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Perfil } from '../generated/prisma/client.js';

type RequestIpDiagnostic = {
  'request.socket.remoteAddress': string | null;
  'request.ip': string | null;
  'request.ips': string[];
  'x-forwarded-for': string | null;
  'x-real-ip'?: string;
};

@Controller('debug')
@UseGuards(SessionGuard, RoleGuard)
@Roles(Perfil.ADMINISTRADOR)
export class RequestIpDebugController {
  @Get('request-ip')
  getRequestIp(@Req() request: Request): RequestIpDiagnostic {
    const xRealIp = request.get('x-real-ip');

    return {
      'request.socket.remoteAddress': request.socket.remoteAddress ?? null,
      'request.ip': request.ip ?? null,
      'request.ips': request.ips,
      'x-forwarded-for': request.get('x-forwarded-for') ?? null,
      ...(xRealIp === undefined ? {} : { 'x-real-ip': xRealIp }),
    };
  }
}
