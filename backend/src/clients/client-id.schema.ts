import { z } from 'zod';

export const clientIdSchema = z.object({
  id: z.string().uuid(),
});

export type ClientIdInput = z.output<typeof clientIdSchema>;
