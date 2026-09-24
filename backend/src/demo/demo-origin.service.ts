import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ipaddr from 'ipaddr.js';
import type { Environment } from '../config/environment.validation.js';

export class InvalidDemoOriginIpError extends Error {
  constructor() {
    super('Invalid request IP address.');
    this.name = 'InvalidDemoOriginIpError';
  }
}

export function normalizeDemoOriginIp(requestIp: string): string {
  if (isIP(requestIp) === 0 || !ipaddr.isValid(requestIp)) {
    throw new InvalidDemoOriginIpError();
  }

  const address = ipaddr.parse(requestIp);

  if (address instanceof ipaddr.IPv6) {
    if (address.zoneId !== undefined) {
      throw new InvalidDemoOriginIpError();
    }

    if (address.isIPv4MappedAddress()) {
      return address.toIPv4Address().toString();
    }
  }

  return address.toString();
}

@Injectable()
export class DemoOriginService {
  private readonly secret: string;

  constructor(configService: ConfigService<Environment, true>) {
    this.secret = configService.getOrThrow('DEMO_IP_HMAC_SECRET', {
      infer: true,
    });
  }

  hashRequestIp(requestIp: string): string {
    const normalizedIp = normalizeDemoOriginIp(requestIp);

    return createHmac('sha256', this.secret)
      .update(normalizedIp, 'utf8')
      .digest('hex');
  }
}
