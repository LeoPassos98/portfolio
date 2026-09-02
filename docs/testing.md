# Testes e validação

Este documento explica **para que os testes existem neste projeto, por que cada tipo de validação é usado, o que os resultados significam e quais limitações ou observações precisam ser lembradas**.

Ele não substitui os arquivos de teste. Os arquivos `.spec.ts` continuam sendo a fonte detalhada dos casos executáveis; aqui o objetivo é fornecer uma visão compreensível da estratégia e do estado validado do sistema.

## 1. Para que os testes servem

Os testes existem para fornecer evidência repetível de que uma regra ou comportamento continua funcionando depois que o código muda.

No projeto, eles cumprem principalmente quatro funções:

1. **Provar regras de negócio e segurança.** Ex.: somente Administrador pode alterar certas informações; CSRF é exigido em mutations; CPF/CNPJ duplicado é recusado.
2. **Provar integração real.** Ex.: uma rota NestJS realmente grava ou consulta o PostgreSQL por meio do Prisma, em vez de apenas testar uma função isolada.
3. **Evitar regressões.** Quando uma feature nova é adicionada, os testes antigos continuam rodando. Se algo já concluído for quebrado, a suíte pode detectar o problema antes do commit.
4. **Registrar comportamento esperado.** Um teste legível também documenta, de forma executável, como determinado caso deve se comportar.

Testes reduzem risco, mas **não provam que o sistema não possui defeitos**. Eles comprovam os cenários que foram cobertos. Auditorias e validações no navegador continuam importantes para encontrar problemas fora desses cenários.

## 2. O que significa “203 testes passando”

No marco atual, após **N5.4B — criação real de Funcionário no backend**, o comando do backend:

```bash
npm test
```

executa a suíte Vitest e conclui com **203 testes aprovados**.

Esse número é **cumulativo**: ele inclui testes criados nas etapas anteriores do backend, não apenas os testes de Funcionários.

Portanto, quando os 203 passam após uma mudança nova, isso fornece duas evidências:

- o comportamento novo coberto pelos testes está correto;
- comportamentos antigos cobertos pela mesma suíte não sofreram uma regressão detectável.

O número não representa porcentagem de cobertura e não significa “203 funcionalidades”. É apenas a quantidade atual de casos automatizados aprovados na suíte do backend.

## 3. Tipos de validação usados

### 3.1 Testes de unidade e infraestrutura

Validam componentes menores de forma focada, sem precisar necessariamente atravessar o fluxo HTTP completo.

Exemplos existentes:

- `ZodValidationPipe`: parsing, transformação e rejeição de entradas inválidas;
- `HttpExceptionFilter`: formato público dos erros e sanitização de erro interno;
- `PasswordService`: hash Argon2id e verificação de senha;
- configuração de sessão: cookie, expiração e opções de segurança;
- `SessionGuard`, `FirstAccessCompletedGuard`, `RoleGuard` e `CsrfGuard`;
- `ViaCepProvider`: mapeamento, timeout e tratamento de respostas do fornecedor.

**Por que existem:** deixam regras técnicas importantes fáceis de isolar. Quando um guard falha, por exemplo, é possível saber se o problema está no próprio guard antes de investigar uma rota inteira.

### 3.2 Testes HTTP integrados com NestJS e PostgreSQL real

Os testes de autenticação, Clientes e Funcionários sobem uma aplicação NestJS de teste e exercitam as rotas HTTP com `supertest`.

Esses testes usam o `DatabaseService`/Prisma e o banco de desenvolvimento `portfolio_dev` para verificar situações como:

- retorno HTTP correto;
- persistência realmente criada no PostgreSQL;
- leitura dos dados persistidos;
- autorização por sessão/perfil;
- CSRF em métodos mutáveis;
- filtros, buscas e ordenação;
- tratamento dos erros de banco.

**Por que usar banco real nesses casos:** algumas regras importantes pertencem ao PostgreSQL e não devem ser simuladas como se fossem apenas lógica da aplicação. UNIQUE, foreign keys e comportamento de transação precisam ser testados contra a infraestrutura real quando essa integridade é parte da regra.

