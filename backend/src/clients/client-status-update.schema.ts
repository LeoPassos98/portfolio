import { z } from 'zod';

export const clientStatusUpdateSchema = z
  .object({
    status: z.enum(['active', 'inactive']),
  })
  .strict();

export type ClientStatusUpdateInput = z.output<
  typeof clientStatusUpdateSchema
>;
