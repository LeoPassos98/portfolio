import { z } from 'zod';

export const employeeStatusUpdateSchema = z
  .object({
    status: z.enum(['active', 'inactive']),
  })
  .strict();

export type EmployeeStatusUpdateInput = z.output<
  typeof employeeStatusUpdateSchema
>;
