# Mapa da Estrutura Backend

Este documento organiza os arquivos autorais relevantes do backend por famílias funcionais e estruturais. Dentro de cada família, os arquivos seguem a ordem de criação; quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

## Visão rápida

| Área | Responsabilidade | Arquivos |
| --- | --- | ---: |
| Entrada e composição | Inicialização do NestJS, sessão global, CORS, clientes e endpoint raiz atual | 4 |
| Configuração de ambiente | Contrato de variáveis, valores de exemplo, CORS e validação no bootstrap | 2 |
| Infraestrutura de banco | Configuração Prisma, modelos físicos, migrations e acesso PostgreSQL injetável | 6 |
| Autenticação | Login, token CSRF, troca obrigatória de senha, logout e respostas da sessão autenticada | 12 |
| Guards de acesso | CSRF, autenticação de sessão, bloqueio de primeiro acesso e autorização por perfil | 4 |
| Clientes | Criação, edição, listagem e detalhe de clientes com validação, normalização e proteção de sessão | 11 |
| Segurança de credenciais | Hash e verificação reutilizáveis de senhas com Argon2id | 3 |
| Sessões server-side | Middleware HTTP e store PostgreSQL com cookie assinado | 4 |
| Proteção de origem | CORS restritivo para o frontend configurado | 1 |
| Validação HTTP | Pipe reutilizável para aplicar schemas Zod às entradas HTTP | 1 |
| Tratamento de erros HTTP | Contrato público, schema OpenAPI e normalização global de exceções | 3 |
| Documentação HTTP | Configuração OpenAPI e Swagger UI | 1 |
| Testes | Cobertura de ambiente, HTTP, erros, senhas, autenticação, guards, sessões e clientes | 12 |

## Sumário

