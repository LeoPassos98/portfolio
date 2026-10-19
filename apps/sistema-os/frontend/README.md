# Frontend do Sistema OS

Esta aplicação concentra autenticação, primeiro acesso, Dashboard, Clientes, Funcionários, Ordens de Serviço, Perfil e demonstração do Sistema OS. Este guia destina-se a quem vai executar ou desenvolver o frontend.

Publicado em `https://os.leonardopassos.com`, o frontend usa a API `https://os-api.leonardopassos.com`. A raiz `/` e endereços desconhecidos encaminham para `/login`. O login resolve sessões válidas para Dashboard ou Primeiro Acesso.

A mesma página `/login` atende contas permanentes e demonstrativas. Seu painel permite escolher EXEMPLO/VAZIO, gerar credenciais temporárias e usar **Preencher login**. O visitante ainda precisa clicar em **Entrar**: preencher não autentica.

Em telas a partir de 1024 px, o formulário de login e o painel DEMO ficam lado a lado. Em telas menores, ficam empilhados. A tela de primeiro acesso mantém a largura compacta.

Não existe rota frontend `/demo`; esse endereço recebe o mesmo fallback de qualquer rota desconhecida.

A integração segue a [revisão aprovada de UI](https://app.notion.com/p/3c51e6e3a46e81b9a072dcac1ede4942) e o [planejamento de telas e fluxo](https://app.notion.com/p/3c21e6e3a46e81ab9151f93798c63789), que adotam um login único com geração DEMO na mesma página.

## Executar localmente

A partir da raiz do repositório:

```bash
cd apps/sistema-os/frontend
npm ci
cp .env.example .env.local
npm run dev -- --port 5175 --strictPort
```

Configure `VITE_API_URL` para a API local autorizada. O CORS desse ambiente precisa permitir a origem do frontend; o exemplo usa `http://localhost:3000` para a API. O backend está em `apps/sistema-os/backend/`, com ambiente e comandos descritos no [guia de configuração](../../../docs/setup.md).

`VITE_SITE_URL` configura a URL base absoluta do portfólio. O exemplo usa `http://localhost:5174`; sem a variável, o padrão é `https://leonardopassos.com`. A marca das telas de autenticação retorna ao portfólio por um link externo. O layout visitante antigo foi removido. Não há credenciais em links, navigation state, URLs ou armazenamento do navegador; os valores gerados ficam apenas no estado React e nos campos do formulário e desaparecem ao recarregar a página.

O gerador continua chamando `POST /demo/access` pelo cliente Axios/CSRF existente, com `tutorialEnabled: false`. Exibe login, senha temporária, prazo de ativação e validade; mantém loading, bloqueio de duplicidade, cópia e mensagens de limites/erros. React Hook Form preenche os campos normais e devolve foco ao e-mail. Sessões ativas mantêm os redirecionamentos anteriores e não acessam o gerador.

## Validar e preparar o build

```bash
npm run lint
npm run build
npm run preview -- --port 4175 --strictPort
```

As variáveis `VITE_*` são públicas e incorporadas ao build. O arquivo `.env.production.example` contém somente os valores públicos aprovados e não é carregado automaticamente pelo Vite. Preserve `.env.example` para desenvolvimento. Para gerar o artefato de produção, configure ambas as URLs explicitamente:

```bash
VITE_API_URL=https://os-api.leonardopassos.com \
VITE_SITE_URL=https://leonardopassos.com npm run build
```

Axios com credenciais, CSRF, TanStack Query, providers e guards de sessão permanecem locais ao pacote. A interface não substitui a autorização do NestJS. Qualquer teste com escrita no PostgreSQL exige confirmação prévia de `portfolio_test` e limpeza das fixtures próprias; migrations e produção não fazem parte da validação desta etapa.

O pacote `portfolio-sistema-os-frontend` possui seu próprio lockfile e `dist/`; `wrangler.jsonc` mantém a identidade local `portfolio-sistema-os` e o fallback de SPA. A publicação usa root `apps/sistema-os/frontend` e artefato `dist/`. O comando `npx wrangler deploy --config wrangler.jsonc` é executado no pacote somente após autorização; confira gatilhos e filtros antes de enviar mudanças estruturais.

Consulte [a configuração geral](../../../docs/setup.md), [o mapa frontend](../../../docs/frontend-files.md) e [o catálogo de testes](../../../docs/testing.md).

Diretórios, variáveis, comandos e reversão estão em [Publicação e operação](../../../docs/deploy.md). O Worker antigo `portfolio`, caso continue existindo, depende de remoção manual no Cloudflare. Esta limpeza não altera serviços ou domínios.
