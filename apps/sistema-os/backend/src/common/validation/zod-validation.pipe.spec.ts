import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  it('returns the parsed value for valid input', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        quantity: z.number().int().positive(),
      }),
    );

    expect(pipe.transform({ quantity: 2 })).toEqual({ quantity: 2 });
  });

  it('preserves Zod transformations', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        email: z.string().trim().toLowerCase().email(),
      }),
    );

    expect(pipe.transform({ email: '  ADA@EXAMPLE.COM  ' })).toEqual({
      email: 'ada@example.com',
    });
  });

  it('rejects invalid input with a bad request exception', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        quantity: z.number().int().positive(),
      }),
    );

    expect(() => pipe.transform({ quantity: 0 })).toThrow(BadRequestException);
  });

  it('keeps Zod issue details in the exception response', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        quantity: z.number().int().positive(),
      }),
    );

    try {
      pipe.transform({ quantity: 0 });
      throw new Error('Expected the pipe to reject invalid input');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      if (!(error instanceof BadRequestException)) {
        return;
      }

      expect(error.getResponse()).toMatchObject({
        message: 'Validation failed',
        errors: [
          {
            code: 'too_small',
            path: ['quantity'],
          },
        ],
      });
    }
  });
});
