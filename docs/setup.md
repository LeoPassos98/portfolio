# Configuração do projeto

Este guia explica como preparar um clone existente do sistema e registra as tecnologias e decisões de configuração já adotadas.

Destina-se a pessoas e agentes que precisam executar o projeto localmente ou manter sua infraestrutura sem depender do histórico de implementação.

## Sumário

- [Antes de começar](#antes-de-começar)
- [Preparar um clone existente](#preparar-um-clone-existente)
- [Configuração importante](#configuração-importante)
  - [Variáveis de ambiente](#variáveis-de-ambiente)
  - [Banco, Prisma e migrations](#banco-prisma-e-migrations)
  - [Sessão, CSRF e CORS](#sessão-csrf-e-cors)
  - [Documentação HTTP, CEP e logs](#documentação-http-cep-e-logs)
- [Tecnologias configuradas](#tecnologias-configuradas)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Interface e formulários](#interface-e-formulários)

---

## Antes de começar

| Pré-requisito            | Uso no projeto                                         |
| ------------------------ | ------------------------------------------------------ |
| Git                      | Obter e atualizar o repositório.                       |
| Node.js e npm            | Instalar dependências, executar Vite e NestJS.         |
| PostgreSQL               | Persistir o domínio, as sessões e executar migrations. |
| Usuário PostgreSQL local | Criar as bases indicadas nas URLs de ambiente.         |

O frontend usa, por padrão, `http://localhost:5173`; o backend usa `http://localhost:3000`. Ajuste as variáveis de ambiente se esses endereços não estiverem disponíveis.

## Preparar um clone existente

### 1. Instalar dependências

Na raiz do repositório, instale cada aplicação separadamente:

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Criar os arquivos de ambiente

Copie os exemplos versionados e substitua os valores de exemplo por dados locais seguros:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` contém as credenciais de banco e o segredo de sessão; não deve ser versionado. `frontend/.env` define `VITE_API_URL`, a URL pública da API consumida pelo navegador.

### 3. Preparar o PostgreSQL

Crie duas bases distintas, usando os nomes definidos em `DATABASE_URL` e `SHADOW_DATABASE_URL`. Com os valores de exemplo, elas são `portfolio` e `portfolio_shadow`:

```bash
createdb -U portfolio_user portfolio
createdb -U portfolio_user portfolio_shadow
```

A shadow database é descartável e usada pelo Prisma Migrate para comparar migrations. Nunca use uma base com dados reais como `SHADOW_DATABASE_URL`.

O último resultado consolidado da suíte integrada usou `portfolio_dev`. Se esse for o nome definido no seu ambiente, crie essa base em vez de `portfolio`.

### 4. Gerar o cliente e aplicar migrations

Depois de configurar as URLs do banco, valide a configuração, gere o Prisma Client e aplique as migrations já versionadas:

```bash
cd backend
npm run prisma:validate
npm run prisma:generate
npx prisma migrate deploy
```

### 5. Iniciar as aplicações

Em terminais separados:

```bash
cd backend
npm run start:dev
```

```bash
cd frontend
npm run dev
```

O backend expõe a Swagger UI em `http://localhost:3000/api/docs`. Para escolher as verificações após uma alteração, consulte [Testes e validações](testing.md).

## Configuração importante

### Variáveis de ambiente

| Arquivo         | Variáveis                                                 | Finalidade                                                           |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| `backend/.env`  | `NODE_ENV`, `PORT`, `DATABASE_URL`, `SHADOW_DATABASE_URL` | Ambiente, porta e conexões PostgreSQL.                               |
| `backend/.env`  | `SESSION_SECRET`, `SESSION_MAX_AGE_MS`, `FRONTEND_ORIGIN` | Assinatura e duração da sessão, além da origem autorizada pelo CORS. |
| `frontend/.env` | `VITE_API_URL`                                            | URL do NestJS usada pelo Axios.                                      |

O backend valida seu ambiente com Zod no startup.

`SESSION_MAX_AGE_MS` deve ser um inteiro positivo; o padrão é 28.800.000 ms (8 horas). `SESSION_SECRET` deve ser longo, secreto e exclusivo do ambiente.

### Banco, Prisma e migrations

O Prisma fornece acesso tipado ao PostgreSQL por meio de `DatabaseModule` e `DatabaseService`. O adapter oficial `@prisma/adapter-pg` usa o driver `pg`.

`prisma.config.ts` lê as duas URLs de ambiente.

A migration inicial inclui constraints `CHECK (valor >= 0)` em `ordem_servico` e `historico_ordem_servico`.

Elas existem porque o Prisma Schema não representa esse tipo de constraint diretamente.

Ao alterar `schema.prisma`, valide e gere novamente o cliente:

```bash
cd backend
npm run prisma:validate
npm run prisma:generate
```

Use `npx prisma migrate dev --name <nome-da-migration>` somente ao criar uma migration local. Para aplicar as migrations já versionadas em um clone, use o comando da etapa 4.

### Sessão, CSRF e CORS

`express-session` mantém no cookie apenas o identificador assinado. `connect-pg-simple` persiste a sessão na tabela `session`; o startup não cria nem altera essa tabela.

O cookie usa `HttpOnly`, `SameSite=Lax`, caminho `/` e duração configurável. `Secure` é ativado apenas em produção.

O store usa `disableTouch` e o middleware usa `rolling: false`, portanto cada acesso não renova a expiração.

Para mutações, o frontend obtém `GET /auth/csrf` e envia o token em `X-CSRF-Token` para `POST`, `PUT`, `PATCH` e `DELETE`.

O token fica somente em memória e é invalidado quando login, primeiro acesso ou logout regeneram ou encerram a sessão.

`FRONTEND_ORIGIN` define uma única origem explícita para o CORS com credenciais. Não use `origin: '*'` com autenticação por cookie.

CORS restringe origens; CSRF valida a mutação; autorização do NestJS continua sendo uma camada separada.

### Documentação HTTP, CEP e logs

Com o backend em execução, a Swagger UI está em `http://localhost:3000/api/docs`, e o OpenAPI JSON está em `http://localhost:3000/api/docs/openapi.json`.

`GET /clients/cep/:cep` consulta o ViaCEP pelo `fetch` nativo do Node. O navegador consome apenas o contrato interno do backend.

A integração tem timeout e os testes usam mocks, sem depender da internet.

O NestJS usa `ConsoleLogger` e `Logger` nativos. Em desenvolvimento e testes, os logs são legíveis; em produção, são JSON.

Logs e respostas sanitizadas não incluem segredos, credenciais, URLs completas de conexão, cookies, tokens ou corpos completos de requisição.

## Tecnologias configuradas

Esta seção registra comandos usados ao adicionar tecnologias ao projeto.

Não os execute novamente apenas para preparar um clone existente; para isso, use `npm install` na seção inicial.

### Frontend

| Tecnologia               | Motivo                                                                  | Comando registrado                                       |
| ------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| React, TypeScript e Vite | Base tipada da SPA e ambiente de desenvolvimento e build.               | `npm create vite@latest frontend -- --template react-ts` |
| Axios                    | Cliente HTTP compartilhado com `withCredentials` e CSRF em memória.     | `cd frontend && npm install axios`                       |
| TanStack Query           | Cache e coordenação de server state, sem substituir o estado de sessão. | `cd frontend && npm install @tanstack/react-query`       |

### Backend

| Tecnologia                        | Motivo                                                           | Comando registrado                                                                    |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| NestJS                            | API independente, módulos e infraestrutura de execução.          | `npx @nestjs/cli@latest new backend --package-manager npm --skip-git --skip-install`  |
| `@nestjs/config` e Zod            | Leitura e validação do ambiente no startup.                      | `cd backend && npm install @nestjs/config zod`                                        |
| Prisma, adapter PostgreSQL e `pg` | Client tipado e acesso PostgreSQL pelo NestJS.                   | `cd backend && npm install @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.0` |
| Prisma CLI e dotenv               | Migrations, geração de client e leitura de ambiente pelo Prisma. | `cd backend && npm install --save-dev prisma@7.10.0 dotenv@17.2.4`                    |
| Sessões PostgreSQL                | Sessão server-side persistida e revogável.                       | `cd backend && npm install express-session@1.19.0 connect-pg-simple@10.0.0`           |
| OpenAPI                           | Swagger UI e contrato HTTP navegável.                            | `cd backend && npm install @nestjs/swagger@12.0.1`                                    |
| Argon2id                          | Hash e verificação reutilizáveis de senhas.                      | `cd backend && npm install argon2@0.45.1`                                             |

### Interface e formulários

| Tecnologia      | Motivo                                                | Comando registrado                                              |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| Tailwind CSS    | Classes utilitárias integradas ao Vite.               | `cd frontend && npm install tailwindcss @tailwindcss/vite`      |
| IBM Plex Sans   | Fonte self-hosted, sem requisição externa em runtime. | `cd frontend && npm install @fontsource-variable/ibm-plex-sans` |
| React Router    | Navegação client-side declarativa da SPA.             | `cd frontend && npm install react-router`                       |
| React Hook Form | Estado e submissão de formulários.                    | `cd frontend && npm install react-hook-form`                    |
| Zod e resolvers | Schemas de validação integrados aos formulários.      | `cd frontend && npm install zod @hookform/resolvers`            |
