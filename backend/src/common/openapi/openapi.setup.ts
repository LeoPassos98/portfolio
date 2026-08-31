import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  registerHttpErrorResponseSchema,
} from '../errors/http-error-response.openapi.js';

export const OPENAPI_DOCUMENTATION_PATH = 'api/docs';
export const OPENAPI_JSON_PATH = `${OPENAPI_DOCUMENTATION_PATH}/openapi.json`;

export function setupOpenApi(app: INestApplication): void {
  const configuration = new DocumentBuilder()
    .setTitle('Sistema de Gestão de Ordens de Serviço API')
    .setDescription('Documentação HTTP da API do sistema.')
    .setVersion('1.0')
    .build();

  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, configuration);
    registerHttpErrorResponseSchema(document);

    return document;
  };

  SwaggerModule.setup(OPENAPI_DOCUMENTATION_PATH, app, documentFactory, {
    jsonDocumentUrl: OPENAPI_JSON_PATH,
  });
}
