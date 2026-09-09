import { z } from 'zod';

const rfc3339WithOffsetSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const dashboardPerformanceQuerySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    from: rfc3339WithOffsetSchema.optional(),
    before: rfc3339WithOffsetSchema.optional(),
  })
  .strict()
  .superRefine(({ before, from }, context) => {
    if (Boolean(from) !== Boolean(before)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from and before must be provided together',
        path: from ? ['before'] : ['from'],
      });
      return;
    }

    if (from && before && from >= before) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be earlier than before',
        path: ['from'],
      });
    }
  });

export type DashboardPerformanceQuery = z.output<
  typeof dashboardPerformanceQuerySchema
>;