### 3.3 Integridade e concorrência do banco

Além do caminho normal do service, alguns testes confirmam as proteções finais do próprio banco.

Exemplos:

- CPF/CNPJ único em Cliente;
- `P2002` traduzido para conflito de documento;
- `ON DELETE RESTRICT` impedindo exclusão de Cliente com OS;
- `P2003` convertido para `CLIENT_HAS_ORDERS` para proteger contra corrida entre a consulta e o DELETE;
- constraints `CHECK`, `UNIQUE` e `RESTRICT` validadas na fundação do banco.

**Por que existem:** uma verificação feita antes da escrita pode deixar de ser verdadeira alguns milissegundos depois se outra operação concorrente modificar o banco. A constraint física permanece como a autoridade final de integridade.

### 3.4 Segurança e sessão

Há testes específicos e integrados para verificar:

- ausência de sessão → `401 AUTH_UNAUTHENTICATED`;
- primeiro acesso pendente → `403 AUTH_PASSWORD_CHANGE_REQUIRED`;
- perfil sem permissão → `403 AUTH_FORBIDDEN`;
- mutation sem token CSRF válido → `403 CSRF_INVALID_TOKEN`;
- GET não exige CSRF;
- sessão persistida no PostgreSQL;
- revogação de sessões por usuário;
- cookie e configurações de sessão;
- senha em texto puro não persistida nem exposta.

**Por que existem:** esconder um botão no React não é segurança. As restrições precisam ser comprovadas no backend, que é a autoridade real.

### 3.5 Dependências externas

A integração de CEP segue duas formas de validação:

**Suíte automatizada:** o `fetch` externo é simulado no teste do `ViaCepProvider`. Isso permite testar sucesso, resposta parcial, CEP inexistente, timeout, JSON inválido e indisponibilidade sem depender da internet.

**Smoke real separado:** quando o ambiente possui acesso externo, uma consulta real pode ser executada para confirmar a integração operacional. O CEP `01001000` já foi validado com sucesso em smoke real.

**Por que separar:** um teste automatizado não deve começar a falhar simplesmente porque o fornecedor externo ou a internet estão temporariamente indisponíveis.

### 3.6 Validação real no navegador

O frontend ainda não possui uma suíte automatizada própria equivalente ao Vitest do backend. Os fluxos integrados relevantes são validados no navegador real durante os marcos de integração/auditoria.

Já foram validados, entre outros:

- login, primeiro acesso, logout e perda/revogação de sessão;
- Clientes com listagem, filtros, busca, criação, edição, status e exclusão;
- comportamento diferente entre Administrador e Funcionário;
- bloqueio de exclusão de Cliente com OS;
- CEP automático e fallback manual;
- persistência após reload;
- estados reais de loading, erro, retry, pending e sucesso nas telas integradas.

**Por que existe:** build e testes de backend não comprovam sozinhos que a interface, navegação, cache e formulários estão funcionando juntos no browser.

### 3.7 Lint, build e `git diff --check`

Essas verificações fazem parte do gate de qualidade, mas não devem ser confundidas com testes de comportamento.

- `npm run lint`: procura problemas estáticos de código;
- `npm run build`: confirma que TypeScript/framework conseguem produzir a aplicação;
- `git diff --check`: detecta erros como whitespace inválido no diff.

Elas complementam os testes.

## 4. Fixtures e limpeza

Testes integrados precisam criar dados temporários como Funcionários, Clientes, Usuários, OS e sessões.

A regra do projeto é:

- criar apenas os dados necessários para o cenário;
- rastrear os IDs criados pela própria suíte;
- remover esses dados ao final;
- remover somente as sessões auxiliares criadas pelo teste;
- **preservar sessões e dados preexistentes que não pertencem à suíte**.

Isso é importante porque `portfolio_dev` é um banco real de desenvolvimento. Um teste não deve deixar lixo nem apagar dados que não criou.

## 5. Resultados consolidados até o momento

Os números abaixo são totais cumulativos do backend no respectivo marco.

