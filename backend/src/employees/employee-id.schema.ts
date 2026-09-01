import { z } from 'zod';

export const employeeIdSchema = z.object({
  id: z.string().uuid(),
});

export type EmployeeIdInput = z.output<typeof employeeIdSchema>;
