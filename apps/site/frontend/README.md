# Site público do portfólio

Esta aplicação apresenta Leonardo Passos e os estudos de caso dos projetos. Este guia destina-se a quem vai executar, desenvolver ou preparar o build do site.

O site contém a Home em `/`, o estudo de caso em `/projetos/sistema-os` e um fallback público para endereços desconhecidos. Ele funciona sem autenticação, API, consulta de sessão ou geração DEMO; os acessos ao Sistema OS são links externos.

## Executar localmente

A partir da raiz do repositório:

```bash
cd apps/site/frontend
npm ci
cp .env.example .env.local
npm run dev -- --port 5174 --strictPort
```

`VITE_OS_URL` define a URL base absoluta do frontend Sistema OS. O exemplo aponta para `http://localhost:5175`; ajuste esse endereço para o ambiente de desenvolvimento utilizado. O cabeçalho aponta para `/login`, e os CTAs “Testar aplicação” apontam para `/demo` na outra aplicação. Credenciais não são transportadas nesses links.

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

O pacote `portfolio-site-frontend` instala suas dependências e gera seu próprio `dist/`, sem workspace ou imports dos outros frontends. `wrangler.jsonc` mantém a identidade local `portfolio-site` e o fallback de SPA. O fallback visual de página não encontrada não configura status HTTP 404 no serviço de assets.

Nenhum deploy, domínio ou gatilho externo foi alterado na Etapa 3. A publicação exige conferir e proteger as configurações externas antes de qualquer push estrutural.

Consulte [a configuração geral](../../../docs/setup.md), [o mapa frontend](../../../docs/frontend-files.md) e [o catálogo de testes](../../../docs/testing.md).

O inventário de painéis, os bloqueios do pipeline da `main`, a sequência futura de publicação e a reversão estão em [Preparação local do deploy](../../../docs/deploy.md). Esta preparação não publica os Workers nem configura seus domínios.
