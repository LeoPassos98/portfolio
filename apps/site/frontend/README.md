# Site público do portfólio

Esta aplicação apresenta Leonardo Passos e os estudos de caso dos projetos. Este guia destina-se a quem vai executar, desenvolver ou preparar o build do site.

Publicado em `https://leonardopassos.com`, o site contém a Home em `/`, o estudo de caso em `/projetos/sistema-os` e encaminha endereços desconhecidos para `/`, substituindo a entrada inválida no histórico. Ele funciona sem autenticação, API, consulta de sessão ou geração DEMO; os acessos ao Sistema OS são links externos.

## Executar localmente

A partir da raiz do repositório:

```bash
cd apps/site/frontend
npm ci
cp .env.example .env.local
npm run dev -- --port 5174 --strictPort
```

`VITE_OS_URL` define a URL base absoluta do frontend Sistema OS. O exemplo aponta para `http://localhost:5175`; ajuste esse endereço para o ambiente de desenvolvimento utilizado. O cabeçalho e todos os CTAs “Testar aplicação” apontam para `/login` no Sistema OS. Nessa página, o visitante pode gerar credenciais DEMO e preencher o formulário antes de clicar em Entrar. Credenciais não são transportadas nesses links.

Sem `VITE_OS_URL`, o site usa `https://os.leonardopassos.com`. A variável é pública e incorporada ao build pelo Vite; mudar seu valor exige gerar outro build. `VITE_API_URL` não é necessária e não participa da aplicação.

## Validar e gerar o build

```bash
npm run lint
npm run build
npm run preview -- --port 4174 --strictPort
```

O arquivo `.env.production.example` contém somente valores públicos de referência e não é carregado automaticamente pelo Vite. Preserve `.env.example` para desenvolvimento; injete as variáveis de produção no processo de build ou no painel de Workers Builds.

Para definir explicitamente o destino de produção:

```bash
VITE_OS_URL=https://os.leonardopassos.com npm run build
```

O pacote `portfolio-site-frontend` instala suas dependências e gera seu próprio `dist/`, sem workspace ou imports dos outros frontends. `wrangler.jsonc` mantém a identidade local `portfolio-site` e o fallback de SPA. O Router encaminha rotas desconhecidas para a Home; esse redirecionamento ocorre no navegador, sem configurar status HTTP 404 ou 3xx no serviço de assets.

A marca do cabeçalho usa `src/assets/brand/logo_name.svg`; o rodapé escuro usa `logo_name_all_white.svg`. O favicon fica em `public/favicon.svg` e é referenciado por `/favicon.svg`. Os SVGs mantêm os desenhos autorais, sem scripts ou metadados do editor.

A publicação usa o Worker correspondente `portfolio-site`, com root `apps/site/frontend` e artefato `dist/`. No pacote, o comando de deploy é `npx wrangler deploy --config wrangler.jsonc`, exclusivamente após autorização. A manutenção não depende dos arquivos do frontend OS ou backend.

Consulte [a configuração geral](../../../docs/setup.md), [o mapa frontend](../../../docs/frontend-files.md) e [o catálogo de testes](../../../docs/testing.md).

Diretórios, variáveis, comandos e reversão estão em [Publicação e operação](../../../docs/deploy.md). O Worker antigo `portfolio`, caso continue existindo, depende de remoção manual no Cloudflare. Esta limpeza não altera serviços ou domínios.
