import { z } from 'zod';

export const employeeAccessProfileUpdateSchema = z.strictObject({
  profile: z.enum(['administrator', 'employee']),
});

export type EmployeeAccessProfileUpdateInput = z.output<
  typeof employeeAccessProfileUpdateSchema
>;
