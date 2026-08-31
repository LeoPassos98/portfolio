# Mapa da Estrutura Backend

Este documento organiza os arquivos autorais relevantes do backend por famílias funcionais e estruturais. Dentro de cada família, os arquivos seguem a ordem de criação; quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

## Visão rápida

| Área | Responsabilidade | Arquivos |
| --- | --- | ---: |
| Entrada e composição | Inicialização do NestJS e endpoint raiz atual | 4 |
| Configuração de ambiente | Contrato de variáveis, valores de exemplo e validação no bootstrap | 2 |
| Testes | Cobertura da validação do contrato de ambiente | 1 |

## Sumário

- [Entrada e composição](#entrada-e-composição)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Testes](#testes)

---

## Entrada e composição

Inicializa a aplicação NestJS, reúne sua composição atual e fornece o endpoint raiz temporário.

Diretório principal: `backend/src/`

### 1. `backend/src/main.ts`

Cria a aplicação NestJS a partir de `AppModule`, obtém a porta validada por `ConfigService` e inicia o servidor HTTP.

### 2. `backend/src/app.module.ts`

Compõe o módulo raiz: torna a configuração global com validação de ambiente e registra o controller e o serviço atuais.

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

## Testes

Verifica o comportamento autoral de configuração que já participa da inicialização do backend.

Diretório principal: `backend/src/config/`

### 1. `backend/src/config/environment.validation.spec.ts`

Garante que a validação aceite a configuração mínima válida com padrões, rejeite variáveis obrigatórias ausentes e rejeite valores inválidos.
