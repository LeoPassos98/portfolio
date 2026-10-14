import { SetMetadata } from '@nestjs/common';
import type { Perfil } from '../generated/prisma/client.js';

export const ROLES_METADATA_KEY = 'auth:roles';

export const Roles = (...roles: Perfil[]) =>
  SetMetadata(ROLES_METADATA_KEY, roles);
