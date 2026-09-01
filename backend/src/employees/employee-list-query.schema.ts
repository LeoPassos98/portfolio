import { z } from 'zod';

export const employeeStatusSchema = z.enum(['active', 'inactive', 'all']);

export const employeeListQuerySchema = z.object({
  status: employeeStatusSchema.default('active'),
  search: z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});

export type EmployeeListQuery = z.output<typeof employeeListQuerySchema>;
