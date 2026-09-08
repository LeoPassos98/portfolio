import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'all',
  'open',
  'awaiting',
  'in-progress',
  'completed',
  'cancelled',
]);

export const orderListQuerySchema = z.object({
  status: orderStatusSchema.default('all'),
  search: z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});

export type OrderListQuery = z.output<typeof orderListQuerySchema>;
