import { z } from 'zod';

export const clientStatusSchema = z.enum(['active', 'inactive', 'all']);

export const clientListQuerySchema = z.object({
  status: clientStatusSchema.default('active'),
  search: z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});

export type ClientListQuery = z.output<typeof clientListQuerySchema>;
