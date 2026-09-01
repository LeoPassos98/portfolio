# Configuração do projeto

## Repositório Git

O repositório foi inicializado com Git na branch principal `main` para versionar o projeto desde sua criação.

```bash
git init -b main
```

O remote `origin` usa SSH (`git@github.com:LeoPassos98/portfolio.git`) para permitir a comunicação autenticada com o GitHub.

## Frontend

O frontend foi criado com React, TypeScript e Vite para fornecer uma base tipada e um ambiente moderno de desenvolvimento e build.

```bash
npm create vite@latest frontend -- --template react-ts
```

O diretório do frontend concentra os comandos e as dependências da aplicação web.

```bash
cd frontend
```

As dependências declaradas pelo template foram instaladas para permitir o desenvolvimento e a compilação do frontend.

```bash
npm install
```

O build foi executado para confirmar que a base do frontend compila corretamente para produção.

```bash
npm run build
```

### Cliente HTTP e ambiente da API

O Axios é o transporte HTTP compartilhado do frontend. A instância em `src/shared/lib/http/apiClient.ts` usa `withCredentials: true` para que o navegador envie o cookie de sessão `HttpOnly`; o JavaScript não lê esse cookie.

```bash
cd frontend
npm install axios
```

Copie `frontend/.env.example` para `frontend/.env` e ajuste `VITE_API_URL` para a URL do NestJS local, como `http://localhost:3000`. A variável é obrigatória para evitar que o frontend se comunique silenciosamente com um destino incorreto; `.env` permanece ignorado pelo Git.

Para mutações, o cliente obtém `GET /auth/csrf` quando ainda não há token em memória e envia o resultado em `X-CSRF-Token` para `POST`, `PUT`, `PATCH` e `DELETE`. O token nunca é persistido no browser e é descartado após login, troca de senha de primeiro acesso ou logout, pois essas operações regeneram ou destroem a sessão no backend.

## Backend

O backend foi criado como uma aplicação NestJS independente no diretório `backend/`, mantendo sua instalação, execução e compilação separadas do frontend.

```bash
npx @nestjs/cli@latest new backend --package-manager npm --skip-git --skip-install
```

As dependências do backend foram instaladas no próprio diretório da aplicação.

```bash
cd backend
npm install
```

### Configuração de ambiente

O `@nestjs/config` carrega e disponibiliza as variáveis de ambiente por meio do `ConfigService`, enquanto o Zod valida esse contrato no startup do backend.

```bash
npm install @nestjs/config zod
```

Copie `backend/.env.example` para `backend/.env` e preencha os valores locais. O arquivo `.env` é ignorado pelo Git; o `.env.example` versionado define apenas nomes e valores seguros de exemplo.

### Prisma e PostgreSQL

O Prisma ORM fornece o Client tipado para acesso ao PostgreSQL. O adapter oficial `@prisma/adapter-pg` integra esse Client ao driver `pg`, enquanto o NestJS concentra esse acesso em `DatabaseModule` e `DatabaseService`.

```bash
cd backend
npm install @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.0
npm install --save-dev prisma@7.10.0 dotenv@17.2.4
npx prisma init --datasource-provider postgresql --output ../src/generated/prisma --no-skills
```

`prisma.config.ts` usa `DATABASE_URL` para os comandos do Prisma. Em runtime, a mesma variável é carregada e validada pela configuração central do NestJS e chega ao `DatabaseService` pelo `ConfigService`.

O Prisma Migrate usa uma shadow database local, dedicada e descartável para comparar migrations. Crie `portfolio_shadow` separadamente de `portfolio_dev` e configure sua URL em `SHADOW_DATABASE_URL`; ela pode ser resetada pelo Prisma e nunca deve conter dados reais.

```bash
createdb portfolio_shadow
```

Não use a mesma URL para `DATABASE_URL` e `SHADOW_DATABASE_URL`.

Após alterar o schema ou a configuração do generator, valide-o e gere novamente o Prisma Client:

```bash
npm run prisma:validate
npm run prisma:generate
```

### Modelo físico e migration inicial do domínio

O schema Prisma mapeia o modelo físico PostgreSQL de clientes, funcionários, usuários, ordens de serviço e seus snapshots históricos. A primeira migration foi produzida a partir de um schema vazio com `migrate diff`, sem conexão a um banco autenticado; o comando exige apenas que `DATABASE_URL` já esteja disponível para o `prisma.config.ts`, mas não acessa a URL quando as duas pontas do diff são schemas.

