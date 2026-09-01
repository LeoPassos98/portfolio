import type { AuthenticatedUser } from './authenticated-user.interface.js';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

export {};
