import { z } from 'zod';
import { employeeLoginEmailSchema } from './employee-login-email.schema.js';
import { employeeRegistrationSchema } from './employee-registration.schema.js';

const employeeAdministrativeAccessUpdateSchema = z.strictObject({
  loginEmail: employeeLoginEmailSchema,
  profile: z.enum(['administrator', 'employee']),
  status: z.enum(['active', 'inactive']),
});

export const employeeAdministrativeUpdateSchema =
  employeeRegistrationSchema.extend({
    status: z.enum(['active', 'inactive']),
    account: employeeAdministrativeAccessUpdateSchema.optional(),
  });

export type EmployeeAdministrativeUpdateInput = z.output<
  typeof employeeAdministrativeUpdateSchema
>;
