import type {
  OpenAPIObject,
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger';

export const HTTP_ERROR_RESPONSE_SCHEMA_NAME = 'HttpErrorResponse';

const httpErrorResponseSchema = {
  type: 'object',
  required: ['statusCode', 'code', 'message'],
  properties: {
    statusCode: {
      type: 'integer',
      example: 400,
    },
    code: {
      type: 'string',
      example: 'VALIDATION_ERROR',
    },
    message: {
      type: 'string',
      example: 'Validation failed',
    },
    details: {
      description: 'Dados estruturados adicionais sobre o erro, quando houver.',
    },
  },
} satisfies SchemaObject;

export function registerHttpErrorResponseSchema(document: OpenAPIObject): void {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas[HTTP_ERROR_RESPONSE_SCHEMA_NAME] =
    httpErrorResponseSchema;
}

export function getHttpErrorResponseSchemaReference(): ReferenceObject {
  return {
    $ref: `#/components/schemas/${HTTP_ERROR_RESPONSE_SCHEMA_NAME}`,
  };
}