| Marco | Resultado automatizado principal | Observação |
| --- | ---: | --- |
| Fechamento N5.1 — fundação backend/banco | 16 testes | Prisma, HTTP transversal, PostgreSQL, OpenAPI, logs e shadow database auditados. |
| N5.2H — autenticação/sessão/revogação | 63 testes | Segurança server-side consolidada; depois o frontend de autenticação foi validado também no navegador. |
| N5.3A — leitura de Clientes | 83 testes | Primeira feature de negócio consultando PostgreSQL real. |
| N5.3B — criação de Clientes | 110 testes | Normalização, CPF/CNPJ, UNIQUE e CSRF adicionados. |
| N5.3C — edição de Clientes | 137 testes | Edição de ativos/inativos e unicidade de documento. |
| N5.3D — status de Clientes | 147 testes | Autorização administrativa de ativação/desativação. |
| N5.3E — exclusão de Clientes | 160 testes | Regra de OS + proteção final da FK. |
| N5.3F — CEP | 173 testes | Provider externo mockado na suíte + smoke real separado. |
| Auditoria N5.3 — Clientes end-to-end | suíte mantida aprovada + browser real | Auditoria encontrou o defeito visual do filtro “Todos”, corrigido antes do fechamento. |
| N5.4A — leitura de Funcionários | 186 testes | Relação opcional `Funcionario.usuario?`, autorização administrativa e privacidade do DTO. |
| N5.4B — criação de Funcionários | **203 testes** | Criação real sem conta automática, normalizações, schema estrito, CSRF e permissões. |

## 6. O que já foi aprendido com as auditorias

### Teste automatizado não substitui auditoria de interface

Na auditoria de Clientes, a API tratava corretamente `status=all`, porém o seletor do frontend voltava visualmente para “Ativos”. O problema foi encontrado no browser e corrigido.

Isso mostra uma limitação atual importante: **o backend possui uma suíte automatizada forte, mas o frontend ainda depende principalmente de lint, build e validações reais no navegador**.

Isso não invalida a estratégia atual, mas significa que bugs puramente visuais ou de estado React podem escapar da suíte do backend.

### Banco real melhora confiança, mas exige disciplina

Os testes integrados contra `portfolio_dev` comprovam regras que mocks não comprovariam. Em troca, exigem cuidado maior com fixtures, sessões e `DATABASE_URL`.

Nunca execute testes que alteram dados apontando deliberadamente para um banco de produção.

### Serviços externos não devem controlar a estabilidade da suíte

ViaCEP é mockado nos testes automatizados. A internet real é usada apenas como smoke operacional quando disponível.

### Quantidade de testes não é o objetivo

O contador cresce porque novas regras precisam de evidência. Um teste só é útil quando protege um comportamento relevante. A meta não é aumentar o número por si só.

## 7. Como executar as validações atuais

### Backend

Dentro de `backend/`:

```bash
npm test
npm run lint
npm run build
```

Scripts adicionais disponíveis:

```bash
npm run test:watch
npm run test:cov
npm run test:e2e
```

Eles existem no projeto, mas o gate usado nas etapas atuais tem sido principalmente `npm test`, `npm run lint` e `npm run build`.

### Frontend

Dentro de `frontend/`:

```bash
npm run lint
npm run build
```

No frontend não há, neste momento, um script de suíte automatizada de testes no `package.json`.

### Repositório

Na raiz:

```bash
git diff --check
```

## 8. Quando este documento deve ser atualizado

`docs/testing.md` deve acompanhar mudanças **relevantes** na forma como o projeto é testado.

Atualizar quando:

- surgir uma nova estratégia/categoria de teste;
- mudar uma ferramenta ou comando permanente;
- uma integração nova exigir abordagem diferente;
- uma feature ou etapa importante for encerrada/auditada e houver um resultado consolidado útil;
- uma auditoria revelar uma limitação ou aprendizado relevante;
- o procedimento de banco, fixtures ou limpeza mudar.

Não é necessário editar este documento apenas porque alguns testes novos fizeram o contador subir durante uma etapa intermediária. O resultado deve ser atualizado em **marcos compreensíveis**, para o documento não virar um changelog de cada commit.

A regra operacional correspondente está registrada em `AGENTS.md`.
