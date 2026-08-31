# Mapa da Estrutura Backend

Este documento organiza os arquivos autorais relevantes do backend por famílias funcionais e estruturais. Dentro de cada família, os arquivos seguem a ordem de criação; quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

## Visão rápida

| Área | Responsabilidade | Arquivos |
| --- | --- | ---: |
| Entrada e composição | Inicialização do NestJS e endpoint raiz atual | 4 |
| Configuração de ambiente | Contrato de variáveis, valores de exemplo e validação no bootstrap | 2 |
| Infraestrutura de banco | Configuração Prisma, modelo físico, migration inicial e acesso PostgreSQL injetável | 5 |
| Validação HTTP | Pipe reutilizável para aplicar schemas Zod às entradas HTTP | 1 |
| Testes | Cobertura das validações de ambiente e HTTP | 2 |

## Sumário

- [Entrada e composição](#entrada-e-composição)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Infraestrutura de banco](#infraestrutura-de-banco)
- [Validação HTTP](#validação-http)
- [Testes](#testes)

---

## Entrada e composição

Inicializa a aplicação NestJS, reúne sua composição atual e fornece o endpoint raiz temporário.

Diretório principal: `backend/src/`

### 1. `backend/src/main.ts`

Cria a aplicação NestJS a partir de `AppModule`, habilita os hooks de desligamento, obtém a porta validada por `ConfigService` e inicia o servidor HTTP.

### 2. `backend/src/app.module.ts`

Compõe o módulo raiz: torna a configuração global com validação de ambiente, importa a infraestrutura de banco e registra o controller e o serviço atuais.

### 3. `backend/src/app.controller.ts`

Expõe temporariamente a rota raiz `GET /` e delega sua resposta a `AppService`.

### 4. `backend/src/app.service.ts`

Fornece a resposta temporária do endpoint raiz consumido por `AppController`.

---

## Configuração de ambiente

Define o contrato de execução local e valida as variáveis exigidas quando a aplicação é composta.

Diretório principal: `backend/src/config/`

### 1. `backend/.env.example`

Disponibiliza valores de referência para ambiente de desenvolvimento, porta, conexão PostgreSQL futura, segredo de sessão e origem do frontend.

### 2. `backend/src/config/environment.validation.ts`

Declara com Zod o schema das variáveis de ambiente, aplica valores padrão para ambiente e porta e interrompe o bootstrap com mensagens detalhadas quando a configuração é inválida.

---

## Infraestrutura de banco

Centraliza a configuração do Prisma e disponibiliza o acesso tipado ao PostgreSQL para os módulos NestJS que importarem `DatabaseModule`.

Diretórios principais: `backend/prisma/` e `backend/src/database/`

### 1. `backend/prisma.config.ts`

Configura o Prisma CLI, localiza o schema e recebe `DATABASE_URL` do ambiente para os comandos de banco.

### 2. `backend/prisma/schema.prisma`

Define o modelo físico PostgreSQL do domínio, seus enums e relações, além do generator `prisma-client` com saída local.

### 3. `backend/src/database/database.module.ts`

Expõe `DatabaseService` para que futuros módulos de domínio recebam o acesso ao banco por injeção de dependência.

### 4. `backend/src/database/database.service.ts`

Instancia o Prisma Client com o adapter PostgreSQL, obtém a URL pelo `ConfigService` e gerencia a conexão no ciclo de vida do NestJS.

### 5. `backend/prisma/migrations/20260831231500_initial_domain_schema/migration.sql`

Cria o esquema inicial PostgreSQL do domínio, incluindo tabelas, enums, índices, constraints de integridade e as chaves estrangeiras restritivas.

---

## Validação HTTP

Conecta schemas Zod ao ciclo de entrada HTTP do NestJS, sem regras de domínio ou formatação global de erros.

Diretório principal: `backend/src/common/validation/`

### 1. `backend/src/common/validation/zod-validation.pipe.ts`

Recebe um schema Zod, retorna seu valor parseado e transforma falhas em `BadRequestException` com as issues originais disponíveis para o futuro filtro global.

---

## Testes

Verifica os comportamentos autorais de validação que já participam ou participarão da aplicação.

Diretórios principais: `backend/src/config/` e `backend/src/common/validation/`

### 1. `backend/src/config/environment.validation.spec.ts`

Garante que a validação aceite a configuração mínima válida com padrões, rejeite variáveis obrigatórias ausentes e rejeite valores inválidos.

### 2. `backend/src/common/validation/zod-validation.pipe.spec.ts`

Garante o retorno de valores parseados, a preservação de transformações Zod, a rejeição HTTP de entradas inválidas e a disponibilidade das issues no response da exceção.
