import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'all',
  'open',
  'awaiting',
  'in-progress',
  'completed',
  'cancelled',
]);

export const orderListQuerySchema = z
  .object({
    status: orderStatusSchema.default('all'),
    search: z
      .string()
      .transform((value) => value.trim())
      .transform((value) => (value === '' ? undefined : value))
      .optional(),
    responsibleId: z.string().uuid().optional(),
    createdFrom: z.string().datetime({ offset: true }).optional(),
    createdBefore: z.string().datetime({ offset: true }).optional(),
  })
  .superRefine(({ createdBefore, createdFrom }, context) => {
    if (
      createdFrom &&
      createdBefore &&
      new Date(createdFrom).getTime() >= new Date(createdBefore).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'createdFrom must be earlier than createdBefore',
        path: ['createdBefore'],
      });
    }
  });

export type OrderListQuery = z.output<typeof orderListQuerySchema>;
