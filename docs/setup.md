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
