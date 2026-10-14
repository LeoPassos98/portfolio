import {
  clientRegistrationSchema,
  type ClientRegistrationInput,
} from './client-registration.schema.js';

export const clientUpdateSchema = clientRegistrationSchema;

export type ClientUpdateInput = ClientRegistrationInput;