- [Entrada e composição](#entrada-e-composição)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Infraestrutura de banco](#infraestrutura-de-banco)
- [Autenticação](#autenticação)
- [Guards de acesso](#guards-de-acesso)
- [Clientes](#clientes)
- [Segurança de credenciais](#segurança-de-credenciais)
- [Sessões server-side](#sessões-server-side)
- [Proteção de origem](#proteção-de-origem)
- [Validação HTTP](#validação-http)
- [Tratamento de erros HTTP](#tratamento-de-erros-http)
- [Documentação HTTP](#documentação-http)
- [Testes](#testes)

---

## Entrada e composição

Inicializa a aplicação NestJS, reúne sua composição atual e fornece o endpoint raiz temporário.

Diretório principal: `backend/src/`

### 1. `backend/src/main.ts`

Cria a aplicação NestJS a partir de `AppModule`, configura o `ConsoleLogger` nativo com JSON em produção e saída legível nos demais ambientes, habilita CORS restritivo para `FRONTEND_ORIGIN` com credenciais, registra globalmente o middleware de sessão, o filter de exceções HTTP e a documentação OpenAPI, habilita os hooks de desligamento, obtém a porta validada por `ConfigService` e inicia o servidor HTTP.

### 2. `backend/src/app.module.ts`

Compõe o módulo raiz: torna a configuração global com validação de ambiente, importa a infraestrutura de banco, autenticação, clientes e sessão, registra o `CsrfGuard` global e fornece o endpoint temporário atual.

### 3. `backend/src/app.controller.ts`

Expõe temporariamente a rota raiz `GET /`, delega sua resposta a `AppService` e a descreve na documentação OpenAPI como endpoint de verificação temporário.

### 4. `backend/src/app.service.ts`

Fornece a resposta temporária do endpoint raiz consumido por `AppController`.

---

## Configuração de ambiente

Define o contrato de execução local e valida as variáveis exigidas quando a aplicação é composta.

Diretório principal: `backend/src/config/`

### 1. `backend/.env.example`

Disponibiliza valores de referência para ambiente de desenvolvimento, porta, bancos PostgreSQL de desenvolvimento e shadow, segredo e duração da sessão e origem única permitida do frontend no CORS.

### 2. `backend/src/config/environment.validation.ts`

Declara com Zod o schema das variáveis de ambiente, aplica valores padrão para ambiente, porta e duração de sessão, e interrompe o bootstrap com mensagens detalhadas quando a configuração é inválida.

---

## Infraestrutura de banco

Centraliza a configuração do Prisma e disponibiliza o acesso tipado ao PostgreSQL para os módulos NestJS que importarem `DatabaseModule`.

Diretórios principais: `backend/prisma/` e `backend/src/database/`

### 1. `backend/prisma.config.ts`

Configura o Prisma CLI, localiza o schema e recebe `DATABASE_URL` para o banco de desenvolvimento e `SHADOW_DATABASE_URL` para a database dedicada e descartável usada pelo Prisma Migrate.

### 2. `backend/prisma/schema.prisma`

Define os modelos físicos PostgreSQL do domínio e a tabela de infraestrutura `session`, seus enums e relações, além do generator `prisma-client` com saída local.

### 3. `backend/src/database/database.module.ts`

Expõe `DatabaseService` para que futuros módulos de domínio recebam o acesso ao banco por injeção de dependência.

### 4. `backend/src/database/database.service.ts`

Instancia o Prisma Client com o adapter PostgreSQL, obtém a URL pelo `ConfigService`, gerencia a conexão no ciclo de vida do NestJS e registra apenas os eventos seguros de conexão e desconexão.

### 5. `backend/prisma/migrations/20260831231500_initial_domain_schema/migration.sql`

Cria o esquema inicial PostgreSQL do domínio, incluindo tabelas, enums, índices, constraints de integridade e as chaves estrangeiras restritivas.

### 6. `backend/prisma/migrations/20260901002105_add_session_store/migration.sql`

Cria a tabela de infraestrutura `session` esperada pelo `connect-pg-simple`, com `sid` como chave primária, `sess` JSON, `expire` timestamp e índice de expiração.

---

## Autenticação

Implementa token CSRF, login, troca obrigatória da senha inicial, logout e consulta da sessão atual, mantendo no estado server-side somente a identidade necessária e o token anti-CSRF, e retornando o contexto seguro autenticado.

Diretório principal: `backend/src/auth/`

### 1. `backend/src/auth/auth-session-response.dto.ts`

Define o contrato seguro retornado no login e na sessão atual: identidade, perfil, funcionário e estado de troca obrigatória, sem hash, senha ou identificador de sessão.

### 2. `backend/src/auth/auth-login.schema.ts`

Declara o schema Zod de login, removendo espaços externos e normalizando maiúsculas/minúsculas apenas no e-mail; a senha permanece inalterada.

### 3. `backend/src/auth/auth.service.ts`

Consulta o usuário e seu funcionário no PostgreSQL, exige conta ativa, delega a verificação ao `PasswordService` e projeta a resposta segura da sessão.

### 4. `backend/src/auth/first-access-password.schema.ts`

Declara o schema Zod da troca obrigatória de senha: exige senha entre 8 e 128 caracteres sem transformações e confirmação idêntica.

### 5. `backend/src/auth/auth.controller.ts`

Expõe `GET /auth/csrf`, `POST /auth/login`, `POST /auth/first-access/password`, `POST /auth/logout` e `GET /auth/session`; entrega o token CSRF ligado à sessão, documenta o cabeçalho obrigatório das mutações, aplica `SessionGuard` às duas rotas autenticadas, regenera e salva a sessão antes de gravar `usuarioId` no login e após a troca obrigatória, e encerra sessões no PostgreSQL durante o logout.

### 6. `backend/src/auth/auth.module.ts`

Compõe controller, service e guards de autenticação com a infraestrutura de banco e de senhas, exportando o serviço e os guards de sessão e de primeiro acesso para módulos de domínio protegidos.

### 7. `backend/src/auth/authenticated-user.interface.ts`

Define o principal seguro tipado disponível somente no request autenticado, sem hash de senha ou dados persistidos na sessão.

### 8. `backend/src/auth/authenticated-request.d.ts`

Amplia o tipo de `Express.Request` com `authenticatedUser`, o contexto seguro da requisição preenchido pelo guard de sessão.

### 9. `backend/src/auth/auth-errors.ts`

Centraliza os códigos e mensagens estáveis usados pelos guards CSRF, de sessão, primeiro acesso e perfil.

### 10. `backend/src/auth/roles.decorator.ts`

Declara a metadata reutilizável de perfis permitidos para handlers e controllers, usando exclusivamente o enum `Perfil` do Prisma.

### 11. `backend/src/auth/csrf-token.ts`

Gera tokens CSRF aleatórios com `crypto` nativo e compara os valores recebidos em tempo seguro, sem registrar ou transferir o token por cookie próprio.

### 12. `backend/src/auth/csrf-token-response.dto.ts`

Define a resposta documentada de `GET /auth/csrf`, expondo somente o token vinculado à sessão server-side atual.

---

## Guards de acesso

Reúne guards reutilizáveis que separam a validação CSRF, autenticação, bloqueio de primeiro acesso e autorização por perfil das futuras policies de recurso.

Diretório principal: `backend/src/auth/guards/`

### 1. `backend/src/auth/guards/session.guard.ts`

Exige `session.usuarioId`, recarrega a conta ativa, destrói sessões inválidas e disponibiliza no request apenas o principal seguro da requisição.

### 2. `backend/src/auth/guards/first-access-completed.guard.ts`

Usa o principal já carregado pelo `SessionGuard` para bloquear o acesso normal enquanto `deveAlterarSenha` estiver ativo, sem nova consulta ao PostgreSQL.

### 3. `backend/src/auth/guards/role.guard.ts`

Lê com `Reflector` os perfis declarados por `@Roles(...)` e compara-os somente com o perfil do principal autenticado no request, sem aplicar regras de recurso ou consultar o PostgreSQL.

### 4. `backend/src/auth/guards/csrf.guard.ts`

Protege globalmente métodos mutáveis ao comparar, em tempo seguro, o cabeçalho `X-CSRF-Token` ao token da sessão; permite somente `GET`, `HEAD` e `OPTIONS` sem token.

---

## Clientes

Expõe criação, edição, listagem e detalhe reais de clientes no PostgreSQL, com contratos HTTP estritos e sem carregar relações ou Ordens de Serviço.

Diretório principal: `backend/src/clients/`

### 1. `backend/src/clients/client-id.schema.ts`

Valida com Zod o parâmetro `id` das consultas de detalhe como UUID.

### 2. `backend/src/clients/client-list-query.schema.ts`

Valida com Zod a query da listagem, aceita `active`, `inactive` e `all`, aplica `active` como padrão e remove espaços externos da busca.

### 3. `backend/src/clients/client-list-item-response.dto.ts`

Documenta no OpenAPI o DTO compacto da listagem, contendo somente identificação, nome, telefone, documento e situação.

### 4. `backend/src/clients/client-detail-response.dto.ts`

Documenta no OpenAPI o DTO completo da consulta de detalhe, sem relações ou Ordens de Serviço.

### 5. `backend/src/clients/clients.service.ts`

Orquestra criação, edição e consultas reais via `DatabaseService`: persiste Clientes normalizados e ativos por padrão, atualiza somente dados cadastrais com `Prisma cliente.update`, converte as violações `P2002` da constraint única de documento em `CLIENT_DOCUMENT_ALREADY_EXISTS`, transforma filtro e busca em `where` do Prisma, ordena por nome e id e retorna `CLIENT_NOT_FOUND` quando necessário.

### 6. `backend/src/clients/clients.controller.ts`

Define a fronteira HTTP `POST /clients`, `PUT /clients/:id`, `GET /clients` e `GET /clients/:id`, aplica `SessionGuard` seguido de `FirstAccessCompletedGuard`, valida entrada com Zod e descreve DTOs e respostas de erro no OpenAPI.

### 7. `backend/src/clients/clients.module.ts`

Agrupa o domínio de Clientes, importando banco e autenticação e registrando controller e service.

### 8. `backend/src/clients/client-document.validator.ts`

Centraliza a validação reutilizável dos dígitos verificadores de CPF e CNPJ, incluindo a rejeição de sequências repetidas.

### 9. `backend/src/clients/client-create.schema.ts`

Expõe o schema estrito de criação de Cliente a partir do contrato cadastral compartilhado, impedindo mass assignment de campos administrativos.

### 10. `backend/src/clients/client-registration.schema.ts`

Centraliza o schema cadastral estrito compartilhado por criação e edição, normalizando nome, endereço, telefone, CPF/CNPJ, CEP, e-mail, complemento e UF antes do service.

### 11. `backend/src/clients/client-update.schema.ts`

Expõe o schema estrito de edição cadastral de Cliente a partir do contrato compartilhado, mantendo `ativo` e outros campos administrativos fora da entrada.

---

## Segurança de credenciais

Disponibiliza o hash persistível e a verificação segura de senhas para os futuros fluxos de autenticação, sem criar endpoints ou sessões.

Diretório principal: `backend/src/auth/password/`

### 1. `backend/src/auth/password/password.module.ts`

Registra e exporta `PasswordService` para que módulos futuros possam receber a infraestrutura de senhas por injeção de dependência; é composto pelo módulo raiz sem expor rotas.

### 2. `backend/src/auth/password/password.service.ts`

Gera hashes Argon2id com salt automático e parâmetros seguros, e verifica a senha recebida pelo mecanismo seguro da própria biblioteca, sem armazenar ou registrar a senha original.

---

## Sessões server-side

Configura o ciclo de sessão HTTP sem rotas de autenticação, mantendo no cookie somente o identificador assinado e no PostgreSQL os dados da sessão.

Diretório principal: `backend/src/auth/session/`

### 1. `backend/src/auth/session/session.middleware.ts`

Centraliza as opções do `express-session`: cookie `HttpOnly`, `SameSite=Lax`, `Secure` condicionado à produção, duração configurável e ausência de renovação por acesso.

### 2. `backend/src/auth/session/session-store.service.ts`

Cria o pool e o store `connect-pg-simple` sobre a tabela `session`, desabilita a criação automática da tabela e o touch renovável, fornece o middleware global, revoga parametrizadamente todas as sessões de um usuário pelo `usuarioId` persistido no JSON e encerra store e pool no shutdown.

### 3. `backend/src/auth/session/session.module.ts`

Registra e exporta `SessionStoreService` para a composição do módulo raiz e o bootstrap da aplicação.

### 4. `backend/src/auth/session/session-data.d.ts`

Amplia o tipo de sessão do `express-session` com `usuarioId` e `csrfToken`, os únicos dados próprios persistidos pelo fluxo de autenticação e proteção CSRF.

---

## Proteção de origem

Define o CORS do backend para o frontend configurado, independente da validação CSRF e das regras de autorização do servidor.

Diretório principal: `backend/src/common/http/`

### 1. `backend/src/common/http/cors.options.ts`

Centraliza a origem explícita, credenciais, métodos e cabeçalhos permitidos pelo CORS, incluindo `X-CSRF-Token` e sem usar wildcard.

---

## Validação HTTP

Conecta schemas Zod ao ciclo de entrada HTTP do NestJS e mantém as issues disponíveis para a normalização global de erros.

Diretório principal: `backend/src/common/validation/`

### 1. `backend/src/common/validation/zod-validation.pipe.ts`

Recebe um schema Zod, retorna seu valor parseado e transforma falhas em `BadRequestException` com as issues originais disponíveis para o futuro filtro global.

---

## Tratamento de erros HTTP

Centraliza o contrato público de erros HTTP, sem regras de domínio específicas, para que services e policies futuros possam informar status, código, mensagem e details estruturados.

Diretório principal: `backend/src/common/errors/`

### 1. `backend/src/common/errors/http-error-response.interface.ts`

Define o formato público e estável das respostas de erro: `statusCode`, `code`, `message` e `details` opcional.

### 2. `backend/src/common/errors/http-exception.filter.ts`

Normaliza globalmente exceções HTTP do NestJS, issues da validação Zod e falhas inesperadas sanitizadas; registra a ocorrência interna de falhas inesperadas sem serializar detalhes potencialmente sensíveis e preserva os campos públicos de exceções HTTP futuras.

### 3. `backend/src/common/errors/http-error-response.openapi.ts`

Registra o schema OpenAPI reutilizável `HttpErrorResponse`, que representa `statusCode`, `code`, `message` e `details` opcional sem alterar o contrato runtime.

---

## Documentação HTTP

Configura a geração do contrato OpenAPI e expõe a Swagger UI, mantendo o schema dos erros alinhado ao formato normalizado em runtime.

Diretório principal: `backend/src/common/openapi/`

### 1. `backend/src/common/openapi/openapi.setup.ts`

Centraliza os metadados OpenAPI, gera o documento da aplicação, registra o schema global de erros e publica a Swagger UI em `/api/docs` com o JSON em `/api/docs/openapi.json`.

---

## Testes

Verifica os comportamentos autorais de validação que já participam ou participarão da aplicação.

Diretórios principais: `backend/src/config/` e `backend/src/common/validation/`

### 1. `backend/src/config/environment.validation.spec.ts`

Garante que a validação aceite a configuração mínima válida com padrões, rejeite variáveis obrigatórias ausentes e rejeite valores inválidos.

### 2. `backend/src/common/validation/zod-validation.pipe.spec.ts`

Garante o retorno de valores parseados, a preservação de transformações Zod, a rejeição HTTP de entradas inválidas e a disponibilidade das issues no response da exceção.

### 3. `backend/src/common/errors/http-exception.filter.spec.ts`

Verifica a normalização global para Zod, exceções HTTP conhecidas, exceções de domínio futuras, falhas inesperadas sanitizadas e os campos obrigatórios do contrato público.

### 4. `backend/src/auth/password/password.service.spec.ts`

Verifica a geração de hashes Argon2id sem senha em texto puro, a validação correta e incorreta e o salt automático que gera hashes distintos para a mesma senha.

### 5. `backend/src/auth/session/session.middleware.spec.ts`

Verifica as opções do cookie, incluindo `HttpOnly`, `SameSite=Lax`, duração, ausência de domínio e `Secure` condicionado à produção.

### 6. `backend/src/auth/session/session-store.service.spec.ts`

Usa fixtures HTTP somente de teste para verificar criação, persistência, recuperação, expiração fixa e revogação de sessões no PostgreSQL, incluindo múltiplas sessões, isolamento entre usuários, invalidação de CSRF, limpeza dos dados de validação e fechamento do store e pool.

### 7. `backend/src/auth/auth.controller.spec.ts`

Executa token CSRF, login, troca obrigatória da senha inicial, logout e consulta da sessão contra `portfolio_dev`, com fixtures removidas ao final; cobre persistência server-side e rotação do token, CORS restritivo, resposta genérica de falha, validação e preservação exata da senha, regeneração do identificador, conta inativada, revogação de sessão, invalidação de logout e ausência de dados sensíveis nas respostas.

### 8. `backend/src/auth/guards/session.guard.spec.ts`

Verifica a rejeição de sessão ausente, a reconstrução do principal seguro, a destruição da sessão para conta inexistente ou inativa e a ausência de hash no contexto autenticado.

### 9. `backend/src/auth/guards/first-access-completed.guard.spec.ts`

Verifica o bloqueio de acesso normal quando a troca obrigatória de senha está pendente e a liberação quando ela foi concluída, reutilizando somente o usuário já presente no request.

### 10. `backend/src/auth/guards/role.guard.spec.ts`

Verifica o decorator `@Roles(...)` e o `RoleGuard` para perfis permitidos, negados, múltiplos e ausentes, incluindo a resposta estável de acesso proibido sem consulta adicional ao banco.

### 11. `backend/src/auth/guards/csrf.guard.spec.ts`

Verifica os métodos seguros liberados, a rejeição uniforme de token ausente ou inválido e a validação obrigatória para `POST`, `PUT`, `PATCH` e `DELETE`.

### 12. `backend/src/clients/clients.controller.spec.ts`

Executa criação, edição e consultas de Clientes contra `portfolio_dev` com fixtures removidas ao final; cobre persistência, preservação da situação, normalizações, CPF/CNPJ, constraint única, validações, guards, CSRF, filtros, busca, ordenação, DTOs sem relações, erros e OpenAPI.
