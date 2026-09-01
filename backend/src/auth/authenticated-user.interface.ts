import type { Perfil } from '../generated/prisma/client.js';

export interface AuthenticatedUser {
  id: string;
  perfil: Perfil;
  funcionarioId: string;
  funcionarioNome?: string;
  deveAlterarSenha: boolean;
}
