# Testes e validações do projeto

Este documento registra os testes e validações que realmente existem ou já foram executados no projeto.

Os arquivos de teste são a fonte executável. Este documento serve como mapa para entender onde estão, o que comprovam e por que existem.

## Visão rápida

- O backend usa Vitest; as rotas integradas usam Supertest.
- Os testes integrados relevantes usam a aplicação NestJS, Prisma/`DatabaseService` e PostgreSQL `portfolio_dev`.
- Há 15 arquivos `*.spec.ts` na suíte principal e um smoke e2e separado em `backend/test/app.e2e-spec.ts`.
- O frontend não possui suíte automatizada própria nem script de teste no estado atual; as validações de navegador estão registradas separadamente.
- Último resultado consolidado conhecido: **203 testes aprovados** no marco `b938573 feat: add employee creation API`.

## Catálogo de testes automatizados

## Backend

### Aplicação e configuração

#### `backend/src/app.controller.spec.ts`

**Finalidade**

Mantém o contrato mínimo do controller raiz da aplicação.

**Cenários cobertos**

- `GET /` por meio de `AppController.getHello()` retorna `Hello World!`.

**O que eles comprovam**

O controller e o serviço base podem ser compostos pelo módulo de testes do NestJS.

**Infraestrutura utilizada**

NestJS `TestingModule`.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/test/app.e2e-spec.ts`

**Finalidade**

Exercita o endpoint raiz por HTTP contra uma instância NestJS real, como smoke e2e mínimo.

**Cenários cobertos**

- `GET /` responde `200` com `Hello World!`.

**Por que estes testes existem**

Complementa o teste direto do controller ao confirmar o caminho HTTP básico da aplicação.

**Infraestrutura utilizada**

Vitest, `TestingModule`, aplicação NestJS e Supertest; é selecionado por `npm run test:e2e`.

**Observações**

Não faz parte dos 203 testes de `npm test`, cujo `vitest.config.ts` inclui apenas `*.spec.ts`. Não há resultado consolidado separado registrado para este comando.

#### `backend/src/config/environment.validation.spec.ts`

**Finalidade**

Valida o contrato de ambiente usado para iniciar o backend.

**Cenários cobertos**

- aceita as variáveis obrigatórias e aplica defaults de ambiente, porta e duração de sessão;
- rejeita `DATABASE_URL` ausente, porta inválida e duração de sessão não positiva.

**Por que estes testes existem**

O bootstrap depende dessas variáveis para banco, sessão e CORS; falhar cedo evita subir com configuração incompleta ou insegura.

**O que eles comprovam**

As regras de validação e os defaults do contrato de ambiente.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

### Validação HTTP e erros

#### `backend/src/common/validation/zod-validation.pipe.spec.ts`

**Finalidade**

Verifica a ponte entre schemas Zod e a resposta de entrada inválida do NestJS.

**Cenários cobertos**

- devolve entradas válidas já parseadas;
- preserva transformações Zod, como trim e normalização de e-mail;
- rejeita valor inválido com `BadRequestException`;
- preserva os detalhes das issues Zod na exceção.

**Por que estes testes existem**

Os DTOs HTTP dependem dessa ponte para normalizar dados e fornecer erros de validação úteis e consistentes.

**O que eles comprovam**

Regra de validação de entrada e transporte dos detalhes de schema para a camada HTTP.

**Infraestrutura utilizada**

Vitest, Zod e `ZodValidationPipe` isolado.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/common/errors/http-exception.filter.spec.ts`

**Finalidade**

Verifica o contrato público uniforme dos erros HTTP.

**Cenários cobertos**

- converte erros Zod em `VALIDATION_ERROR` com detalhes;
- normaliza exceções 401, 403, 404 e 409 nos códigos públicos esperados;
- preserva campos públicos de exceções de domínio;
- sanitiza erro inesperado e registra somente a mensagem interna controlada;
- sempre retorna `statusCode`, `code` e `message`.

**Por que estes testes existem**

Clientes HTTP precisam de erros estáveis, enquanto detalhes internos e segredos não podem vazar na resposta.

**O que eles comprovam**

Contrato HTTP de erro, preservação de regras de domínio e sanitização de falhas internas.

**Infraestrutura utilizada**

Vitest, `HttpExceptionFilter`, exceções NestJS e mock de `Logger`.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

### Autenticação, senha e sessão

#### `backend/src/auth/password/password.service.spec.ts`

**Finalidade**

Valida o serviço de hash e verificação de senha.

**Cenários cobertos**

- hash usa Argon2id e não contém a senha em texto puro;
- senha correta é aceita e senha incorreta é rejeitada;
- hashes da mesma senha são distintos e ambos permanecem verificáveis.

