# Configuração do projeto

Este guia explica como preparar um clone existente do sistema e registra as tecnologias e decisões de configuração já adotadas.

Destina-se a pessoas e agentes que precisam executar o projeto localmente ou manter sua infraestrutura sem depender do histórico de implementação.

## Sumário

- [Antes de começar](#antes-de-começar)
- [Preparar um clone existente](#preparar-um-clone-existente)
- [Configuração importante](#configuração-importante)
  - [Variáveis de ambiente](#variáveis-de-ambiente)
  - [Deploy do frontend](#deploy-do-frontend)
  - [Aplicações frontend independentes](#aplicações-frontend-independentes)
  - [Base visual do site](#base-visual-do-site)
  - [Backend e publicação independente](#backend-e-publicação-independente)
  - [Banco, Prisma e migrations](#banco-prisma-e-migrations)
  - [Migrations de produção](#migrations-de-produção)
  - [Bootstrap do primeiro Administrador](#bootstrap-do-primeiro-administrador)
  - [Sessão, CSRF e CORS](#sessão-csrf-e-cors)
  - [Comunicação entre os domínios](#comunicação-entre-os-domínios)
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

As portas locais de referência são site em `http://localhost:5174`, Sistema OS em `http://localhost:5175` e API em `http://localhost:3000`. Ajuste as variáveis correspondentes se usar outras portas; os frontends devem ter origens distintas.

## Preparar um clone existente

### 1. Instalar dependências

Na raiz do repositório, instale cada aplicação separadamente:

```bash
npm --prefix apps/sistema-os/backend ci
npm --prefix apps/sistema-os/frontend ci
npm --prefix apps/site/frontend ci
```

No backend, o npm 11 aplica a política versionada em `allowScripts`: ela permite somente a compilação nativa do `argon2` e o download do engine do Prisma. Os scripts do guard de versão do Prisma e da telemetria transitiva do Scarf permanecem bloqueados. O `npm run build` executa a geração do Prisma Client antes de compilar o NestJS, portanto funciona também em um checkout limpo.

### 2. Criar os arquivos de ambiente

Copie os exemplos versionados e substitua os valores de exemplo por dados locais seguros:

```bash
cp apps/sistema-os/backend/.env.example apps/sistema-os/backend/.env
cp apps/sistema-os/backend/.env.test.example apps/sistema-os/backend/.env.test
cp apps/sistema-os/frontend/.env.example apps/sistema-os/frontend/.env
cp apps/site/frontend/.env.example apps/site/frontend/.env
```

`apps/sistema-os/backend/.env` contém as credenciais de banco, o segredo de sessão e o segredo HMAC da origem DEMO; `apps/sistema-os/backend/.env.test` contém somente `TEST_DATABASE_URL`; nenhum dos dois deve ser versionado. `apps/sistema-os/frontend/.env` define `VITE_API_URL` e `VITE_SITE_URL`; `apps/site/frontend/.env` define somente `VITE_OS_URL`. Todos os valores `VITE_*` são públicos e incorporados ao build.

Configure cada pacote a partir de seus exemplos ou de variáveis injetadas no processo. Eventuais privados legados preservados localmente não são carregados pelas aplicações; não os copie, mova ou versione.

### 3. Preparar o PostgreSQL

Crie três bases distintas com as mesmas credenciais locais: `portfolio_dev` para desenvolvimento, `portfolio_test` para testes automatizados e `portfolio_shadow` para o Prisma Migrate.

```bash
createdb -U portfolio_user portfolio_dev
createdb -U portfolio_user portfolio_test
createdb -U portfolio_user portfolio_shadow
```

A shadow database é descartável e usada pelo Prisma Migrate para comparar migrations. Nunca use `portfolio_shadow` pela aplicação ou pelos testes. A suíte também nunca usa `portfolio_dev`.

### 4. Gerar o cliente e aplicar migrations

Depois de configurar as URLs do banco, valide a configuração, gere o Prisma Client e aplique as migrations já versionadas:

```bash
cd apps/sistema-os/backend
npm run prisma:validate
npm run prisma:generate
npx prisma migrate deploy
npm run test:db:prepare
```

### 5. Iniciar as aplicações

O exemplo backend usa `FRONTEND_ORIGIN=http://localhost:5175`, correspondente ao frontend OS. Para usar outra porta, configure a origem correspondente somente no ambiente local da API. A origem deve corresponder à URL aberta no navegador; o contrato CORS continua aceitando uma única origem configurada.

Em terminais separados:

```bash
cd apps/sistema-os/backend
npm run start:dev
```

```bash
cd apps/sistema-os/frontend
npm run dev -- --port 5175 --strictPort
```

```bash
cd apps/site/frontend
npm run dev -- --port 5174 --strictPort
```

O backend expõe a Swagger UI em `http://localhost:3000/api/docs`. Para escolher as verificações após uma alteração, consulte [Testes e validações](testing.md).

## Configuração importante

### Variáveis de ambiente

| Arquivo             | Variáveis                                                 | Finalidade                                                                      |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/sistema-os/backend/.env`      | `NODE_ENV`, `PORT`, `DATABASE_URL`, `SHADOW_DATABASE_URL` | Ambiente, conexão da aplicação e shadow database do Prisma Migrate.             |
| `apps/sistema-os/backend/.env`      | `SESSION_SECRET`, `SESSION_MAX_AGE_MS`, `FRONTEND_ORIGIN` | Assinatura e duração da sessão, além da origem autorizada pelo CORS.            |
| `apps/sistema-os/backend/.env`      | `DEMO_IP_HMAC_SECRET`                                     | HMAC irreversível do IP canônico usado pela proteção antiabuso da geração DEMO. |
| `apps/sistema-os/backend/.env.test` | `TEST_DATABASE_URL`                                       | URL exclusiva de `portfolio_test` para Vitest e migrations de teste.            |
| `apps/sistema-os/frontend/.env` | `VITE_API_URL`, `VITE_SITE_URL` | API usada pelo Axios e destino externo do portfólio. |
| `apps/site/frontend/.env` | `VITE_OS_URL` | Destino externo do Sistema OS, sem API. |

O backend valida seu ambiente com Zod no startup.

Antes de carregar qualquer spec, o bootstrap do Vitest lê `.env` e `.env.test`, exige que `TEST_DATABASE_URL` aponte exatamente para `portfolio_test` e só então define `NODE_ENV=test` e `DATABASE_URL` para o processo. URLs que resolvam para `portfolio_dev`, `portfolio_shadow`, `postgres` ou outro nome falham antes de fixtures ou limpezas. `npm run test:db:prepare` repete essa validação e aplica apenas as migrations versionadas com `prisma migrate deploy`.

`SESSION_MAX_AGE_MS` deve ser um inteiro positivo; o padrão é 28.800.000 ms (8 horas). `SESSION_SECRET` e `DEMO_IP_HMAC_SECRET` exigem no mínimo 32 caracteres, devem usar valores aleatórios distintos e exclusivos de cada ambiente e nunca devem ser logados ou versionados.

A conexão `pg` do store de sessão torna os aliases `sslmode=prefer`, `require` e `verify-ca` explicitamente `verify-full`, mantendo a validação atual de certificado e hostname. Essa normalização existe apenas no consumidor da sessão: não muda a variável gerenciada do Northflank, `DATABASE_URL` global ou a URL do adapter Prisma. `uselibpqcompat=true` preserva sua semântica explícita. O adapter Prisma também usa pg e pode continuar emitindo o warning original; nenhuma conexão/certificação de produção foi alterada ou revalidada por esse ajuste.

### Primeiro login DEMO

`POST /demo/access` gera o shell PENDENTE e as credenciais; `POST /auth/login` verifica a senha antes de ativá-lo. A primeira ativação exige menos de ou exatamente uma hora desde a geração. Retry de FALHA exige somente que a expiração fixa de 24 horas ainda não tenha ocorrido. A capacidade utiliza o hash de origem persistido, independentemente da rede do login.

Ativação e seed usam uma transação externa, sob locks global → origem mantidos até o commit. O SAVEPOINT criado após PROVISIONANDO permite reverter seed/conclusão e confirmar FALHA sem liberar a vaga. Isso também vale no retry; uma interrupção antes do commit reverte toda a transação ao estado anterior, sem PROVISIONANDO persistido isoladamente.

VAZIO mantém o shell; EXEMPLO acrescenta dois funcionários, seis clientes, oito ordens e dez históricos fictícios, com contador oito. Somente PRONTA vigente pode receber sessão. PROVISIONANDO preexistente exige investigação e retorna conflito, sem executar outro seed.

Criação e expiração da DEMO são lidas por epoch, e `provisionedAt` é gravado com conversão SQL explícita para evitar dependência do fuso do PostgreSQL no adapter instalado. Isso não exige migration, seed operacional ou alteração da configuração global do banco.

### Deploy do frontend

Os frontends publicados são Static Assets em Workers distintos: site em `https://leonardopassos.com` e Sistema OS em `https://os.leonardopassos.com`. Cada `wrangler.jsonc` usa o `dist/` local e fallback SPA; site encaminha rotas desconhecidas para a Home e OS resolve login/guards pelo Router.

Execute instalação, build e o comando autorizado de deploy dentro de `apps/site/frontend/` ou `apps/sistema-os/frontend/`. As variáveis VITE devem ser fornecidas ao build. Os roots, identidades, comandos e cuidados operacionais estão em [Publicação e operação](deploy.md). O Worker antigo `portfolio`, se ainda existir, depende de remoção manual no Cloudflare.

### Aplicações frontend independentes

Os três pacotes residem em `apps/`, com instalações, configurações e artefatos próprios, sem workspace npm, biblioteca compartilhada ou ferramenta adicional de monorepo. O site contém somente o portfólio público; o frontend Sistema OS contém autenticação, áreas internas e a geração DEMO integrada ao login.

| Diretório | Pacote npm | Identidade local do Worker |
| --- | --- | --- |
| `apps/site/frontend/` | `portfolio-site-frontend` | `portfolio-site` |
| `apps/sistema-os/frontend/` | `portfolio-sistema-os-frontend` | `portfolio-sistema-os` |

Na raiz do repositório, instale cada cópia a partir de seu lockfile:

```bash
npm --prefix apps/site/frontend ci
npm --prefix apps/sistema-os/frontend ci
```

Depois, execute `npm run lint` e `npm run build` no diretório da aplicação escolhida. Cada build gera seu próprio `dist/`; as configurações TypeScript, Vite, Tailwind e Oxlint continuam locais ao pacote.

Os arquivos `.env.production.example` dos dois frontends registram somente URLs públicas de produção, sem carregamento automático. Os `.env.example` continuam locais. Para compilar explicitamente para publicação, configure as variáveis no processo ou no Workers Builds:

```bash
cd apps/site/frontend
VITE_OS_URL=https://os.leonardopassos.com npm run build
```

```bash
cd apps/sistema-os/frontend
VITE_API_URL=https://os-api.leonardopassos.com \
VITE_SITE_URL=https://leonardopassos.com npm run build
```

O `.gitignore` preserva os exemplos públicos e ignora privados, builds e `.wrangler/`. A publicação independente e os limites de operação estão em [Publicação e operação](deploy.md).

Os READMEs de [site](../apps/site/frontend/README.md) e [Sistema OS](../apps/sistema-os/frontend/README.md) indicam portas distintas por argumentos do Vite. Vite recebe essas portas por argumentos, sem configuração global compartilhada.

A separação publicada tem referência em `4e1db94`. Na Etapa 8, os 101 arquivos versionados do frontend original foram removidos após conferir seus correspondentes, incluindo assets e configurações. Os privados legados foram preservados durante a validação; posteriormente, o responsável removeu os diretórios antigos completos. `.env.example` permanece em cada pacote atual.

No site, `VITE_OS_URL` define o destino externo do Sistema OS; o exemplo usa `http://localhost:5175`, e a ausência da variável usa `https://os.leonardopassos.com`. O cabeçalho abre `/login`, e os CTAs de demonstração também abrem `/login` no outro frontend. A variável é pública e incorporada ao build. Para definir explicitamente o destino de produção, execute no diretório do site:

```bash
VITE_OS_URL=https://os.leonardopassos.com npm run build
```

O site compila e funciona sem `VITE_API_URL`, API ou providers de sessão. O Sistema OS exige `VITE_API_URL` e mantém Axios com credenciais, CSRF, providers e guards; `/` e rotas desconhecidas passam pelo login, que resolve sessões ativas para Dashboard ou Primeiro Acesso. O Router do site encaminha endereços desconhecidos para `/`, substituindo a entrada inválida no histórico; o fallback SPA de assets continua servindo `index.html`, sem configurar status HTTP 404 ou 3xx.

No Sistema OS, `VITE_SITE_URL` define os links externos ao portfólio; o exemplo usa `http://localhost:5174`, e a ausência da variável usa `https://leonardopassos.com`. A marca das telas de autenticação aponta para o site; o painel DEMO faz parte da mesma página de login, sem layout ou rota pública adicionais. Depois de configurar a URL da API, é possível definir explicitamente o destino do portfólio no diretório do frontend OS:

```bash
VITE_SITE_URL=https://leonardopassos.com npm run build
```

Os Workers correspondentes são `portfolio-site` e `portfolio-sistema-os`. A publicação foi confirmada pelo responsável; esta limpeza local não altera Workers, domínios ou gatilhos.

O `/login` é a entrada única, com geração via `POST /demo/access`, exibição de credenciais/prazos e preenchimento por React Hook Form. Gerar ou preencher não autentica: o usuário confirma em Entrar. A rota frontend `/demo` foi removida; o fallback geral de rotas desconhecidas permanece. Credenciais ficam apenas em memória e desaparecem no refresh, sem URLs, history state, armazenamento ou logs.

### Base visual do site

A identidade aprovada está em `apps/site/frontend/src/styles/tokens.css`, importada por `src/index.css`. Os tokens semânticos `--site-*` usam escopo `.portfolio-theme` e variante `data-theme="dark"`; componentes consomem referências em vez de cores literais. `src/styles/site.css` e `src/components/ui/PortfolioUI.tsx` aplicam essa base à Home e ao estudo de caso. A paleta padrão do Tailwind fica desativada. Não há instalação adicional.

A preferência de tema usa somente `localStorage` (`portfolio-theme`); o valor inicial segue o sistema quando não há escolha salva. Sem API ou banco. A página temporária Design Lab, sua rota e seus aliases foram removidos após a adoção da base. O endereço `/design-lab` segue o fallback da Home em desenvolvimento e produção. Consulte [base visual e histórico](design-lab.md).

### Backend e publicação independente

A API publicada em `https://os-api.leonardopassos.com` usa `apps/sistema-os/backend/`. Instalação, validate, generate, lint, build, testes e scripts operacionais são relativos a esse pacote; não dependem dos diretórios antigos da raiz. O build gera `src/generated/prisma/` e os entrypoints em `dist/`, sem aplicar migrations.

O PostgreSQL permanece separado no Northflank. Os caminhos exigidos pelo código são contexto `/apps/sistema-os/backend` ou comandos com working directory equivalente, runtime com package/dist e Job de migration com script, schema, SQLs e Prisma CLI do mesmo artefato. O pipeline conhecido contém `portfolio-backend-build`, `portfolio-migrate` e release de `portfolio-api`; consulte [Publicação e operação](deploy.md) antes de qualquer ação externa.

### Banco, Prisma e migrations

O Prisma fornece acesso tipado ao PostgreSQL por meio de `DatabaseModule` e `DatabaseService`. O adapter oficial `@prisma/adapter-pg` usa o driver `pg`.

`prisma.config.ts` lê as duas URLs de ambiente.

A migration inicial inclui constraints `CHECK (valor >= 0)` em `ordem_servico` e `historico_ordem_servico`.

Elas existem porque o Prisma Schema não representa esse tipo de constraint diretamente.

A migration de fundação de `Environment` cria o PRINCIPAL permanente, associa os dados existentes a ele e transforma o contador de OS em um registro por Environment sem recalcular `ultimo_numero`. Ela deve ser aplicada com `npx prisma migrate deploy`, como na etapa 4; não exige seed, reset nem logout global.

A migration de tentativas de geração DEMO cria a tabela antiabuso independente de `Environment`, com hash de origem validado e índice temporal composto. A janela móvel considera somente os últimos 60 segundos; registros mais antigos ficam semanticamente inativos, e o cleanup existente remove fisicamente as tentativas com mais de 24 horas.

As constraints `CHECK` que vinculam tipo e expiração, o índice parcial que permite no máximo um PRINCIPAL e o trigger que impede excluir o PRINCIPAL ou alterar seu tipo permanecem explícitos no SQL porque não são representados integralmente pelo Prisma Schema. A tabela `session` continua sem `environment_id`; a identidade persistida permanece `usuarioId`.

Ao alterar `schema.prisma`, valide e gere novamente o cliente:

```bash
cd apps/sistema-os/backend
npm run prisma:validate
npm run prisma:generate
```

Use `npx prisma migrate dev --name <nome-da-migration>` somente ao criar uma migration local. Para aplicar as migrations já versionadas em um clone, use o comando da etapa 4.

### Migrations de produção

A configuração separa credenciais da API e da manutenção do schema. O responsável informou na Etapa 7B os nomes `portfolio-api` e `portfolio-migrate`, com build, migration e release nessa ordem. Os recursos e seus vínculos de secrets ainda precisam ser conferidos no painel; o estado das automações está em [Publicação e operação](deploy.md#estado-publicado-e-limites).

| Processo | Variável | Conexão |
| -------- | -------- | ------- |
| API runtime (`portfolio-api`) | `DATABASE_URL` | Credencial normal da aplicação, sem exigir ownership das tabelas. |
| Job de migration (`portfolio-migrate`) | `MIGRATION_DATABASE_URL` | Credencial administrativa de manutenção; no Northflank, URI `_ADMIN` do addon PostgreSQL. |

Forneça `MIGRATION_DATABASE_URL` pelo mecanismo de secrets somente ao Job/processo de migration. Não a configure no serviço `portfolio-api`, no ambiente normal do NestJS ou em `apps/sistema-os/backend/.env`. A API não precisa dessa variável para iniciar e continua usando sua `DATABASE_URL` runtime.

Com a variável operacional já injetada no Job, execute:

```bash
cd apps/sistema-os/backend
npm run migrate:prod
```

O comando falha antes de iniciar Prisma se `MIGRATION_DATABASE_URL` estiver ausente, vazia ou não for uma URL válida com protocolo `postgresql:`. Não existe fallback para `DATABASE_URL`. O script fornece a URI administrativa como `DATABASE_URL` somente no environment do subprocesso, remove dele `MIGRATION_DATABASE_URL` e preserva as variáveis do processo pai. Não persiste nem imprime a URI e mantém os logs operacionais normais do Prisma; falhas de inicialização, status inutilizável ou erro do Prisma resultam em falha do comando.

Produção aplica somente migrations versionadas com `prisma migrate deploy`, nunca `migrate dev`. O comando não executa reset, push de schema, seed, SQL manual, criação de banco ou alteração de ownership. `prisma migrate resolve` não faz parte do fluxo normal: exige diagnóstico humano e uso consciente durante a recuperação de uma migration falha, sem automatização pelo script.

A separação responde a um incidente em que código novo consultou `environment.demo_status` antes de o schema correspondente ter sido aplicado, produzindo `500` em `GET /auth/session`. A tentativa com a credencial runtime falhou por falta de ownership; a recuperação manual e a aplicação com conexão administrativa restabeleceram a sessão.

O fluxo recomendado **quando houver alteração de schema aprovada** é:

```text
Build → Migration Job → Deploy API
```

Esse diagrama não comprova o pipeline externo ativo. Na modularização, schema e migrations permaneceram idênticos: mover diretórios não justifica executar migrations. Se houver uma migration aprovada e seu Job falhar, o deploy do backend não deve prosseguir. O Job deve usar o mesmo artefato/checkout que será publicado e disponibilizar o script, `prisma.config.ts`, schema, migrations versionadas e dependências necessárias, incluindo o Prisma CLI.

Não há configuração declarativa do Northflank versionada neste repositório. O Job informado deve ser inspecionado antes de executar operações; a tabela apresenta o nome conhecido e os requisitos a conferir:

| Configuração no painel | Valor esperado |
| ---------------------- | -------------- |
| Job informado pelo responsável | `portfolio-migrate` |
| Diretório de trabalho | `apps/sistema-os/backend/` |
| Comando | `npm run migrate:prod` |
| Secret exclusivo do Job | `MIGRATION_DATABASE_URL=<URI _ADMIN>`; obter a URI administrativa do addon sem registrá-la em código ou logs. |
| Condição para Deploy API | Migration Job concluído com exit code `0`. |
| Credencial da API | Somente sua `DATABASE_URL` runtime. |

`start:prod` continua sendo `node dist/main`; a migration pertence ao Job separado. A configuração efetiva no painel permanece não verificada; o diretório esperado da tabela reflete a estrutura nova e não confirma uma alteração de infraestrutura.

### Bootstrap do primeiro Administrador

Use o bootstrap somente uma vez, depois de aplicar as migrations em um banco novo e antes de existir qualquer `Usuario`. O comando cria um `Funcionario` ativo e sua conta ativa de perfil `ADMINISTRADOR` na mesma transação, sem iniciar servidor ou expor rota HTTP:

```bash
cd apps/sistema-os/backend
BOOTSTRAP_ADMIN_NAME='Nome do Administrador' \
BOOTSTRAP_ADMIN_PHONE='11999999999' \
BOOTSTRAP_ADMIN_CONTACT_EMAIL='contato@example.com' \
BOOTSTRAP_ADMIN_LOGIN_EMAIL='admin@example.com' \
BOOTSTRAP_ADMIN_PASSWORD='<senha-temporaria-segura>' \
npm run bootstrap:admin
```

Além dessas variáveis one-shot, `DATABASE_URL` deve apontar para o banco novo. A ausência das variáveis `BOOTSTRAP_ADMIN_*` não afeta o startup normal da API. Forneça a senha pelo mecanismo de secrets do ambiente ou apenas ao processo e remova-a assim que o comando terminar; não a mantenha em `.env`, histórico compartilhado ou logs.

O e-mail de login recebe trim e lowercase. A senha temporária preserva exatamente seus caracteres, deve ter de 8 a 128 caracteres e é persistida somente como hash Argon2id. O e-mail de contato permanece um campo separado.

Um advisory lock transacional do PostgreSQL serializa execuções concorrentes. Depois de obter o lock, o comando confirma `usuario.count() === 0` e cria `Funcionario` e `Usuario` na mesma transação. Se qualquer usuário já existir, recusa a operação sem promover, reativar ou alterar registros; se qualquer insert falhar, tudo sofre rollback.

Após o sucesso, autentique-se com o e-mail normalizado e a senha temporária. A conta nasce com `deveAlterarSenha = true`, portanto o fluxo normal de primeiro acesso exige a definição da senha definitiva antes de liberar a administração da interface.

### Sessão, CSRF e CORS

`express-session` mantém no cookie apenas o identificador assinado. `connect-pg-simple` persiste a sessão na tabela `session`; o startup não cria nem altera essa tabela.

O cookie usa `HttpOnly`, `SameSite=Lax`, caminho `/` e duração configurável. `Secure` é ativado apenas em produção.

Em produção no Northflank, o NestJS configura o Express para confiar somente no hop de proxy imediatamente anterior. Assim, o `X-Forwarded-Proto` definido pelo edge/load balancer permite reconhecer a conexão HTTPS original e emitir o cookie `Secure`; desenvolvimento e testes preservam o padrão do Express sem proxy confiável. Essa configuração é automática a partir de `NODE_ENV=production` e não exige comando adicional.

O store usa `disableTouch` e o middleware usa `rolling: false`, portanto cada acesso não renova a expiração.

Para mutações, o frontend obtém `GET /auth/csrf` e envia o token em `X-CSRF-Token` para `POST`, `PUT`, `PATCH` e `DELETE`.

O token fica somente em memória e é invalidado quando login, primeiro acesso ou logout regeneram ou encerram a sessão.

`FRONTEND_ORIGIN` define uma única origem explícita para o CORS com credenciais. Não use `origin: '*'` com autenticação por cookie.

CORS controla quais origens podem ler respostas no navegador. Com a origem estática atual, uma origem não autorizada recebe o header da origem configurada; o navegador bloqueia a leitura por divergência. Uma requisição simples ainda pode alcançar a API, e clientes HTTP fora do navegador não aplicam CORS. O preflight impede uma mutação com headers não simples quando sua origem diverge. CSRF valida a mutação; sessão e autorização do NestJS continuam sendo camadas separadas.

### Comunicação entre os domínios

A arquitetura publicada utiliza uma única `FRONTEND_ORIGIN`, correspondente ao frontend OS, sem lista de origens ou alteração no código CORS.

| Aplicação | Endereço final | Configuração pública |
| --- | --- | --- |
| Site | `https://leonardopassos.com` | `VITE_OS_URL=https://os.leonardopassos.com`; sem API ou autenticação. |
| Frontend OS | `https://os.leonardopassos.com` | `VITE_API_URL=https://os-api.leonardopassos.com` e `VITE_SITE_URL=https://leonardopassos.com`. |
| API | `https://os-api.leonardopassos.com` | `FRONTEND_ORIGIN=https://os.leonardopassos.com` e `NODE_ENV=production`. |

`FRONTEND_ORIGIN` deve conter a origem exata, sem caminho, barra final, credenciais, wildcard ou lista. A validação Zod existente exige uma URL válida, mas não canonicaliza nem exige uma origem sem caminho: configurar uma URL diferente do header `Origin` causa bloqueio no navegador. O site público não precisa ser autorizado na API. Os valores `VITE_*` precisam ser aplicados ao build do frontend escolhido. Se o hostname publicado da API mudar, o cookie exclusivo do host antigo não será transferido ao novo; será necessário autenticar novamente, mesmo preservando o store PostgreSQL e o segredo da sessão.

OS e API são origens diferentes, mas pertencem ao mesmo site: usam HTTPS e compartilham o domínio registrável `leonardopassos.com`. Assim, `SameSite=Lax` atende à comunicação prevista. O cookie sem `Domain` pertence exclusivamente ao host da API; o navegador o envia às chamadas para esse host mesmo quando iniciadas no OS. Não é necessário compartilhá-lo com o domínio do frontend ou adicionar `Domain=.leonardopassos.com`. A marca e os links externos usam navegação normal; seus URLs não transportam credenciais ou tokens. Consulte as definições de [site](https://developer.mozilla.org/en-US/docs/Glossary/Site) e [escopo de cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

O Axios do OS mantém `withCredentials: true`, token CSRF em memória, envio de `X-CSRF-Token` nas mutações e uma única recuperação de token obsoleto. A API mantém credenciais habilitadas, origem explícita e preflight com `Content-Type`/`X-CSRF-Token`, sem wildcard. Cookie HttpOnly, Secure em produção, path `/`, expiração fixa, rotação e revogação PostgreSQL permanecem iguais. [Referência de CORS com credenciais e preflight](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

Na manutenção da publicação, confira no Northflank:

| Configuração | Ação necessária |
| --- | --- |
| Ambiente da API | Usar `FRONTEND_ORIGIN=https://os.leonardopassos.com` e `NODE_ENV=production`. Mudanças de ambiente exigem reinício/publicação autorizados. |
| Domínio e TLS | Preservar `os-api.leonardopassos.com` e conferir certificado/acesso HTTPS direto, sem redirecionamento no preflight. |
| Proxy e cookie | Confirmar a cadeia real de proxies e `X-Forwarded-Proto` do hop confiável, conforme `trust proxy=1` existente. Verificar a emissão e o retorno de cookie Secure/HttpOnly/Lax sem Domain no host da API. |
| Sessão e banco | Preservar secrets e conexão runtime atuais, store PostgreSQL e duração da sessão. Não substituir credenciais da API pelas do Job de migration. Conferir a ausência de URI administrativa no runtime. |
| Segurança HTTP | Confirmar `OPTIONS` 204, origem exata, credenciais e headers permitidos sem desafio/redirecionamento no edge; login, CSRF, refresh, logout e origem pública bloqueada no navegador. |
| Deploy | Conferir gatilhos, filtros e imagem/SHA de cada recurso antes de enviar mudanças estruturais. O estado atual das automações não foi inspecionado nesta limpeza. |

As configurações efetivas de domínio, TLS, proxy, secrets e gatilhos permanecem externas e não verificadas pelo repositório. O teste local usa HTTP e portas diferentes de `localhost`; ele comprova CORS, credenciais, sessão e CSRF, mas não certifica HTTPS, cookies Secure ou a cadeia de proxies publicada.

O ambiente é local a cada pacote. Configure variáveis de desenvolvimento/teste a partir dos exemplos; produção usa os secrets dos painéis. Eventuais privados dos diretórios antigos permanecem ignorados e não são descobertos pelo NestJS, Prisma ou Vitest. As validações da limpeza usam conexão local de teste injetada no processo e segredos de sessão/HMAC sintéticos, sem alterar arquivos privados.

### Documentação HTTP, CEP e logs

Com o backend em execução, a Swagger UI está em `http://localhost:3000/api/docs`, e o OpenAPI JSON está em `http://localhost:3000/api/docs/openapi.json`.

`GET /clients/cep/:cep` consulta o ViaCEP pelo `fetch` nativo do Node. O navegador consome apenas o contrato interno do backend.

A integração tem timeout e os testes usam mocks, sem depender da internet.

O NestJS usa `ConsoleLogger` e `Logger` nativos. Em desenvolvimento e testes, os logs são legíveis; em produção, são JSON.

Logs e respostas sanitizadas não incluem segredos, credenciais, URLs completas de conexão, cookies, tokens ou corpos completos de requisição.

## Tecnologias configuradas

Esta seção registra comandos históricos de adoção das tecnologias. Os comandos com `frontend` ou `backend` na raiz antecedem a modularização e não descrevem o ambiente executável atual em `apps/`.

Não os execute novamente apenas para preparar um clone existente; para isso, use `npm ci` na seção inicial.

### Frontend

| Tecnologia               | Motivo                                                                  | Comando registrado                                       |
| ------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| React, TypeScript e Vite | Base tipada da SPA e ambiente de desenvolvimento e build.               | `npm create vite@latest frontend -- --template react-ts` |
| Axios                    | Cliente HTTP compartilhado com `withCredentials` e CSRF em memória.     | `cd frontend && npm install axios`                       |
| TanStack Query           | Cache e coordenação de server state, sem substituir o estado de sessão; a troca ou perda de identidade descarta o cache integralmente. | `cd frontend && npm install @tanstack/react-query`       |
| Wrangler                 | Publicação do build Vite como Static Assets no Cloudflare Workers, com fallback para rotas da SPA. | `cd frontend && npm install --save-dev wrangler` |

### Backend

| Tecnologia                        | Motivo                                                           | Comando registrado                                                                    |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| NestJS                            | API independente, módulos e infraestrutura de execução.          | `npx @nestjs/cli@latest new backend --package-manager npm --skip-git --skip-install`  |
| `@nestjs/config` e Zod            | Leitura e validação do ambiente no startup.                      | `cd apps/sistema-os/backend && npm install @nestjs/config zod`                                        |
| Prisma, adapter PostgreSQL e `pg` | Client tipado e acesso PostgreSQL pelo NestJS.                   | `cd apps/sistema-os/backend && npm install @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.0` |
| Prisma CLI e dotenv               | Migrations, geração de client e leitura de ambiente pelo Prisma. | `cd apps/sistema-os/backend && npm install --save-dev prisma@7.10.0 dotenv@17.2.4`                    |
| Sessões PostgreSQL                | Sessão server-side persistida e revogável.                       | `cd apps/sistema-os/backend && npm install express-session@1.19.0 connect-pg-simple@10.0.0`           |
| OpenAPI                           | Swagger UI e contrato HTTP navegável.                            | `cd apps/sistema-os/backend && npm install @nestjs/swagger@12.0.1`                                    |
| Argon2id                          | Hash e verificação reutilizáveis de senhas.                      | `cd apps/sistema-os/backend && npm install argon2@0.45.1`                                             |
| `ipaddr.js`                       | Canonicalização robusta de IPs para o HMAC de origem DEMO.       | `cd apps/sistema-os/backend && npm install ipaddr.js@1.9.1`                                           |

### Interface e formulários

| Tecnologia      | Motivo                                                | Comando registrado                                              |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| Tailwind CSS    | Classes utilitárias integradas ao Vite.               | `cd frontend && npm install tailwindcss @tailwindcss/vite`      |
| IBM Plex Sans   | Fonte self-hosted, sem requisição externa em runtime. | `cd frontend && npm install @fontsource-variable/ibm-plex-sans` |
| React Router    | Navegação client-side declarativa da SPA.             | `cd frontend && npm install react-router`                       |
| React Hook Form | Estado e submissão de formulários.                    | `cd frontend && npm install react-hook-form`                    |
| Zod e resolvers | Schemas de validação integrados aos formulários.      | `cd frontend && npm install zod @hookform/resolvers`            |
