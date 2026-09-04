import { z } from 'zod';
import { employeeLoginEmailSchema } from './employee-login-email.schema.js';

export const employeeAccessLoginEmailUpdateSchema = z.strictObject({
  loginEmail: employeeLoginEmailSchema,
});

export type EmployeeAccessLoginEmailUpdateInput = z.output<
  typeof employeeAccessLoginEmailUpdateSchema
>;