**Por que estes testes existem**

Senhas são credenciais persistidas; o serviço não pode expô-las nem assumir hash determinístico.

**O que eles comprovam**

Proteção criptográfica básica e comportamento de verificação de credencial.

**Infraestrutura utilizada**

Vitest e `PasswordService` com Argon2id real.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/auth/session/session.middleware.spec.ts`

**Finalidade**

Verifica as opções de segurança e expiração do middleware de sessão.

**Cenários cobertos**

- cookie `Secure` é ativado somente em produção;
- cookie usa `HttpOnly`, `SameSite=Lax`, caminho `/` e `maxAge` configurado;
- não há domínio de cookie e a sessão não usa rolling renewal.

**O que eles comprovam**

Configuração de cookie e expiração coerente com sessão autenticada server-side.

**Infraestrutura utilizada**

Vitest e a função `createSessionOptions` isolada.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/auth/session/session-store.service.spec.ts`

**Finalidade**

Valida persistência, expiração, revogação e desligamento do store PostgreSQL de sessões.

**Cenários cobertos**

- sessão assinada é persistida e restaurada sem expor fixture no cookie;
- leitura após expiração não renova o prazo server-side;
- revogação de um usuário não afeta outro;
- todas as sessões e tokens CSRF de um usuário são revogados;
- revogação sem sessão retorna zero e o shutdown fecha store e pool.

**Por que estes testes existem**

Sessão é uma fronteira de segurança e precisa sobreviver ao HTTP, expirar corretamente e ser revogável sem apagar sessões alheias.

**O que eles comprovam**

Persistência real, isolamento e revogação no PostgreSQL.

**Infraestrutura utilizada**

Vitest, Express, Supertest, `connect-pg-simple`, `pg` e PostgreSQL `portfolio_dev`; as fixtures são removidas ao final.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/auth/guards/csrf.guard.spec.ts`

**Finalidade**

Valida a regra do token CSRF ligado à sessão.

**Cenários cobertos**

- leituras `GET`, `HEAD` e `OPTIONS` não exigem token;
- `POST` sem token ou com token divergente retorna `CSRF_INVALID_TOKEN`;
- `POST`, `PUT`, `PATCH` e `DELETE` aceitam token idêntico ao da sessão.

**O que eles comprovam**

Proteção das mutações e liberação explícita de métodos seguros.

**Infraestrutura utilizada**

Vitest, `CsrfGuard` e contexto HTTP simulado.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/auth/guards/session.guard.spec.ts`

**Finalidade**

Verifica que a sessão gera um principal seguro somente para usuário ativo.

**Cenários cobertos**

- ausência de `usuarioId` retorna `AUTH_UNAUTHENTICATED` sem consultar o serviço;
- usuário ativo gera `authenticatedUser` sem senha ou hash;
- usuário inexistente ou inativo destrói a sessão e retorna não autenticado.

**Por que estes testes existem**

O guard é a autoridade que revalida a identidade guardada na sessão antes de liberar rotas protegidas.

**O que eles comprovam**

Autenticação server-side, invalidação de sessão e privacidade do principal de requisição.

**Infraestrutura utilizada**

Vitest, mocks de `AuthService` e contexto HTTP simulado.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/auth/guards/first-access-completed.guard.spec.ts`

**Finalidade**

Valida o bloqueio de rotas enquanto a troca obrigatória de senha estiver pendente.

**Cenários cobertos**

- usuário com `deveAlterarSenha` recebe `AUTH_PASSWORD_CHANGE_REQUIRED`;
- usuário que concluiu a troca é liberado.

**O que eles comprovam**

Regra de primeiro acesso aplicada no backend, independente da interface.

**Infraestrutura utilizada**

Vitest e contexto HTTP simulado.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/auth/guards/role.guard.spec.ts`

**Finalidade**

Verifica autorização por perfil declarada com `@Roles`.

**Cenários cobertos**

- Administrador e Funcionário são aceitos apenas nos handlers compatíveis;
- múltiplos perfis declarados aceitam ambos;
- handler sem metadata permanece livre;
- perfil incompatível retorna `AUTH_FORBIDDEN`;
- a decisão usa somente o principal já autenticado, sem acessar sessão ou banco.

**Por que estes testes existem**

Permissões devem ser aplicadas no backend e sem acoplamento adicional à infraestrutura já validada pelo guard de sessão.

**O que eles comprovam**

Autorização declarativa e isolamento do guard de perfil.

**Infraestrutura utilizada**

