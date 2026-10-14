import {
  employeeRegistrationSchema,
  type EmployeeRegistrationInput,
} from './employee-registration.schema.js';

export const employeeUpdateSchema = employeeRegistrationSchema;

export type EmployeeUpdateInput = EmployeeRegistrationInput;
