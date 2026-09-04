# Mapa da Estrutura Backend

Este documento organiza os arquivos autorais relevantes do backend por famílias funcionais e estruturais.

Dentro de cada família, os arquivos seguem a ordem de criação. Quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

Destina-se a pessoas e agentes que precisam localizar responsabilidades no backend sem depender do histórico da implementação.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

## Visão rápida

| Área                     | Responsabilidade                                                                                                              | Arquivos |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------: |
| Entrada e composição     | Inicialização do NestJS, sessão global, CORS, clientes, funcionários e endpoint raiz atual                                    |        4 |
| Configuração de ambiente | Contrato de variáveis, valores de exemplo, CORS e validação no bootstrap                                                      |        2 |
| Infraestrutura de banco  | Configuração Prisma, modelos físicos, migrations e acesso PostgreSQL injetável                                                |        6 |
| Autenticação             | Login, token CSRF, troca obrigatória de senha, logout e respostas da sessão autenticada                                       |       12 |
| Guards de acesso         | CSRF, autenticação de sessão, bloqueio de primeiro acesso e autorização por perfil                                            |        4 |
| Clientes                 | Criação, edição cadastral, situação, exclusão, consultas de clientes e consulta de CEP intermediada pelo backend              |       16 |
| Funcionários             | Criação, edição cadastral, situação e consultas administrativas reais de funcionários e suas contas de acesso opcionais       |       16 |
| Segurança de credenciais | Hash e verificação reutilizáveis de senhas com Argon2id                                                                       |        3 |
| Sessões server-side      | Middleware HTTP e store PostgreSQL com cookie assinado                                                                        |        4 |
| Proteção de origem       | CORS restritivo para o frontend configurado                                                                                   |        1 |
| Validação HTTP           | Pipe reutilizável para aplicar schemas Zod às entradas HTTP                                                                   |        1 |
| Tratamento de erros HTTP | Contrato público, schema OpenAPI e normalização global de exceções                                                            |        3 |
| Documentação HTTP        | Configuração OpenAPI e Swagger UI                                                                                             |        1 |
| Testes                   | Cobertura de aplicação, ambiente, HTTP, erros, senhas, autenticação, guards, sessões, clientes, funcionários e ViaCEP mockado |       16 |

## Sumário