Vitest, `Reflector`, decorator `Roles` e contexto HTTP simulado.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/auth/auth.controller.spec.ts`

**Finalidade**

Exercita CSRF, login, sessão, primeiro acesso e logout pelas rotas reais de autenticação.

**Cenários cobertos**

- cria, persiste e reutiliza CSRF sem cookie dedicado, com CORS restritivo e preflight correto;
- login exige CSRF, normaliza somente e-mail, preserva espaços da senha e responde igualmente para senha incorreta, e-mail desconhecido ou conta inativa;
- login grava somente `usuarioId` na sessão PostgreSQL, não expõe segredos e regenera o identificador;
- restaura sessão, invalida conta inativada e rejeita sessão revogada;
- primeiro acesso troca senha, preserva espaços, regenera sessão, rejeita limites/confirmação inválidos, sessão ausente, conta inativa ou troca não pendente;
- logout exige CSRF novo depois da regeneração, encerra a sessão PostgreSQL e limpa o cookie.

**Por que estes testes existem**

Autenticação reúne credenciais, sessão e controles de segurança que não podem ser demonstrados somente por mocks ou pela tela de login.

**O que eles comprovam**

Comportamento HTTP, persistência real de sessão, rotação de identificadores e tokens, autorização de primeiro acesso, CORS e ausência de dados sensíveis nas respostas.

**Infraestrutura utilizada**

Vitest, aplicação NestJS real, Supertest, Prisma/`DatabaseService`, `pg`, PostgreSQL `portfolio_dev` e fixtures removidas ao final.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

### Clientes e CEP

#### `backend/src/clients/cep/via-cep.provider.spec.ts`

**Finalidade**

Verifica o timeout da fronteira HTTP do provider ViaCEP.

**Cenários cobertos**

- `fetch` nativo é abortado após `VIA_CEP_TIMEOUT_MS` e a falha é convertida em `CepProviderUnavailableError`.

**Por que estes testes existem**

O fornecedor externo não pode deixar uma requisição da aplicação pendente indefinidamente.

**O que eles comprovam**

Timeout e tradução da indisponibilidade na integração externa.

**Infraestrutura utilizada**

Vitest, fake timers e mock global de `fetch`.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

#### `backend/src/clients/clients.controller.spec.ts`

**Finalidade**

Exercita o ciclo HTTP completo de Clientes, incluindo CEP, contra a aplicação e o banco reais.

**Cenários cobertos**

- **criação:** Administrador e Funcionário criam cliente; normaliza cadastro, armazena CPF/CNPJ em dígitos, permite documento ausente e traduz a constraint `UNIQUE` em `CLIENT_DOCUMENT_ALREADY_EXISTS`;
- **edição:** ambos os perfis editam ativos ou inativos sem alterar status; normaliza campos, mantém/troca/remove documento quando permitido e rejeita duplicidade, IDs inválidos ou inexistentes e campos administrativos/inesperados;
- **situação:** somente Administrador ativa, inativa e repete estado, inclusive quando há OS vinculada; valida body, ID e inexistência;
- **exclusão:** somente Administrador exclui ativo/inativo sem OS, bloqueia qualquer status de OS vinculada e traduz a proteção de FK que cobre a corrida entre consulta e `DELETE`;
- **consulta:** lista ativos por padrão, filtra ativo/inativo/todos, busca nome/documento normalizado, ordena por nome e ID, devolve DTOs seguros e trata detalhe inválido, inexistente e com OS;
- **segurança:** operações protegidas exigem sessão, primeiro acesso concluído e CSRF nas mutações; leitura e CEP são liberados para ambos os perfis autenticados;
- **CEP:** aceita CEP mascarado ou não, devolve endereço completo ou parcial sem persistir dados do provider, trata inexistência, tamanho inválido e indisponibilidade de rede, abort, resposta HTTP, JSON ou payload;
- **OpenAPI:** documenta os contratos de criação, edição, status, exclusão, leitura e CEP.

**Por que estes testes existem**

Clientes é a primeira feature de negócio com regras de cadastro, autorização e integridade referencial. A exclusão depende tanto da decisão da aplicação quanto da FK `ON DELETE RESTRICT` do PostgreSQL.

**O que eles comprovam**

Regras de aplicação e HTTP, persistência real, constraints `UNIQUE` e FK, segurança por sessão/perfil/CSRF, contrato OpenAPI e integração ViaCEP isolada por mock.

**Infraestrutura utilizada**

Vitest, aplicação NestJS real, Supertest, Prisma/`DatabaseService`, PostgreSQL `portfolio_dev`, mock global de `fetch` e fixtures removidas ao final.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

**Observações**

A constraint física continua sendo a autoridade final para impedir exclusão concorrente de cliente com OS. O provider é mockado aqui; o smoke real está na seção de validações manuais.

### Funcionários

#### `backend/src/employees/employees.controller.spec.ts`

**Finalidade**

Exercita criação e consultas administrativas de Funcionários pelas rotas reais.

**Cenários cobertos**

- **criação:** Administrador cria funcionário ativo ou inativo sem conta, normaliza nome/telefone/e-mail e permite contatos duplicados;
- **validação:** rejeita nome, telefone, e-mail ou status inválidos, além de campos de conta, perfil, senha, administrativos ou inesperados;
- **segurança:** criação exige sessão, primeiro acesso concluído, perfil Administrador e CSRF; leituras exigem os três primeiros e não exigem CSRF;
- **lista e detalhe:** lista ativos por padrão, filtra inativos/todos, busca nome/e-mail sem distinguir caixa e telefone formatado, ordena por nome/ID, trata ID inválido/inexistente e mostra conta opcional ativa/inativa;
- **privacidade e OpenAPI:** não expõe hash, sessão, OS ou histórico e documenta criação, consultas e `conta` anulável.

**Por que estes testes existem**

Funcionário pode existir sem conta de acesso e as rotas administrativas não podem permitir criação indireta de credenciais nem vazar relações sensíveis.

**O que eles comprovam**

Comportamento HTTP, persistência real, normalização, autorização administrativa, proteção CSRF, privacidade dos DTOs e contrato OpenAPI.

**Infraestrutura utilizada**

Vitest, aplicação NestJS real, Supertest, Prisma/`DatabaseService`, PostgreSQL `portfolio_dev` e fixtures removidas ao final.

**Último resultado conhecido**

Aprovado como parte da suíte de 203 testes executada após `b938573 feat: add employee creation API`.

## Validações manuais e de navegador

Estas validações não correspondem a arquivos `.spec.ts`; registram evidências operacionais já documentadas.

### Autenticação no navegador

- **Fluxos validados:** login real, primeiro acesso, logout, sessão revogada seguida de reload e comportamento móvel.
- **Motivo:** confirmar que tela, roteamento, cookie de sessão e bootstrap do frontend funcionam juntos.
- **Resultado conhecido:** os fluxos foram validados em navegador durante a consolidação de autenticação N5.2H.

### Clientes end-to-end no navegador

- **Fluxos validados:** listagem real, filtros, busca, cadastro, edição, situação, exclusão, bloqueio por OS, visões de Administrador e Funcionário, cache e persistência após reload.
- **Motivo:** verificar integração entre interface, estado React, cache, API e banco que não é coberta pela suíte backend.
- **Resultado conhecido:** validação registrada na auditoria de Clientes N5.3.

### Auditoria N5.3: filtro Todos

- **Fluxo e resultado:** a API com `status=all` estava correta, mas o seletor visual voltava para Ativos.
- **Motivo:** o defeito de estado visual foi encontrado no navegador e não era detectado pelos testes de backend.
- **Correção relevante:** `1835291 fix: keep all clients filter selected`.
- **Observação:** demonstra a limitação atual da cobertura automatizada: o frontend ainda depende de lint, build e validações reais para encontrar falhas puramente visuais ou de estado.

### CEP: smoke e navegador

- **Testes automatizados relacionados:** `backend/src/clients/cep/via-cep.provider.spec.ts` controla timeout com `fetch` mockado; `backend/src/clients/clients.controller.spec.ts` também simula sucesso, inexistência e indisponibilidades do provider.
- **Smoke real:** a consulta externa do CEP `01001000` foi validada com sucesso, separadamente da suíte para não depender da internet.
- **Navegador:** autocomplete de endereço e fallback para preenchimento manual foram validados no fluxo de Clientes.

## Resultados consolidados

Os números são totais cumulativos da suíte do backend no respectivo marco, não a quantidade de testes criada apenas naquela etapa.

| Marco | Resultado |
| --- | ---: |
| N5.1 — fundação backend/banco | 16 testes |
| N5.2H — autenticação, sessão e revogação | 63 testes |
| N5.3A — leitura de Clientes | 83 testes |
| N5.3B — criação de Clientes | 110 testes |
| N5.3C — edição de Clientes | 137 testes |
| N5.3D — situação de Clientes | 147 testes |
| N5.3E — exclusão de Clientes | 160 testes |
| N5.3F — CEP | 173 testes |
| N5.4A — leitura de Funcionários | 186 testes |
| N5.4B — criação de Funcionários (`b938573`) | **203 testes** |

## Execução das verificações

Backend:

```bash
cd backend
npm test
npm run lint
npm run build
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Raiz:

```bash
git diff --check
```
