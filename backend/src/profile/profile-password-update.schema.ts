import { z } from 'zod';
import { passwordSchema } from '../auth/password/password.schema.js';

export const profilePasswordUpdateSchema = z
  .strictObject({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    newPasswordConfirmation: z.string(),
  })
  .refine(
    ({ newPassword, newPasswordConfirmation }) =>
      newPassword === newPasswordConfirmation,
    {
      path: ['newPasswordConfirmation'],
      message: 'Password confirmation must match password',
    },
  );

export type ProfilePasswordUpdateInput = z.output<
  typeof profilePasswordUpdateSchema
>;
