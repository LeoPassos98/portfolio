# Testes e validações do projeto

Este documento é o catálogo dos testes e validações que realmente existem ou já foram executados no projeto. Destina-se a pessoas e agentes que precisam localizar uma cobertura, entender o risco comprovado ou escolher uma verificação antes de alterar o código.

Os arquivos de teste são a fonte executável. Aqui estão o mapa para encontrá-los e o contexto mínimo para interpretá-los; o documento não substitui a leitura do teste.

## Visão rápida

| Estado                       | Registro atual                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Suíte do backend             | Vitest, com Supertest nas rotas integradas                                                                |
| Infraestrutura integrada     | Aplicação NestJS, Prisma/`DatabaseService` e PostgreSQL `portfolio_dev`                                   |
| Arquivos catalogados         | 15 arquivos `*.spec.ts` na suíte principal e o smoke e2e `backend/test/app.e2e-spec.ts`                   |
| Frontend                     | Não possui suíte automatizada própria nem script de teste; validações de navegador estão separadas abaixo |
| Último resultado consolidado | **279 testes aprovados** na administração da situação da conta de acesso no backend                       |

## Executar agora

Estes comandos verificam o estado atual do código. Eles não atualizam os resultados históricos registrados neste documento.

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

## Sumário

- [Catálogo de testes automatizados](#catálogo-de-testes-automatizados)
  - [Aplicação, configuração e HTTP](#aplicação-configuração-e-http)
  - [Credenciais, sessão e guards](#credenciais-sessão-e-guards)
  - [Autenticação HTTP](#autenticação-http)
  - [Clientes e CEP](#clientes-e-cep)
  - [Funcionários](#funcionários)
- [Validações manuais e de navegador](#validações-manuais-e-de-navegador)
- [Resultados consolidados](#resultados-consolidados)

---

## Catálogo de testes automatizados

Salvo a exceção indicada no smoke e2e, os arquivos `*.spec.ts` deste catálogo foram aprovados como parte da suíte de **279 testes** executada na administração da situação da conta de acesso no backend. Os resultados são cumulativos: não representam a quantidade criada por arquivo ou família.

Os arquivos da suíte principal executam em série porque compartilham o PostgreSQL `portfolio_dev`; as requisições concorrentes continuam sendo exercitadas explicitamente dentro dos testes que dependem dessa propriedade.

As tabelas seguintes são o índice de consulta rápida. Os três arquivos com muitos fluxos possuem um detalhamento por operação logo abaixo da tabela de sua família.

### Aplicação, configuração e HTTP

| Arquivo                                                                                                                     | Finalidade e cenários relevantes                                                                                                                 | Regra ou risco comprovado                                                               | Infraestrutura importante                                          |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`backend/src/app.controller.spec.ts`](../backend/src/app.controller.spec.ts)                                               | `AppController.getHello()` retorna `Hello World!`.                                                                                               | Controller e serviço base compõem o módulo de testes do NestJS.                         | NestJS `TestingModule`.                                            |
| [`backend/test/app.e2e-spec.ts`](../backend/test/app.e2e-spec.ts)                                                           | `GET /` responde `200` com `Hello World!`.                                                                                                       | Smoke do caminho HTTP básico, além do teste direto do controller.                       | Vitest, `TestingModule`, aplicação NestJS e Supertest.             |
| [`backend/src/config/environment.validation.spec.ts`](../backend/src/config/environment.validation.spec.ts)                 | Aceita as variáveis obrigatórias e seus defaults; rejeita `DATABASE_URL` ausente, porta inválida e duração não positiva.                         | O bootstrap não inicia com configuração incompleta ou insegura de banco, sessão e CORS. | Vitest e schema de ambiente Zod.                                   |
| [`backend/src/common/validation/zod-validation.pipe.spec.ts`](../backend/src/common/validation/zod-validation.pipe.spec.ts) | Aceita entrada parseada, preserva transformações Zod e devolve `BadRequestException` com as issues.                                              | DTOs normalizam dados e expõem erros de schema consistentes na camada HTTP.             | Vitest, Zod e `ZodValidationPipe` isolado.                         |
| [`backend/src/common/errors/http-exception.filter.spec.ts`](../backend/src/common/errors/http-exception.filter.spec.ts)     | Normaliza Zod, 401, 403, 404 e 409; preserva exceções de domínio; sanitiza falhas inesperadas; sempre responde `statusCode`, `code` e `message`. | O contrato público de erro permanece estável sem vazar detalhes internos.               | Vitest, `HttpExceptionFilter`, exceções NestJS e mock de `Logger`. |

Observação do smoke e2e: `app.e2e-spec.ts` é selecionado por `npm run test:e2e`, não pelos 203 testes de `npm test`, pois `vitest.config.ts` inclui apenas `*.spec.ts`. Não há resultado consolidado separado para esse comando.

### Credenciais, sessão e guards

| Arquivo                                                                                                                           | Finalidade e cenários relevantes                                                                                                                         | Regra ou risco comprovado                                                                   | Infraestrutura importante                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`backend/src/auth/password/password.service.spec.ts`](../backend/src/auth/password/password.service.spec.ts)                     | Hash Argon2id não expõe a senha; senha correta é aceita, incorreta é rejeitada; hashes da mesma senha diferem e continuam verificáveis.                  | Credenciais persistidas não dependem de hash determinístico nem expõem senha em texto puro. | Vitest e `PasswordService` com Argon2id real.                                       |
| [`backend/src/auth/session/session.middleware.spec.ts`](../backend/src/auth/session/session.middleware.spec.ts)                   | `Secure` somente em produção; `HttpOnly`, `SameSite=Lax`, caminho `/`, `maxAge` configurado, sem domínio ou rolling renewal.                             | Cookie e expiração são coerentes com sessão autenticada server-side.                        | Vitest e `createSessionOptions` isolada.                                            |
| [`backend/src/auth/session/session-store.service.spec.ts`](../backend/src/auth/session/session-store.service.spec.ts)             | Persiste e restaura sessão assinada; não renova sessão expirada; revoga apenas o usuário alvo, sessões e CSRF; trata revogação vazia e shutdown.         | Sessões sobrevivem ao HTTP, expiram, isolam usuários e podem ser revogadas no PostgreSQL.   | Vitest, Express, Supertest, `connect-pg-simple`, `pg` e PostgreSQL `portfolio_dev`. |
| [`backend/src/auth/guards/csrf.guard.spec.ts`](../backend/src/auth/guards/csrf.guard.spec.ts)                                     | `GET`, `HEAD` e `OPTIONS` dispensam token; mutações rejeitam token ausente ou divergente e aceitam token da sessão.                                      | Mutações são protegidas sem bloquear métodos seguros.                                       | Vitest, `CsrfGuard` e contexto HTTP simulado.                                       |
| [`backend/src/auth/guards/session.guard.spec.ts`](../backend/src/auth/guards/session.guard.spec.ts)                               | Ausência de `usuarioId` não consulta serviço; usuário ativo gera principal seguro; usuário inexistente ou inativo destrói sessão.                        | A identidade da sessão é revalidada e não expõe senha ou hash no request.                   | Vitest, mock de `AuthService` e contexto HTTP simulado.                             |
| [`backend/src/auth/guards/first-access-completed.guard.spec.ts`](../backend/src/auth/guards/first-access-completed.guard.spec.ts) | `deveAlterarSenha` gera `AUTH_PASSWORD_CHANGE_REQUIRED`; usuário regular é liberado.                                                                     | A regra de primeiro acesso é aplicada no backend, independente da interface.                | Vitest e contexto HTTP simulado.                                                    |
| [`backend/src/auth/guards/role.guard.spec.ts`](../backend/src/auth/guards/role.guard.spec.ts)                                     | Perfis compatíveis e múltiplos perfis são aceitos; handler sem metadata é livre; incompatibilidade retorna `AUTH_FORBIDDEN`; não acessa sessão ou banco. | Autorização declarativa por `@Roles` permanece isolada do guard de sessão.                  | Vitest, `Reflector`, decorator `Roles` e contexto HTTP simulado.                    |

### Autenticação HTTP

#### [`backend/src/auth/auth.controller.spec.ts`](../backend/src/auth/auth.controller.spec.ts)

Exercita CSRF, login, sessão, primeiro acesso e logout pelas rotas reais de autenticação.

| Fluxo           | Cenários concretos                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSRF            | Cria, persiste e reutiliza token sem cookie dedicado; CORS é restritivo e o preflight é correto.                                                            |
| Login           | Exige CSRF, normaliza somente o e-mail, preserva espaços da senha e responde igualmente para senha incorreta, e-mail desconhecido ou conta inativa.         |
| Sessão          | Grava somente `usuarioId` no PostgreSQL, não expõe segredos, regenera o identificador, restaura sessão, invalida conta inativada e rejeita sessão revogada. |
| Primeiro acesso | Troca senha, preserva espaços, regenera sessão e rejeita limites, confirmação, sessão ou conta inválidas e troca não pendente.                              |
| Logout          | Exige CSRF novo após regeneração, encerra a sessão PostgreSQL e limpa o cookie.                                                                             |

Por que importa: autenticação reúne credenciais, sessão e controles de segurança que não podem ser demonstrados somente por mocks ou pela tela de login. O arquivo comprova comportamento HTTP, persistência real de sessão, rotação de identificadores e tokens, autorização de primeiro acesso, CORS e ausência de dados sensíveis nas respostas.

Infraestrutura: Vitest, aplicação NestJS real, Supertest, Prisma/`DatabaseService`, `pg`, PostgreSQL `portfolio_dev` e fixtures removidas ao final.

### Clientes e CEP

| Arquivo                                                                                                   | Finalidade e cenários relevantes                                                           | Regra ou risco comprovado                                              | Infraestrutura importante                     |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------- |
| [`backend/src/clients/cep/via-cep.provider.spec.ts`](../backend/src/clients/cep/via-cep.provider.spec.ts) | `fetch` é abortado após `VIA_CEP_TIMEOUT_MS` e a falha vira `CepProviderUnavailableError`. | Um fornecedor externo não deixa a requisição pendente indefinidamente. | Vitest, fake timers e mock global de `fetch`. |

#### [`backend/src/clients/clients.controller.spec.ts`](../backend/src/clients/clients.controller.spec.ts)

Exercita o ciclo HTTP de Clientes, incluindo CEP, contra a aplicação e o banco reais.

| Operação  | Cenários concretos                                                                                                                                                                                                    | Regra ou risco comprovado                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Criação   | Administrador e Funcionário criam cliente; normaliza cadastro, armazena CPF/CNPJ em dígitos, permite documento ausente e traduz `UNIQUE` em `CLIENT_DOCUMENT_ALREADY_EXISTS`.                                         | Cadastro aceita os dois perfis autorizados e protege a unicidade de documento.       |
| Edição    | Ambos editam ativos ou inativos sem alterar status; normaliza campos; mantém, troca ou remove documento quando permitido; rejeita duplicidade, IDs inválidos ou inexistentes e campos administrativos ou inesperados. | Edição preserva as fronteiras entre dados cadastrais e administrativos.              |
| Situação  | Somente Administrador ativa, inativa e repete estado, inclusive com OS vinculada; valida body, ID e inexistência.                                                                                                     | Alteração de situação é uma decisão administrativa explícita.                        |
| Exclusão  | Somente Administrador exclui cliente sem OS; bloqueia qualquer status de OS vinculada e traduz a proteção de FK na corrida entre consulta e `DELETE`.                                                                 | A regra da aplicação e a FK `ON DELETE RESTRICT` protegem a integridade referencial. |
| Consulta  | Lista ativos por padrão; filtra ativo, inativo ou todos; busca nome ou documento normalizado; ordena por nome e ID; devolve DTOs seguros; trata detalhe inválido, inexistente e com OS.                               | Consultas retornam dados seguros, ordenados e compatíveis com filtros.               |
| Segurança | Operações protegidas exigem sessão e primeiro acesso concluído; mutações exigem CSRF; leitura e CEP são liberados para ambos os perfis autenticados.                                                                  | Sessão, perfil e CSRF protegem cada operação conforme seu risco.                     |
| CEP       | Aceita CEP mascarado ou não; devolve endereço completo ou parcial sem persistir provider; trata inexistência, tamanho inválido e falhas de rede, abort, HTTP, JSON ou payload.                                        | A integração é resiliente e não vaza o contrato externo para a persistência.         |
| OpenAPI   | Documenta criação, edição, status, exclusão, leitura e CEP.                                                                                                                                                           | O contrato HTTP publicado corresponde às operações testadas.                         |

Infraestrutura: Vitest, aplicação NestJS real, Supertest, Prisma/`DatabaseService`, PostgreSQL `portfolio_dev`, mock global de `fetch` e fixtures removidas ao final.

Observação: a constraint física continua sendo a autoridade final para impedir exclusão concorrente de cliente com OS. O provider é mockado aqui; o smoke real está nas [validações manuais e de navegador](#validações-manuais-e-de-navegador).

### Funcionários

#### [`backend/src/employees/employees.controller.spec.ts`](../backend/src/employees/employees.controller.spec.ts)

Exercita criação, edição cadastral, situações do cadastro e da conta, criação explícita de conta e consultas administrativas de Funcionários pelas rotas reais.

| Operação              | Cenários concretos                                                                                                                                                                                                                                                                                                                                                                                               | Regra ou risco comprovado                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Criação               | Administrador cria funcionário ativo ou inativo sem conta, normaliza nome, telefone e e-mail e permite contatos duplicados.                                                                                                                                                                                                                                                                                      | Funcionário pode existir sem conta de acesso.                                                                    |
| Criação de conta      | Administrador cria conta para Funcionário sem acesso, com e-mail normalizado e único, perfis Funcionário ou Administrador, senha Argon2id verificável e troca obrigatória pendente. A conta inicia com a situação do Funcionário: ativa para cadastro ativo e inativa para cadastro inativo; a reativação posterior não a reativa. Rejeita e-mail ou conta duplicados, entrada inválida e corrida na constraint. | A conta é uma ação administrativa separada, segura e protegida pela unicidade do PostgreSQL.                     |
| Situação da conta     | Administrador suspende e reativa acesso sem alterar o cadastro, mesmo com OS ativa; transições repetidas são idempotentes; reativação preserva hash, troca obrigatória, perfil e e-mail e exige Funcionário ativo. Trata UUID/body estritos, `EMPLOYEE_ACCESS_NOT_FOUND`, `EMPLOYEE_MUST_BE_ACTIVE_FOR_ACCOUNT_ACTIVATION` e `LAST_ACTIVE_ADMIN_REQUIRED`.                                                       | Cadastro e acesso permanecem controles independentes sem violar as invariantes de autenticação.                  |
| Edição cadastral      | Administrador edita funcionário ativo ou inativo; persiste e retorna nome, telefone e e-mail normalizados; permite contatos duplicados; preserva situação, criação, conta e relações; trata ID inválido ou `EMPLOYEE_NOT_FOUND`.                                                                                                                                                                                 | A edição não transfere responsabilidades administrativas ou de acesso para o cadastro.                           |
| Situação              | Administrador ativa, inativa e repete situação; bloqueia OS `AGUARDANDO` ou `EM_ANDAMENTO`; permite `CONCLUIDO` ou `CANCELADO`; preserva a conta inativa após reativação e trata `EMPLOYEE_HAS_ACTIVE_ORDERS` e `LAST_ACTIVE_ADMIN_REQUIRED`.                                                                                                                                                                    | A inativação mantém consistência entre cadastro, OS e acesso.                                                    |
| Conta e concorrência  | Inativação do cadastro ou somente da conta preserva credenciais, revoga todas as sessões e o contexto CSRF do alvo e mantém sessões de terceiros. Reativação não recupera sessões. Requisições simultâneas de suspensão nunca removem todos os Administradores ativos; corrida entre reativação da conta e inativação do Funcionário nunca termina com cadastro inativo e conta ativa.                           | As transações serializáveis e suas retentativas protegem os invariantes de acesso e continuidade administrativa. |
| Validação             | Rejeita nome, telefone ou e-mail inválidos e, na edição, `status`, `ativo`, campos de conta, credenciais, identificadores, datas ou campos inesperados. Na criação de conta, valida UUID, e-mail, perfil, senha exata de 8–128 caracteres, confirmação e body estrito.                                                                                                                                           | As rotas não permitem mass assignment nem criação ou alteração indireta de credenciais.                          |
| Segurança             | Criação, edição, situações do cadastro e da conta e criação de conta exigem sessão, primeiro acesso concluído, perfil Administrador e CSRF; leituras exigem os três primeiros e não exigem CSRF. Conta suspensa não autentica, e a autossuspensão administrativa é permitida somente quando outro Administrador ativo permanece.                                                                                 | Cada operação recebe a proteção proporcional ao seu risco.                                                       |
| Lista e detalhe       | Lista ativos por padrão; filtra inativos ou todos; busca nome ou e-mail sem distinguir caixa e telefone formatado; ordena por nome e ID; trata detalhe inexistente e mostra conta opcional ativa ou inativa.                                                                                                                                                                                                     | Consultas administrativas são previsíveis e preservam a relação de conta opcional.                               |
| Privacidade e OpenAPI | Não expõe hash, senha, confirmação, sessão, CSRF, OS ou histórico; documenta criação, criação de conta, edição cadastral, situações, conflitos e `conta` anulável.                                                                                                                                                                                                                                               | DTOs e contrato HTTP não vazam relações sensíveis e delimitam as operações da conta.                             |

Infraestrutura: Vitest, aplicação NestJS real, Supertest, Prisma/`DatabaseService`, PostgreSQL `portfolio_dev`, fixtures e sessões auxiliares removidas ao final.

## Validações manuais e de navegador

Estas validações não correspondem a arquivos `.spec.ts`; registram evidências operacionais que complementam a cobertura automatizada.

| Validação                        | Fluxo e motivo                                                                                                                                                                                                       | Resultado conhecido                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação no navegador        | Login real, primeiro acesso, logout, sessão revogada seguida de reload e comportamento móvel. Confirma tela, roteamento, cookie de sessão e bootstrap do frontend.                                                   | Validada em navegador durante a consolidação de autenticação N5.2H.                                                              |
| Clientes end-to-end no navegador | Listagem real, filtros, busca, cadastro, edição, situação, exclusão, bloqueio por OS, visões de Administrador e Funcionário, cache e persistência após reload. Verifica interface, estado React, cache, API e banco. | Registrada na auditoria de Clientes N5.3.                                                                                        |
| Auditoria N5.3: filtro Todos     | A API com `status=all` estava correta, mas o seletor visual voltava para Ativos. O defeito de estado visual não era detectado pelos testes de backend.                                                               | Corrigido em `1835291 fix: keep all clients filter selected`. Demonstra a limitação atual da cobertura automatizada do frontend. |
| CEP: smoke e navegador           | O provider usa `fetch` mockado nos testes automatizados; separadamente, foram validados o CEP real `01001000`, o autocomplete de endereço e o fallback para preenchimento manual.                                    | Smoke real bem-sucedido e fluxo de Clientes validado no navegador, sem fazer a suíte depender da internet.                       |

## Resultados consolidados

Os números são totais cumulativos da suíte do backend no respectivo marco, não a quantidade de testes criada apenas naquela etapa.

| Marco                                       |      Resultado |
| ------------------------------------------- | -------------: |
| N5.1 — fundação backend/banco               |      16 testes |
| N5.2H — autenticação, sessão e revogação    |      63 testes |
| N5.3A — leitura de Clientes                 |      83 testes |
| N5.3B — criação de Clientes                 |     110 testes |
| N5.3C — edição de Clientes                  |     137 testes |
| N5.3D — situação de Clientes                |     147 testes |
| N5.3E — exclusão de Clientes                |     160 testes |
| N5.3F — CEP                                 |     173 testes |
| N5.4A — leitura de Funcionários             |     186 testes |
| N5.4B — criação de Funcionários (`b938573`) | **203 testes** |
| N5.4C — edição cadastral de Funcionários    | **227 testes** |
| N5.4D — situação de Funcionários            | **248 testes** |
| N5.4E — correção do invariante de conta     | **264 testes** |
| N5.4 — situação da conta de acesso          | **279 testes** |
