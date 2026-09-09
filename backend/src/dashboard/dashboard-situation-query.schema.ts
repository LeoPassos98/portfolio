import { z } from 'zod';

export const dashboardSituationQuerySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
  })
  .strict();

export type DashboardSituationQuery = z.output<
  typeof dashboardSituationQuerySchema
>;
