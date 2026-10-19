# Publicação e operação das aplicações

Este guia destina-se a quem mantém os três serviços publicados do repositório. Documenta diretórios, domínios, variáveis, artefatos e comandos de manutenção. A Etapa 8 é uma limpeza local: não autoriza commit, push, deploy, migrations ou mudanças de infraestrutura.

## Sumário

- [Estado publicado e limites](#estado-publicado-e-limites)
- [Frontends no Cloudflare](#frontends-no-cloudflare)
- [Backend e PostgreSQL no Northflank](#backend-e-postgresql-no-northflank)
- [Scripts operacionais](#scripts-operacionais)
- [Verificação e manutenção](#verificação-e-manutenção)
- [Reversão](#reversão)
- [Histórico da migração](#histórico-da-migração)

## Estado publicado e limites

O responsável confirmou a publicação da modularização com referência em `4e1db94` e o acesso aos dois frontends. Os três domínios responderam às consultas de leitura da Etapa 8; os resultados concretos estão em [Testes e validações](testing.md). Os painéis não foram inspecionados nesta etapa, portanto os valores abaixo representam a configuração exigida pelo código, sem certificar filtros, secrets ou estado atual de gatilhos externos.

| Aplicação | Diretório do pacote | Identidade conhecida | Domínio publicado |
| --- | --- | --- | --- |
| Site | `apps/site/frontend/` | Wrangler `portfolio-site` | https://leonardopassos.com |
| Frontend OS | `apps/sistema-os/frontend/` | Wrangler `portfolio-sistema-os` | https://os.leonardopassos.com |
| API OS | `apps/sistema-os/backend/` | Serviço `portfolio-api` | https://os-api.leonardopassos.com |

Cada aplicação tem package, lockfile, ambiente e build próprios; não existem workspaces, biblioteca compartilhada ou imports entre aplicações. PostgreSQL permanece separado no Northflank. O site funciona sem API ou autenticação; o OS concentra autenticação e geração DEMO em `/login`. A rota frontend `/demo` foi removida, sem tratamento especial no Router; `POST /demo/access` permanece no backend. Os links do site apontam diretamente para `/login`.

O Worker antigo **`portfolio` ainda depende de remoção manual no Cloudflare, caso continue existindo**. Antes de excluí-lo, conferir que os domínios/rotas ativos pertencem aos Workers atuais e que há artefatos de reversão adequados. Nenhum Worker ou serviço foi excluído nesta limpeza.

## Frontends no Cloudflare

| Campo | Site | Frontend OS |
| --- | --- | --- |
| Repositório / branch | `LeoPassos98/portfolio`, `main` | `LeoPassos98/portfolio`, `main` |
| Root directory | `apps/site/frontend` | `apps/sistema-os/frontend` |
| Build command | `npm ci --include=dev && npm run build` | `npm ci --include=dev && npm run build` |
| Deploy command | `npx wrangler deploy --config wrangler.jsonc` | `npx wrangler deploy --config wrangler.jsonc` |
| Artefato | `dist/` local do pacote | `dist/` local do pacote |
| Variáveis de build | `VITE_OS_URL=https://os.leonardopassos.com` | `VITE_API_URL=https://os-api.leonardopassos.com`, `VITE_SITE_URL=https://leonardopassos.com` |
| Domínio | `leonardopassos.com` | `os.leonardopassos.com` |
| Filtros a conferir | `apps/site/frontend/**` | `apps/sistema-os/frontend/**` |

Os comandos da tabela são procedimentos de publicação e exigem autorização; não foram executados na Etapa 8. A instalação inclui dependências de build/deploy mesmo com NODE_ENV de produção. As variáveis VITE são públicas e incorporadas ao JavaScript: fornecê-las somente no runtime do Worker não muda o bundle. `.env.production.example` não é carregado automaticamente pelo Vite e nunca deve conter secrets.

Cada Wrangler usa assets em `./dist/`, compatibilidade `2026-09-16` e `not_found_handling: single-page-application`. O fallback serve index com HTTP 200; o site mostra página não encontrada, enquanto o OS resolve guards/login pelo Router. Cada aplicação possui fonte, estilos, assets e favicon próprios.

Builds/previews/PRs, hooks e filtros efetivos precisam ser conferidos no painel antes de enviar mudanças estruturais. A remoção do frontend antigo não deve reativar ou republicar o Worker legado. Não ampliar o CORS da API para permitir hosts de preview.

## Backend e PostgreSQL no Northflank

O pipeline conhecido, informado pelo responsável, contém `portfolio-backend-build`, Job `portfolio-migrate` com `npm run migrate:prod` e release para `portfolio-api`. O grafo completo, condições e automações atuais não foram consultados nesta revisão.

| Item | Contrato operacional |
| --- | --- |
| Build context | `/apps/sistema-os/backend` quando o contexto é restrito ao pacote; se o contexto for `/`, usar working directory/comandos em `apps/sistema-os/backend`. Não duplicar o prefixo. |
| Instalação e build | `npm ci --include=dev`, `npm run prisma:validate` e `npm run build`; prebuild gera Prisma Client sem aplicar migrations. |
| Artefatos | `dist/main.js`, `dist/bootstrap-admin.js`, `dist/demo-cleanup.js`, `dist/generated/prisma/` e dependências runtime, incluindo Argon2 nativo. |
| Runtime | Package/dist disponíveis no diretório de trabalho; `npm run start:prod`, equivalente a `node dist/main`. Preservar porta e ingress efetivos. |
| Ambiente | `NODE_ENV=production`, `FRONTEND_ORIGIN=https://os.leonardopassos.com`, `PORT` e `SESSION_MAX_AGE_MS` efetivos. |
| Secrets runtime | `DATABASE_URL`, `SESSION_SECRET` e `DEMO_IP_HMAC_SECRET` gerenciados; preservar vínculos ao PostgreSQL existente. |
| Migration Job | Mesmo SHA/imagem da API; script, `prisma.config.ts`, schema, migrations/lock e Prisma CLI instalado. `MIGRATION_DATABASE_URL` exclusivamente no processo administrativo. |
| Filtros e gatilhos | Conferir pipeline, build, Jobs, release, hooks e agendamentos; monitoramento independente do pacote backend. |

O mecanismo real de imagem, contexto absoluto e healthcheck depende do painel: não há Dockerfile ou definição declarativa Northflank versionada. O PostgreSQL, seus dados e secrets não são recriados por mudanças de diretório. A limpeza não altera schema nem requer migration.

Sessão, CSRF e autorização permanecem no NestJS. Cookie é HttpOnly, Secure em produção, SameSite=Lax, path `/` e sem Domain. OS e API usam origens distintas no mesmo site HTTPS. Conferir proxy e X-Forwarded-Proto de acordo com o trust proxy existente; não alterar contratos para compensar configuração externa incorreta.

## Scripts operacionais

Execute os comandos abaixo somente no backend e com autorização para a operação e o banco correspondente.

| Comando | Finalidade e limites |
| --- | --- |
| `prisma:validate` / `prisma:generate` | Validam schema ou geram Client; não aplicam migrations. Caminhos relativos em `prisma.config.ts`. |
| `migrate:prod` | Script calcula cwd pelo `import.meta.url` e exige `MIGRATION_DATABASE_URL`; sem fallback runtime. Aplica apenas migrations versionadas com Prisma CLI do lockfile. |
| `demo:cleanup` | Executa `dist/demo-cleanup.js` após build com conexão runtime; pode excluir DEMOs expiradas conforme as regras existentes. |
| `bootstrap:admin` | Compila e cria o primeiro Administrador somente em banco novo sem usuários; não incluir no startup ou migração do banco existente. |
| `deploy` | Script Nest/Mau existente, sem relação com o procedimento Northflank descrito aqui. |
| `test` / `test:e2e` | Wrappers preparam migrations de teste; somente `portfolio_test` local e comprovado. Não usar em build/startup com credenciais de produção. |

Quando o banco de testes já estiver validado e migrations não forem autorizadas, use os runners Vitest diretos do [catálogo de testes](testing.md#executar-agora). Nunca distribuir secrets ao frontend, expor URIs nos logs ou carregar arquivos privados dos diretórios legados.

## Verificação e manutenção

Na Etapa 8, as consultas de produção limitam-se a GET de páginas, assets e raiz da API, sem autenticar, obter CSRF, gerar DEMOs ou modificar dados. A consulta de disponibilidade não comprova sessões ou regras de negócio em produção; os fluxos com escrita são validados localmente com API real em `portfolio_test`.

Antes de uma publicação futura autorizada, conferir filtros/gatilhos, commit/SHA, variáveis incorporadas ao bundle e artefatos de reversão. Alteração somente no site não deve promover API/OS; alteração somente no OS não deve republicar site ou disparar manutenção do banco. Um Job de migration, quando autorizado por alteração de schema, deve concluir antes da promoção da API.

Depois de uma publicação autorizada, validar HTTPS, assets, refresh de rotas, navegação externa, origem CORS e preflight sem redirects. Testes autenticados ou DEMO em produção exigem conta/ambiente e escopo explicitamente autorizados.

## Reversão

1. Pausar/cancelar automações e promoções afetadas para evitar que builds pendentes sobrescrevam o rollback.
2. Restaurar a versão anterior conhecida do Worker afetado e seus vínculos de domínio/rotas.
3. No Northflank, promover a imagem anterior conhecida, preservando PostgreSQL e restaurando configurações compatíveis de origem/ingress e vínculos de secrets.
4. Restaurar bundles frontend com URLs compatíveis; variáveis VITE não alteram artefatos já publicados.
5. Validar disponibilidade e os fluxos autorizados. A limpeza estrutural não requer rollback SQL, reset ou restauração destrutiva de dados.

A reversão exige autorização e artefatos existentes; não depender do Worker antigo `portfolio` após sua remoção manual. Um revert/push também pode disparar pipeline e precisa ser avaliado como publicação.

## Histórico da migração

Antes da publicação, o contexto Northflank era `/backend` e o root Cloudflare era `/frontend`. Na Etapa 7B, o responsável informou que desativou o gatilho Git push do workflow e os builds automáticos do Worker original. Esses registros são históricos e não comprovam o estado atual das automações.

A modularização publicada tem referência em `4e1db94`; a Etapa 8 remove a SPA antiga da árvore versionada. Referências aos caminhos antigos no catálogo de validações são históricas. `api.leonardopassos.com` permanece no teste de CORS como origem não autorizada, sem uso operacional. Após a validação, o responsável removeu os diretórios legados completos; os pacotes em `apps/` não dependem deles.