```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

O SQL gerado recebeu manualmente as constraints `CHECK (valor >= 0)` em `ordem_servico` e `historico_ordem_servico`, pois o Prisma Schema não representa `CHECK` diretamente. A segunda constraint mantém o snapshot submetido à mesma integridade monetária da ordem original.

### Sessões persistidas no PostgreSQL

O `express-session` controla o ciclo de sessão HTTP e mantém no cookie apenas o identificador assinado. O `connect-pg-simple` persiste os dados da sessão no PostgreSQL, usando a tabela de infraestrutura `session` versionada pelo Prisma Migrate; o startup não cria nem altera essa tabela.

```bash
cd backend
npm install express-session@1.19.0 connect-pg-simple@10.0.0
npm install --save-dev @types/express-session@1.19.0 @types/connect-pg-simple@7.0.3
npx prisma migrate dev --name add_session_store
```

A migration cria `session` com `sid` como chave primária, `sess` em JSON e `expire` com índice `IDX_session_expire`, estrutura compatível com o store. `SESSION_MAX_AGE_MS` controla a validade fixa, com padrão de 28.800.000 ms (8 horas), e deve ser um inteiro positivo. O store usa `disableTouch` e o middleware usa `rolling: false` para não renovar a expiração em cada acesso.

O cookie tem `HttpOnly`, `SameSite=Lax`, caminho `/` e `maxAge` configurável; `Secure` é habilitado somente em produção. Não há domínio configurado e nem dados de usuário no cookie. `SESSION_SECRET` assina o identificador de sessão e deve continuar sendo um segredo longo fora do controle de versão.

### Proteção CSRF e CORS

O backend usa o Synchronizer Token Pattern: `GET /auth/csrf` cria, persiste e retorna um token aleatório associado apenas à sessão server-side. O cliente deve enviar esse valor no cabeçalho `X-CSRF-Token` para `POST`, `PUT`, `PATCH` e `DELETE`; o token não é gravado em cookie próprio nem registrado em logs.

O token é invalidado naturalmente quando a sessão é regenerada no login ou na troca obrigatória de senha, ou destruída no logout. Após essas operações, obtenha um novo token com `GET /auth/csrf` antes de executar outra mutação.

O CORS usa a variável já obrigatória `FRONTEND_ORIGIN` como origem explícita, habilita `credentials: true` para o cookie de sessão e permite o cabeçalho `X-CSRF-Token`. Não use `origin: '*'` com autenticação por cookie. CORS controla quais origens o navegador pode chamar; CSRF valida que uma mutação apresentou o token ligado à sessão, e nenhum deles substitui a autorização do NestJS ou o `SameSite=Lax` do cookie.

### Documentação HTTP com OpenAPI

O `@nestjs/swagger` integra o NestJS à especificação OpenAPI e disponibiliza uma Swagger UI navegável para os contratos HTTP da API.

```bash
cd backend
npm install @nestjs/swagger@12.0.1
```

Com o backend em execução, a interface está em `http://localhost:3000/api/docs` e o documento OpenAPI JSON em `http://localhost:3000/api/docs/openapi.json`.

### Logs nativos do NestJS

O bootstrap usa exclusivamente `ConsoleLogger` e `Logger` nativos do NestJS. Em desenvolvimento e testes, os logs permanecem legíveis no terminal; em produção, a saída é estruturada em JSON para consumo pelo ambiente de execução.

```bash
cd backend
NODE_ENV=production npm run start:prod
```

Não são registrados segredos, credenciais, URLs de conexão completas, cookies, tokens ou corpos completos de requisições. Falhas internas retornam uma resposta HTTP sanitizada, enquanto a ocorrência é registrada internamente sem anexar mensagem ou stack arbitrárias.

### Hash de senhas com Argon2id

O pacote `argon2` fornece ao `PasswordService` uma infraestrutura reutilizável para gerar o hash persistível em `Usuario.senha_hash` e verificar senhas sem descriptografar ou armazenar a senha original. O algoritmo Argon2id usa salt gerado e incorporado automaticamente ao hash; o serviço adota uma configuração base de 19 MiB de memória, duas iterações e paralelismo 1.

```bash
cd backend
npm install argon2@0.45.1
```

## Tailwind CSS

O Tailwind CSS foi adicionado para permitir a criação dos estilos da interface por meio de classes utilitárias integradas ao Vite.

```bash
npm install tailwindcss @tailwindcss/vite
```

## Tipografia

A fonte variável IBM Plex Sans foi adicionada de forma self-hosted para ser empacotada com a aplicação, sem depender de uma requisição externa em runtime.

```bash
npm install @fontsource-variable/ibm-plex-sans
```

## Navegação

O React Router será responsável pela navegação client-side da SPA, usando Declarative Mode para definir a estrutura de rotas com componentes React.

```bash
npm install react-router
```

## Formulários

O React Hook Form foi adicionado para gerenciar o estado e a submissão dos formulários da aplicação.

```bash
npm install react-hook-form
```

## Validação

O Zod foi adicionado para definir os schemas de validação, enquanto `@hookform/resolvers` integra esses schemas ao React Hook Form.

```bash
npm install zod @hookform/resolvers
```
