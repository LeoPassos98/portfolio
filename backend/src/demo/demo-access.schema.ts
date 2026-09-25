import { z } from 'zod';

export const demoAccessSchema = z.strictObject({
  dataMode: z.enum(['EXEMPLO', 'VAZIO']),
  tutorialEnabled: z.boolean(),
});

export type DemoAccessInput = z.output<typeof demoAccessSchema>;
