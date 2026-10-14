import {
  clientRegistrationSchema,
  type ClientRegistrationInput,
} from './client-registration.schema.js';

export const clientCreateSchema = clientRegistrationSchema;

export type ClientCreateInput = ClientRegistrationInput;
