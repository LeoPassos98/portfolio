import { z } from 'zod';
import {
  employeeRegistrationSchema,
  type EmployeeRegistrationInput,
} from './employee-registration.schema.js';

export const employeeCreateSchema = employeeRegistrationSchema.extend({
  status: z.enum(['active', 'inactive']),
});

export type EmployeeCreateInput = EmployeeRegistrationInput & {
  status: 'active' | 'inactive';
};
