import { z } from 'zod';
import { employeeRegistrationSchema } from '../employees/employee-registration.schema.js';

export const profileUpdateSchema = employeeRegistrationSchema.pick({
  nome: true,
  telefone: true,
});

export type ProfileUpdateInput = z.output<typeof profileUpdateSchema>;
