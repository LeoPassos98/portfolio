# Backend do Sistema OS

Publicado em `https://os-api.leonardopassos.com`, este pacote contém a API NestJS, persistência PostgreSQL, autenticação e regras de negócio do Sistema OS. Destina-se a quem executa ou mantém a API em `apps/sistema-os/backend/`.

## Ambiente e execução

Consulte o [guia de configuração](../../../docs/setup.md) para configurar as variáveis a partir dos exemplos deste pacote. Configure ambiente e secrets explicitamente no pacote ou processo; nenhum arquivo dos diretórios legados é necessário ou carregado automaticamente.

Na raiz do repositório:

```bash
cd apps/sistema-os/backend
npm ci
npm run prisma:validate
npm run lint
npm run build
npm run start:dev
```

O build gera o Prisma Client e os artefatos em `dist/`. Ele não aplica migrations. O startup normal usa `npm run start:prod`; sessão, CSRF, autorização e CORS mantêm os contratos existentes.

## Testes e operações

O [catálogo de testes](../../../docs/testing.md) descreve as suítes e os resultados. `npm test` e `npm run test:e2e` preparam o banco com migrations. Quando migrations não forem autorizadas, confirme previamente as duas URLs para PostgreSQL local `portfolio_test` e as migrations já aplicadas; então use os runners diretamente:

```bash
npm run test:scripts
npm exec -- vitest run
npm exec -- vitest run --config ./vitest.config.e2e.ts
```

| Comando | Responsabilidade |
| --- | --- |
| `npm run bootstrap:admin` | Compila e cria o primeiro Administrador do PRINCIPAL somente em um banco novo, mediante variáveis one-shot explícitas. |
| `npm run demo:cleanup` | Executa `dist/demo-cleanup.js` após build, usando apenas a conexão runtime e as regras existentes de expiração. |
| `npm run migrate:prod` | Job separado de migration, exclusivamente com `MIGRATION_DATABASE_URL`; nunca faz parte do startup da API. |

Esses comandos operacionais podem escrever dados ou schema. A reorganização local não autoriza sua execução em desenvolvimento ou produção. Serviços e Jobs Northflank devem usar o pacote atual ou sua imagem; o PostgreSQL permanece separado e preservado. O pipeline conhecido contém build `portfolio-backend-build`, Job `portfolio-migrate` e release `portfolio-api`; comandos, artefatos e manutenção estão em [Publicação e operação](../../../docs/deploy.md).

Consulte o [mapa de arquivos](../../../docs/backend-files.md) para localizar módulos, scripts, schema e testes.