- [Entrada e composição](#entrada-e-composição)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Infraestrutura de banco](#infraestrutura-de-banco)
- [Autenticação](#autenticação)
- [Guards de acesso](#guards-de-acesso)
- [Clientes](#clientes)
- [Funcionários](#funcionários)
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

Cria a aplicação NestJS a partir de `AppModule` e inicia o servidor HTTP na porta validada por `ConfigService`.

Também configura logger, CORS, sessão, filtro global de exceções, OpenAPI e hooks de desligamento.

### 2. `backend/src/app.module.ts`

Compõe o módulo raiz, com configuração global validada e os módulos de banco, autenticação, clientes, funcionários e sessão.

Registra o `CsrfGuard` global e fornece o endpoint raiz atual.

### 3. `backend/src/app.controller.ts`

Expõe temporariamente a rota raiz `GET /`, delega sua resposta a `AppService` e a descreve na documentação OpenAPI como endpoint de verificação temporário.

### 4. `backend/src/app.service.ts`

Fornece a resposta temporária do endpoint raiz consumido por `AppController`.

---

## Configuração de ambiente

Define o contrato de execução local e valida as variáveis exigidas quando a aplicação é composta.

Diretório principal: `backend/src/config/`

### 1. `backend/.env.example`

Disponibiliza valores de referência para ambiente, porta, bancos PostgreSQL, segredo e duração da sessão.

Também define a origem única permitida pelo CORS.

### 2. `backend/src/config/environment.validation.ts`

Declara com Zod o schema das variáveis de ambiente e aplica defaults de ambiente, porta e duração de sessão.

Interrompe o bootstrap com mensagens detalhadas quando a configuração é inválida.

---

## Infraestrutura de banco

Centraliza a configuração do Prisma e disponibiliza o acesso tipado ao PostgreSQL para os módulos NestJS que importarem `DatabaseModule`.

Diretórios principais: `backend/prisma/` e `backend/src/database/`

### 1. `backend/prisma.config.ts`

Configura o Prisma CLI e localiza o schema.

Recebe `DATABASE_URL` para o banco da aplicação e `SHADOW_DATABASE_URL` para a base descartável do Prisma Migrate.

### 2. `backend/prisma/schema.prisma`

Define os modelos físicos PostgreSQL do domínio e a tabela de infraestrutura `session`, seus enums e relações, além do generator `prisma-client` com saída local.

### 3. `backend/src/database/database.module.ts`

Expõe `DatabaseService` para que futuros módulos de domínio recebam o acesso ao banco por injeção de dependência.

### 4. `backend/src/database/database.service.ts`

Instancia o Prisma Client com o adapter PostgreSQL e recebe a URL pelo `ConfigService`.

Gerencia a conexão no ciclo de vida do NestJS e registra apenas eventos seguros de conexão e desconexão.

### 5. `backend/prisma/migrations/20260831231500_initial_domain_schema/migration.sql`

Cria o esquema inicial PostgreSQL do domínio, incluindo tabelas, enums, índices, constraints de integridade e as chaves estrangeiras restritivas.

### 6. `backend/prisma/migrations/20260901002105_add_session_store/migration.sql`

Cria a tabela de infraestrutura `session` esperada pelo `connect-pg-simple`, com `sid` como chave primária, `sess` JSON, `expire` timestamp e índice de expiração.

---

## Autenticação

Reúne token CSRF, login, troca obrigatória de senha, logout e consulta da sessão atual.

Mantém server-side somente a identidade necessária e o token anti-CSRF; as respostas expõem apenas o contexto autenticado seguro.

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

Expõe CSRF, login, troca de senha de primeiro acesso, logout e consulta da sessão.

Vincula o token CSRF à sessão e documenta seu uso nas mutações.

As rotas autenticadas usam `SessionGuard`. Login e troca de senha regeneram a sessão; logout a encerra no PostgreSQL.

### 6. `backend/src/auth/auth.module.ts`

Compõe controller, service e guards de autenticação com banco e infraestrutura de senhas.

Exporta o serviço e os guards de sessão, primeiro acesso e perfil para módulos de domínio protegidos.

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

Lê com `Reflector` os perfis declarados por `@Roles(...)`.

Compara-os somente com o perfil já autenticado no request, sem consultar o PostgreSQL nem aplicar regras de recurso.

### 4. `backend/src/auth/guards/csrf.guard.ts`

Protege globalmente métodos mutáveis ao comparar, em tempo seguro, o cabeçalho `X-CSRF-Token` ao token da sessão; permite somente `GET`, `HEAD` e `OPTIONS` sem token.

---

## Clientes

Reúne criação, edição cadastral, situação, exclusão e consultas reais de Clientes no PostgreSQL.

Expõe contratos HTTP estritos, sem carregar relações ou Ordens de Serviço. A consulta de CEP usa ViaCEP sem persistir dados nem expor o contrato externo ao React.

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

Orquestra criação, edição, situação, exclusão e consultas de Clientes por `DatabaseService`.

Normaliza dados, mantém novos clientes ativos e separa atualizações cadastrais de alterações de situação.

Antes da exclusão, verifica Ordens de Serviço e traduz a regra contextual e a FK restritiva em `CLIENT_HAS_ORDERS`.

Também traduz `P2002` de documento em `CLIENT_DOCUMENT_ALREADY_EXISTS`, compõe filtro e busca do Prisma, ordena por nome e id e retorna `CLIENT_NOT_FOUND` quando necessário.

### 6. `backend/src/clients/clients.controller.ts`

Define as rotas de criação, edição, situação, exclusão, listagem, detalhe e CEP de Clientes.

Aplica `SessionGuard` e `FirstAccessCompletedGuard` às rotas protegidas.

Situação e exclusão também exigem `RoleGuard` para Administrador. Entradas e contratos são validados com Zod e documentados no OpenAPI.

### 7. `backend/src/clients/clients.module.ts`

Agrupa o domínio de Clientes, importando banco e autenticação e registrando controller, service e a integração de CEP via ViaCEP.

### 8. `backend/src/clients/client-document.validator.ts`

Centraliza a validação reutilizável dos dígitos verificadores de CPF e CNPJ, incluindo a rejeição de sequências repetidas.

### 9. `backend/src/clients/client-create.schema.ts`

Expõe o schema estrito de criação de Cliente a partir do contrato cadastral compartilhado, impedindo mass assignment de campos administrativos.

### 10. `backend/src/clients/client-registration.schema.ts`

Centraliza o schema cadastral estrito compartilhado por criação e edição, normalizando nome, endereço, telefone, CPF/CNPJ, CEP, e-mail, complemento e UF antes do service.

### 11. `backend/src/clients/client-update.schema.ts`

Expõe o schema estrito de edição cadastral de Cliente a partir do contrato compartilhado, mantendo `ativo` e outros campos administrativos fora da entrada.

### 12. `backend/src/clients/client-status-update.schema.ts`

Declara o schema estrito da alteração administrativa de situação, aceitando exclusivamente `status` com `active` ou `inactive`.

Diretório de integração: `backend/src/clients/cep/`

### 13. `backend/src/clients/cep/cep.schema.ts`

Centraliza o schema reutilizável de CEP, removendo caracteres não numéricos e exigindo exatamente oito dígitos para parâmetros HTTP e cadastro de Clientes.

### 14. `backend/src/clients/cep/cep-lookup-response.dto.ts`

Documenta o contrato interno e estável da consulta de CEP, expondo somente logradouro, bairro, cidade e UF, todos anuláveis para respostas parciais.

### 15. `backend/src/clients/cep/via-cep.provider.ts`

Encapsula URL, formato externo, `fetch` server-side e timeout explícito do ViaCEP.

Traduz `localidade` para `cidade`, oculta campos do fornecedor e distingue indisponibilidade técnica da ausência de CEP.

### 16. `backend/src/clients/cep/cep-lookup.service.ts`

Orquestra a consulta de CEP sem acessar persistência e converte as saídas do provider nos contratos HTTP `CEP_NOT_FOUND` e `CEP_PROVIDER_UNAVAILABLE`.

---

## Funcionários

Expõe a criação, a edição cadastral, as situações do cadastro e da conta, as alterações de perfil e e-mail de login, a criação explícita de conta e as consultas administrativas reais de Funcionários no PostgreSQL.

`Funcionario.usuario?` é uma relação 1:0..1: o funcionário pode não ter conta, ou ter uma conta ativa ou inativa.

O cadastro cria somente `Funcionario`; a conta é criada separadamente para um funcionário sem acesso. As consultas e respostas retornam projeções explícitas, sem credenciais, sessões, Ordens de Serviço ou histórico.

Diretório principal: `backend/src/employees/`

### 1. `backend/src/employees/employee-id.schema.ts`

Valida com Zod o parâmetro `id` da consulta de detalhe como UUID.

### 2. `backend/src/employees/employee-list-query.schema.ts`

Valida com Zod a query da listagem, aceita `active`, `inactive` e `all`, aplica `active` como padrão e trata busca vazia após trim como ausente.

### 3. `backend/src/employees/employee-list-item-response.dto.ts`

Documenta no OpenAPI o DTO compacto da listagem, incluindo a conta opcional com situação e perfil, sem dados de credencial.

### 4. `backend/src/employees/employee-detail-response.dto.ts`

Documenta no OpenAPI o DTO de detalhe, incluindo data de criação e a conta opcional com e-mail de login, situação e perfil.

### 5. `backend/src/employees/employees.service.ts`

Cria, edita, altera as situações do cadastro e da conta, altera perfil e e-mail de login, cria explicitamente a conta e consulta `Funcionario` e sua conta `Usuario` opcional por `DatabaseService`, com `select` explícito.

Na criação de conta, reutiliza `PasswordService`, normaliza o e-mail de login, converte o perfil público para o enum interno e define explicitamente a situação inicial conforme o Funcionário. Executa a criação em transação serializável, com retentativa para `P2034` e o SQLSTATE `40001` exposto pelo adapter PostgreSQL, preservando o invariante de que Funcionário inativo não possui conta ativa. Converte a unicidade de e-mail e de funcionário, inclusive em corrida, nos conflitos estáveis `LOGIN_EMAIL_ALREADY_EXISTS` e `EMPLOYEE_ACCESS_ALREADY_EXISTS`.

Na edição cadastral, atualiza exclusivamente nome, telefone e e-mail, sem alterar situação, conta ou relações.

Na inativação, bloqueia OS ativas e a remoção do último Administrador ativo, altera funcionário e conta de forma atômica e revoga as sessões da conta inativada.

Na administração separada da conta, altera somente `Usuario.ativo`, permite suspender o acesso de Funcionário ativo mesmo com OS, preserva credencial, perfil e e-mail de login e revoga todas as sessões na inativação. A reativação exige `Funcionario.ativo`, não recupera sessões e mantém `senhaHash` e `deveAlterarSenha`. Transações serializáveis com retentativa de `P2034` e SQLSTATE `40001` protegem o último Administrador ativo e o invariante Funcionário × conta sob concorrência.

Na alteração de perfil, modifica somente `Usuario.perfil` em conta ativa ou inativa, preserva cadastro, situação, e-mail e credencial e revoga todas as sessões apenas quando há mudança real. A mesma transação serializável impede que despromoções concorrentes removam todos os Administradores ativos; a autoalteração permitida conclui a resposta antes de a sessão revogada deixar de autenticar novas requisições.

Na alteração de e-mail de login, modifica somente `Usuario.emailLogin` em conta e Funcionário ativos ou inativos. Reutiliza a normalização da criação de conta, preserva cadastro, situação, perfil e credenciais, é idempotente para o valor normalizado atual e revoga as sessões apenas após mudança persistida. A constraint `UNIQUE` do PostgreSQL resolve corridas e `P2002` é convertido em `LOGIN_EMAIL_ALREADY_EXISTS`.

Traduz filtro e busca por nome, e-mail e telefone normalizado, ordena por nome e id, projeta `usuario` para `conta` e retorna `EMPLOYEE_NOT_FOUND` quando necessário.

### 6. `backend/src/employees/employees.controller.ts`

Define criação, edição cadastral, situação do Funcionário, criação, situação, perfil e e-mail de login da conta de acesso, listagem e detalhe de Funcionários.

O controller exige `SessionGuard`, `FirstAccessCompletedGuard` e `RoleGuard` de Administrador. Mutações recebem CSRF global; entradas, DTOs e erros são descritos com Zod e OpenAPI.

### 7. `backend/src/employees/employees.module.ts`

Agrupa o domínio de Funcionários, importando autenticação, senha, banco e sessões e registrando controller e service.

### 8. `backend/src/employees/employee-create.schema.ts`

Expõe o body estrito de criação a partir do cadastro compartilhado, adicionando exclusivamente a situação inicial.

### 9. `backend/src/employees/employee-registration.schema.ts`

Centraliza o body cadastral estrito compartilhado pela criação e edição de Funcionários.

Normaliza nome, telefone e e-mail de contato antes da persistência, sem incluir situação ou dados de conta.

### 10. `backend/src/employees/employee-update.schema.ts`

Expõe o body estrito de edição cadastral a partir do contrato compartilhado, mantendo situação, conta e campos administrativos fora da entrada.

### 11. `backend/src/employees/employee-status-update.schema.ts`

Declara o body estrito da alteração de situação, aceitando exclusivamente `status` com `active` ou `inactive`.

### 12. `backend/src/employees/employee-access-create.schema.ts`

Valida com Zod estrito a criação administrativa de conta por e-mail de login, perfil público, senha inicial e confirmação.

Normaliza somente o e-mail de login; preserva a senha exatamente como recebida, exige de 8 a 128 caracteres e impede persistência da confirmação.

### 13. `backend/src/employees/employee-access-status-update.schema.ts`

Declara com Zod estrito o body da administração da conta de acesso, aceitando exclusivamente `status` com `active` ou `inactive`.

### 14. `backend/src/employees/employee-access-profile-update.schema.ts`

Declara com Zod estrito o body da alteração de perfil da conta, aceitando exclusivamente o contrato público `profile` com `administrator` ou `employee`.

### 15. `backend/src/employees/employee-login-email.schema.ts`

Centraliza a regra de e-mail de login reutilizada pela criação e alteração da conta: string, trim, lowercase, valor não vazio e formato válido.

### 16. `backend/src/employees/employee-access-login-email-update.schema.ts`

Declara com Zod estrito o body da alteração de e-mail de login, aceitando exclusivamente `loginEmail` com a regra compartilhada da conta.

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

Cria o pool e o store `connect-pg-simple` sobre a tabela `session` e fornece o middleware global.

Desabilita a criação automática da tabela e o touch renovável. Revoga sessões por `usuarioId` persistido no JSON e encerra store e pool no shutdown.

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

Centraliza o contrato público de erros HTTP, sem regras de domínio específicas.

Permite que services e policies informem status, código, mensagem e `details` estruturados.

Diretório principal: `backend/src/common/errors/`

### 1. `backend/src/common/errors/http-error-response.interface.ts`

Define o formato público e estável das respostas de erro: `statusCode`, `code`, `message` e `details` opcional.

### 2. `backend/src/common/errors/http-exception.filter.ts`

Normaliza exceções HTTP do NestJS, issues Zod e falhas inesperadas sanitizadas.

Registra internamente falhas inesperadas sem serializar detalhes sensíveis e preserva os campos públicos de exceções HTTP futuras.

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

Mapeia todos os arquivos autorais de teste atuais. Para cenários, resultados e limitações, consulte o catálogo em [Testes e validações](testing.md).

Diretórios principais: `backend/src/` e `backend/test/`

### 1. `backend/src/app.controller.spec.ts`

Verifica diretamente a resposta temporária do controller raiz.

### 2. `backend/test/app.e2e-spec.ts`

Executa o smoke HTTP do endpoint raiz contra uma aplicação NestJS de teste.

### 3. `backend/src/config/environment.validation.spec.ts`

Garante que a validação aceite a configuração mínima válida com padrões, rejeite variáveis obrigatórias ausentes e rejeite valores inválidos.

### 4. `backend/src/common/validation/zod-validation.pipe.spec.ts`

Garante o retorno de valores parseados, a preservação de transformações Zod, a rejeição HTTP de entradas inválidas e a disponibilidade das issues no response da exceção.

### 5. `backend/src/common/errors/http-exception.filter.spec.ts`

Verifica a normalização global para Zod, exceções HTTP conhecidas, exceções de domínio futuras, falhas inesperadas sanitizadas e os campos obrigatórios do contrato público.

### 6. `backend/src/auth/password/password.service.spec.ts`

Verifica a geração de hashes Argon2id sem senha em texto puro, a validação correta e incorreta e o salt automático que gera hashes distintos para a mesma senha.

### 7. `backend/src/auth/session/session.middleware.spec.ts`

Verifica as opções do cookie, incluindo `HttpOnly`, `SameSite=Lax`, duração, ausência de domínio e `Secure` condicionado à produção.

### 8. `backend/src/auth/session/session-store.service.spec.ts`

Verifica persistência, expiração fixa, isolamento e revogação de sessões no PostgreSQL.

Também cobre invalidação de CSRF, limpeza das fixtures e fechamento de store e pool.

### 9. `backend/src/auth/auth.controller.spec.ts`

Executa CSRF, login, primeiro acesso, logout e sessão contra PostgreSQL com fixtures removidas ao final.

Cobre persistência, rotação, CORS, falhas genéricas, validação, revogação e ausência de dados sensíveis.

### 10. `backend/src/auth/guards/session.guard.spec.ts`

Verifica a rejeição de sessão ausente, a reconstrução do principal seguro, a destruição da sessão para conta inexistente ou inativa e a ausência de hash no contexto autenticado.

### 11. `backend/src/auth/guards/first-access-completed.guard.spec.ts`

Verifica o bloqueio de acesso normal enquanto a troca obrigatória de senha está pendente.

Também verifica a liberação após a troca, reutilizando somente o usuário já presente no request.

### 12. `backend/src/auth/guards/role.guard.spec.ts`

Verifica o decorator `@Roles(...)` e o `RoleGuard` para perfis permitidos, negados, múltiplos e ausentes.

Também cobre a resposta estável de acesso proibido sem consulta adicional ao banco.

### 13. `backend/src/auth/guards/csrf.guard.spec.ts`

Verifica os métodos seguros liberados, a rejeição uniforme de token ausente ou inválido e a validação obrigatória para `POST`, `PUT`, `PATCH` e `DELETE`.

### 14. `backend/src/clients/clients.controller.spec.ts`

Executa o ciclo HTTP de Clientes contra PostgreSQL, com fixtures e sessões auxiliares removidas ao final.

Cobre cadastro, edição, situação, exclusão, consulta, CEP, guards, CSRF, constraints e OpenAPI.

### 15. `backend/src/clients/cep/via-cep.provider.spec.ts`

Verifica que o provider aborta a chamada `fetch` quando o timeout explícito da dependência externa é atingido, sem consultar a internet.

### 16. `backend/src/employees/employees.controller.spec.ts`

Executa criação, edição cadastral, situação, criação explícita de conta e consultas administrativas de Funcionários contra PostgreSQL, com fixtures e sessões auxiliares removidas ao final.

Cobre conta opcional, criação de acesso, hash Argon2id, normalização, validação, situação, OS ativa, último Administrador, sessões, concorrência, guards, CSRF, filtros, privacidade e OpenAPI.
