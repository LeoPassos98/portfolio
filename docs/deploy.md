# Preparação da publicação da modularização

Este documento orienta quem vai publicar as aplicações separadas do portfólio. Registra a configuração desejada, as informações externas ainda ausentes e os procedimentos futuros de validação e reversão. As Etapas 7A e 7B preparam arquivos, validações e commit local; não autorizam publicação, push ou alteração de painéis.

## Sumário

- [Estado e limites da preparação](#estado-e-limites-da-preparação)
- [Configuração de cada aplicação](#configuração-de-cada-aplicação)
- [Cloudflare: inventário manual](#cloudflare-inventário-manual)
- [Northflank: inventário manual](#northflank-inventário-manual)
- [Pipeline da main: informações obrigatórias](#pipeline-da-main-informações-obrigatórias)
- [Referências antigas e arquivos privados](#referências-antigas-e-arquivos-privados)
- [Sequência futura de publicação](#sequência-futura-de-publicação)
- [Reversão mínima](#reversão-mínima)
- [Evidências e limitações locais](#evidências-e-limitações-locais)

## Estado e limites da preparação

Cada aplicação instala dependências e compila no próprio diretório, com package e lockfile locais. Não existem workspaces, biblioteca compartilhada ou ferramenta adicional de monorepo.

Os Workers versionados são `portfolio-site` e `portfolio-sistema-os`, diferentes do original `portfolio`. Vite, scripts npm, Wrangler, NestJS e Prisma já utilizam caminhos relativos ao pacote; foram preservados. A data de compatibilidade Wrangler permanece `2026-09-16`, com assets em `./dist/` e `not_found_handling: single-page-application`.

Os arquivos `.env.production.example` dos dois frontends são exemplos públicos, não ambientes carregados pelo Vite. `.env.example` permanece local; nenhum arquivo privado foi copiado ou alterado. As variáveis devem ser fornecidas explicitamente ao build. Não foram adicionadas rotas/domínios no Wrangler: os vínculos serão feitos no painel após aprovação. O carregamento e a prioridade dos ambientes seguem a [documentação do Vite](https://vite.dev/guide/env-and-mode).

O responsável informou na Etapa 7B que desativou manualmente o gatilho `Git push` do workflow Northflank e os builds automáticos do Worker original `portfolio` no Cloudflare. Os painéis não foram consultados nesta revisão; essas informações não comprovam a desativação de outros gatilhos, hooks, Jobs, agendamentos ou promoções automáticas.

O pipeline conhecido contém build de `portfolio-backend-build`, execução do Job `portfolio-migrate` por `npm run migrate:prod` e release para `portfolio-api`. O contexto atual Northflank ainda é `/backend`; o root atual Cloudflare é `/frontend`. A branch aprovada permanece `main`, sem criação de outra branch.

**Não enviar mudanças estruturais à main antes de inspecionar e proteger todos os gatilhos e operações posteriores.** A separação de diretórios, sozinha, não torna os pipelines independentes. Nenhuma configuração externa foi alterada nas Etapas 7A ou 7B.

## Configuração de cada aplicação

| Aplicação | Diretório no Git | Identidade | Domínio final |
| --- | --- | --- | --- |
| Site | `apps/site/frontend/` | Worker `portfolio-site` | `https://leonardopassos.com` |
| Frontend OS | `apps/sistema-os/frontend/` | Worker `portfolio-sistema-os` | `https://os.leonardopassos.com` |
| Backend OS | `apps/sistema-os/backend/` | Serviço `portfolio-api`, informado pelo responsável | `https://os-api.leonardopassos.com` |

| Processo | Variáveis públicas previstas |
| --- | --- |
| Build site | `VITE_OS_URL=https://os.leonardopassos.com`; nenhuma API necessária. |
| Build frontend OS | `VITE_API_URL=https://os-api.leonardopassos.com`; `VITE_SITE_URL=https://leonardopassos.com`. |
| Runtime API | `FRONTEND_ORIGIN=https://os.leonardopassos.com`; `NODE_ENV=production`; preservar `PORT` e `SESSION_MAX_AGE_MS` efetivos. |

No site e no frontend OS, os comandos continuam `npm ci`, `npm run lint` e `npm run build`. Os READMEs locais mostram os comandos com variáveis de produção explícitas. Um build aprovado sem verificar as variáveis do painel não garante que a URL correta foi incorporada; conferir o artefato antes da promoção. Cada artefato fica em seu próprio `dist/`; variáveis VITE fazem parte do JavaScript público e não devem receber segredos.

No backend, use `npm ci`, `npm run lint`, `npm run prisma:validate` e `npm run build` a partir do pacote. Validate/generate não aplicam migrations nem precisam consultar o PostgreSQL. A conexão fornecida ao build deve ser uma URL válida e não concede autorização para operações no banco.

## Cloudflare: inventário manual

Configurar dois projetos de Workers Builds independentes, depois da aprovação operacional. Os valores abaixo são desejados; não confirmam a existência ou o estado de recursos na conta.

| Campo | Site | Frontend OS |
| --- | --- | --- |
| Repositório | `LeoPassos98/portfolio` | `LeoPassos98/portfolio` |
| Worker correspondente ao Wrangler | `portfolio-site` | `portfolio-sistema-os` |
| Root directory | `apps/site/frontend` | `apps/sistema-os/frontend` |
| Build command | `npm ci --include=dev && npm run build` | `npm ci --include=dev && npm run build` |
| Deploy command futuro | `npx wrangler deploy --config wrangler.jsonc` | `npx wrangler deploy --config wrangler.jsonc` |
| Assets/fallback versionados | `./dist/`, SPA | `./dist/`, SPA |
| Variáveis de build | `VITE_OS_URL=https://os.leonardopassos.com` | `VITE_API_URL=https://os-api.leonardopassos.com`, `VITE_SITE_URL=https://leonardopassos.com` |
| Custom Domain futuro | `leonardopassos.com` | `os.leonardopassos.com` |
| Watch paths desejados | `apps/site/frontend/**` | `apps/sistema-os/frontend/**` |
| Branch e gatilhos | `main`; conferir e manter automação protegida até o corte aprovado | `main`; mesma exigência, com gatilho independente |

Manter as dependências de build/deploy instaladas mesmo se NODE_ENV estiver definido; por isso o comando do painel explicita `--include=dev`.

Fornecer VITE em **Build variables**, não apenas em variáveis runtime do Worker. Confirmar conta, permissões de publicação, versão Node/npm, identidade Worker, branch de produção, comportamento de previews/PRs e sintaxe efetiva dos filtros no painel. O Root directory define a execução do build; o arquivo Wrangler precisa corresponder ao Worker selecionado. [Referência de Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

Para o host da API, conferir no DNS Cloudflare o registro `os-api` e o destino/validação indicado pelo Northflank. Tipo, conteúdo do registro, proxy DNS e TTL dependem das instruções efetivas do painel e ainda não foram identificados; não inventar IP ou target. Nos frontends, conferir os registros e certificados associados aos Custom Domains, evitando vínculos/rotas conflitantes.

Registrar o vínculo atual de cada domínio e suas rotas antes de transferi-los. Se `leonardopassos.com` estiver associado ao Worker original, preservar `portfolio` e sua versão para reversão e transferir o domínio de forma controlada. Nomes locais distintos não comprovam que os novos nomes estejam livres na conta.

Confirmar DNS/TLS, acesso direto, refresh e assets após o vínculo. O fallback SPA serve index com HTTP 200; o site mostra 404 visual, enquanto o OS resolve guards e login no Router. Previews em outros hosts não são a origem HTTPS autorizada da API e não devem ampliar o CORS de produção. [Referência de SPA](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).

## Northflank: inventário manual

Manter o addon PostgreSQL existente, seus dados, migrations e vínculos de credenciais. Nenhum recurso, secret ou Job foi criado nesta preparação.

| Item | Configuração desejada ou verificação necessária |
| --- | --- |
| Build conhecido | Inspecionar `portfolio-backend-build`: repositório/SHA, branch `main`, contexto atual `/backend` e comandos efetivos. |
| Job e release conhecidos | Inspecionar `portfolio-migrate` (`npm run migrate:prod`) e release para `portfolio-api`; conferir imagem/SHA, cwd, vínculos de secrets e proteção contra execução automática. |
| Build context do pacote | `/apps/sistema-os/backend` se o build consumir somente o pacote. Se o contexto continuar `/`, configurar o working directory/comandos para `apps/sistema-os/backend`; não acrescentar esse prefixo novamente dentro de um contexto já reduzido. |
| Mecanismo de build | Confirmar Dockerfile, buildpack ou comandos externos usados hoje. Não há Dockerfile, workflow ou definição Northflank versionada para comprovar esse mecanismo. |
| Instalação/build | `npm ci --include=dev` com dependências de build; `npm run build` executa Prisma generate pelo prebuild e compila NestJS. Conferir Node/npm, scripts nativos Argon2 e política allowScripts da imagem. |
| Artefatos | Verificar `dist/main.js`, `dist/bootstrap-admin.js`, `dist/demo-cleanup.js`, `dist/generated/prisma/`, dependências runtime e bibliotecas nativas. Não servir apenas dist sem suas dependências. |
| Runtime | Working directory deve conter package e dist; comando `npm run start:prod`, equivalente a `node dist/main`. Preservar porta interna e configuração de ingress; `GET /` é um candidato de smoke, sem substituir o healthcheck efetivo a confirmar. |
| Domínio | Vincular `os-api.leonardopassos.com` ao serviço API, confirmar DNS/TLS e ausência de redirect/desafio em OPTIONS. Registrar domínio anterior para reversão. |
| Ambiente público runtime | `NODE_ENV=production`, `FRONTEND_ORIGIN=https://os.leonardopassos.com`, porta/duração de sessão existentes. Origem exata, sem barra final ou lista. |
| Secrets runtime | Preservar DATABASE_URL, SESSION_SECRET e DEMO_IP_HMAC_SECRET gerenciados; confirmar vínculo ao PostgreSQL existente sem revelar valores. Não colocar TEST_DATABASE_URL ou MIGRATION_DATABASE_URL no runtime normal. |
| Proxy | Confirmar cadeia de proxies e X-Forwarded-Proto do hop confiável, coerentes com trust proxy=1 existente. Cookie continua Secure em produção, HttpOnly, Lax, path `/`, sem Domain. |
| Filtros/automação | Conferir triggers do pipeline, build service, deploy service, Jobs e hooks. Desejar monitoramento independente de `apps/sistema-os/backend/**`; regras de build isoladas podem não restringir o trigger global do pipeline. |

O contexto reduzido exclui arquivos fora do pacote; se o build atual depender da raiz, isso precisa ser resolvido nos comandos/configurações do painel antes de publicar. Os caminhos propostos não comprovam o working directory absoluto da imagem, que depende do mecanismo de build. [Referência de contexto e path rules](https://northflank.com/docs/v1/application/build/build-code-from-a-git-repository).

### Prisma e operações administrativas

| Comando existente | Caminhos e condições |
| --- | --- |
| `prisma:validate` / `prisma:generate` | Executados no pacote; `prisma.config.ts` usa `prisma/schema.prisma` e `prisma/migrations`. Generate cria `src/generated/prisma/`; NestJS o compila para dist. |
| `migrate:prod` | Executa `scripts/migrate-production.mjs`; calcula cwd do pacote por import.meta.url e exige exclusivamente MIGRATION_DATABASE_URL, destinada ao processo administrativo. Disponibilizar config, schema, seis migrations/lock e Prisma CLI instalado pelo lockfile. |
| `demo:cleanup` | Executa `dist/demo-cleanup.js`, após build, com DATABASE_URL runtime. Conferir se existe Job manual/agendado, imagem/SHA, secrets e política de execução. Não criar cron nem disparar cleanup por causa da mudança estrutural. |
| `bootstrap:admin` | Compila e executa `dist/bootstrap-admin.js`; exclusivo de banco novo sem usuários. Não incluir na migração do banco existente ou startup. |
| `deploy` | Script Nest/Mau existente; não é o procedimento de publicação Northflank e não foi executado. |
| `test` / `test:e2e` | Acionam preparação/migrations de teste. Não incluí-los em build/startup com credenciais de produção; qualquer suíte com escrita exige isolamento comprovado em portfolio_test. |

Mover diretórios não altera schema e não exige migration. O Job `portfolio-migrate` informado pelo responsável precisa ter comando, credencial, imagem e proteção de execução conferidos antes do push. Não confiar que a ausência de SQL novo torne essa etapa inofensiva. Uma execução futura aprovada exige o mesmo SHA/artefato e dependências CLI disponíveis; falha deve impedir promoção. Não podar Prisma CLI da imagem que alimenta esse Job nem permitir download implícito de outra versão.

## Pipeline da main: informações obrigatórias

Informados pelo responsável: branch `main`, gatilho `Git push` desativado, build `portfolio-backend-build`, Job `portfolio-migrate` com `npm run migrate:prod` e release para `portfolio-api`. O estado efetivo dos recursos, o grafo completo e outros mecanismos de automação dependem de evidência do painel/exportação do pipeline e logs de uma execução anterior. Antes de qualquer push estrutural, registrar:

1. Grafo completo, ordem, paralelismo, dependências, condições de sucesso/falha, retries, hooks e aprovações.
2. Comando, contexto, cwd, branch/SHA e variáveis vinculadas de cada etapa; verificar referências a `backend/`, raiz Git e dependências externas ao pacote.
3. Destino dos artefatos da etapa de build: serviços/Jobs que os consomem, promoção automática, versões/imagens fixadas e vínculo ao serviço/API/PostgreSQL existentes.
4. Existência de migrations, seeds, bootstrap, cleanup, testes com preparação ou operações de reset; identificar script exato e classe de credencial sem extrair secrets.
5. Trigger do pipeline e de cada recurso: push, merge, PR, filtro de caminho, agendamento, hooks e execução independente fora do pipeline.
6. Mecanismo comprovado para impedir promoção/operações de banco durante o primeiro push; considerar builds já enfileirados e acionamentos concorrentes. Skip flags em mensagens não são proteção suficiente sem conferir seu alcance.
7. Como cancelar execução, fixar/restaurar uma imagem já publicada e recuperar a configuração anterior sem recompilar a raiz antiga contra caminhos novos.

Sem essas informações, um push na main pode falhar em paths antigos, promover imagem inadequada, executar o Job de migration ou republicar o Worker original por algum mecanismo ainda ativo. A desativação informada de dois gatilhos não comprova o bloqueio integral do pipeline e de seus recursos. Os três pacotes precisam de triggers/artifacts independentes na infraestrutura, além da separação local.

## Referências antigas e arquivos privados

O domínio aprovado da API passou a ser `os-api.leonardopassos.com`. As três referências operacionais do guia de setup ao domínio `api.leonardopassos.com` foram atualizadas. O domínio anterior permanece em `cors.options.spec.ts` como origem não autorizada: é um caso negativo de CORS, não um endpoint ativo. Registros das etapas anteriores continuam históricos.

Os exemplos locais usam portas 5174/5175/3000; os novos valores de produção estão registrados em exemplos públicos e comandos explícitos, sem carga automática ou mudança dos defaults locais. O frontend original e seu Wrangler permanecem intactos. Referências `frontend/` nessa aplicação são intencionais; não devem ser usadas como root dos novos Workers. Referências `backend/` para arquivos privados, artefatos legados e validações anteriores não são comandos do pacote atual.

Os privados em `backend/.env` e `backend/.env.test` não são descobertos pelo NestJS/Prisma/Vitest no novo diretório. O painel deve fornecer os valores runtime já gerenciados; não copiar os arquivos antigos para o deploy. SHADOW_DATABASE_URL é de desenvolvimento/migration local, não do startup HTTP. Exemplos públicos não substituem secrets ou a confirmação da base conectada. Nunca distribuir secrets ao frontend ou incluí-los em URLs.

## Sequência futura de publicação

Esta sequência depende de aprovação posterior; nenhuma ação abaixo foi executada nas Etapas 7A ou 7B.

1. **Conferir e proteger todas as automações antes do push.** Obter as informações do pipeline, bloquear promoções/operações de banco e validar a proteção. Registrar versão do Worker original, imagem/SHA atual da API, domínios/rotas, variáveis públicas e vínculos de secrets. Confirmar backup recuperável do PostgreSQL existente.
2. Após autorização explícita, disponibilizar o commit na `main` com gatilhos comprovadamente protegidos. Configurar roots e filtros independentes; produzir artefatos dos três pacotes do mesmo SHA aprovado. Confirmar o plano de reversão antes do primeiro corte.
3. Publicar a API no serviço existente com os caminhos corretos, preservando addon/secrets; vincular `os-api.leonardopassos.com`, configurar a origem OS e validar HTTPS, healthcheck e preflight. Não aplicar migrations pela mudança de diretório.
4. Publicar `portfolio-sistema-os` com os valores de build aprovados, vincular `os.leonardopassos.com` e validar login/logout, sessão, CSRF, primeiro acesso, autorização, ordens e DEMO conforme cobertura existente. Não executar fixtures destrutivas em produção; usar conta/ambiente operacional autorizado e distinguir smoke de testes completos em portfolio_test.
5. Publicar `portfolio-site` e transferir o domínio público somente depois de OS/API funcionarem. Validar Home/estudo de caso, assets, refresh, mobile, links e ausência de chamadas de sessão/API no site.
6. Reabilitar automações individualmente somente após validar pipeline e filtros. Mudança somente no site não deve promover backend/OS; mudança somente no OS não deve republicar site ou disparar manutenção do banco. Conservar recursos/artefatos anteriores durante o período de observação.

A origem única pode interromper temporariamente o frontend antigo, conforme decisão aprovada. Se o hostname da API mudar, o cookie exclusivo do host anterior não acompanha o novo endereço: o navegador precisará autenticar novamente. Não ampliar CORS ou Domain do cookie para contornar o corte.

## Reversão mínima

1. Pausar/cancelar as automações e promoções afetadas antes de restaurar qualquer versão; impedir que um build pendente sobrescreva o rollback.
2. No Cloudflare, restaurar a versão anterior do Worker afetado e o vínculo original de domínio/rotas. No primeiro deploy de um Worker novo, pode não haver versão anterior: para o site, restaurar o vínculo ao Worker original preservado; para o OS, restaurar o vínculo anterior documentado ou retirar o novo corte.
3. No Northflank, promover a imagem anterior conhecida sem rebuild, restaurando conjuntamente a configuração pública/ingress/FRONTEND_ORIGIN anterior e os vínculos de secrets. Se o mecanismo de pin/rollback não estiver confirmado, não publicar.
4. Restaurar URLs de API/site/OS nos artefatos frontend correspondentes e seus domínios. Um valor VITE não muda um bundle já publicado: restaurar o artefato compatível ou reconstruir conscientemente sob automações protegidas.
5. Validar HTTPS, preflight, login/logout, sessão e site após a reversão. Manter PostgreSQL, schema e migrations; esta etapa não requer rollback SQL, reset ou restauração destrutiva do banco. Caso uma operação desconhecida já tenha alterado schema/dados, interromper o fluxo e investigar antes de qualquer restauração.

Não usar revert/push na main como primeira resposta sem proteger o pipeline: isso também pode disparar o mesmo fluxo inadequado. A reversão é operacional por aplicação, com artefatos anteriores e configuração compatível.

## Evidências e limitações locais

O catálogo [Testes e validações](testing.md) registra resultados e avisos das etapas locais. Configuração versionada e emulação local comprovam nomes, caminhos, build e fallback; não comprovam disponibilidade dos nomes na conta, domínio publicado, permissões, TLS, proxy ou comportamento do pipeline externo. O plano de publicação depende de conferência operacional dos painéis e de aprovação explícita após o commit local da Etapa 7B.
