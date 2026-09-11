import { z } from 'zod';
import { passwordSchema } from '../auth/password/password.schema.js';
import { employeeLoginEmailSchema } from '../employees/employee-login-email.schema.js';
import { employeeRegistrationSchema } from '../employees/employee-registration.schema.js';

const bootstrapEnvironmentKeys = {
  nome: 'BOOTSTRAP_ADMIN_NAME',
  telefone: 'BOOTSTRAP_ADMIN_PHONE',
  email: 'BOOTSTRAP_ADMIN_CONTACT_EMAIL',
  loginEmail: 'BOOTSTRAP_ADMIN_LOGIN_EMAIL',
  password: 'BOOTSTRAP_ADMIN_PASSWORD',
} as const;

export const adminBootstrapSchema = employeeRegistrationSchema.extend({
  loginEmail: employeeLoginEmailSchema,
  password: passwordSchema,
});

export type AdminBootstrapInput = z.output<typeof adminBootstrapSchema>;

export class AdminBootstrapConfigurationError extends Error {
  constructor(details: string) {
    super(`Configuração de bootstrap inválida:\n${details}`);
    this.name = 'AdminBootstrapConfigurationError';
  }
}

export function parseAdminBootstrapEnvironment(
  environment: NodeJS.ProcessEnv,
): AdminBootstrapInput {
  const result = adminBootstrapSchema.safeParse({
    nome: environment.BOOTSTRAP_ADMIN_NAME,
    telefone: environment.BOOTSTRAP_ADMIN_PHONE,
    email: environment.BOOTSTRAP_ADMIN_CONTACT_EMAIL,
    loginEmail: environment.BOOTSTRAP_ADMIN_LOGIN_EMAIL,
    password: environment.BOOTSTRAP_ADMIN_PASSWORD,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const field = issue.path[0] as keyof typeof bootstrapEnvironmentKeys;

        return `${bootstrapEnvironmentKeys[field]}: ${issue.message}`;
      })
      .join('\n');

    throw new AdminBootstrapConfigurationError(details);
  }

  return result.data;
}
