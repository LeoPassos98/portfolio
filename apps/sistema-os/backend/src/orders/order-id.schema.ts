import { z } from 'zod';

export const orderIdSchema = z.object({
  id: z.string().uuid(),
});

export type OrderIdInput = z.output<typeof orderIdSchema>;
