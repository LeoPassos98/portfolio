import { z } from 'zod';

export const employeeAccessStatusUpdateSchema = z.strictObject({
  status: z.enum(['active', 'inactive']),
});

export type EmployeeAccessStatusUpdateInput = z.output<
  typeof employeeAccessStatusUpdateSchema
>;
