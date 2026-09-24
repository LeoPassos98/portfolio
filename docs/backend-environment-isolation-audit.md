# Auditoria arquitetural do backend para isolamento por Environment

Este relatório documenta o impacto arquitetural da futura introdução de `Environment` como fronteira obrigatória de isolamento no backend. Destina-se a quem for modelar, implementar ou revisar essa mudança antes de habilitar ambientes de demonstração.

## Resumo executivo

O backend atual é um monólito NestJS modular, com acesso direto ao Prisma em cada service e sem abstração de tenant. Isso funciona para o cenário atual de conjunto global único, mas adicionar apenas `environmentId` ao schema não produziria isolamento seguro.

Os riscos mais importantes são:

1. Clientes, Funcionários e Dashboard são consultados globalmente.
2. Administradores podem operar qualquer UUID existente em Clientes, Funcionários, contas e Ordens.
3. Ordens `PUBLICA` atualmente são visíveis a qualquer Funcionário do sistema; após existirem ambientes, isso vazaria OS públicas entre tenants.
4. A criação de OS trava Cliente e Funcionário com SQL raw apenas por `id`, permitindo associação cross-environment se não for alterada.
5. A troca de responsável aceita qualquer Funcionário ativo encontrado globalmente.
6. O histórico pode relacionar OS, responsável e autor de ambientes diferentes.
7. A regra do último Administrador conta Administradores globalmente.
8. Dashboard e métricas SQL agregam todos os registros.
9. `Cliente.documento` e `OrdemServico.numero` são únicos globalmente.
10. O contador de OS é um singleton físico, reforçado por constraint no PostgreSQL.
11. Sessões guardam apenas `usuarioId`; o ambiente ainda não existe no principal autenticado.
12. Não há qualquer teste cross-environment.

A estratégia segura é: criar e fazer backfill do ambiente PRINCIPAL, derivar o ambiente no `SessionGuard`, escopar todas as queries enquanto só existe o PRINCIPAL, adicionar constraints compostas que impeçam relações cruzadas e somente depois permitir a criação de demos.

## 1. Visão geral da arquitetura atual

A aplicação está dividida em módulos NestJS de Autenticação, Clientes, Funcionários, Perfil, Ordens e Dashboard. Os services injetam diretamente `DatabaseService`, que estende o Prisma Client; não existem repositories ou uma camada central de escopo de dados (`backend/src/database/database.service.ts`).

O fluxo protegido é:

```text
express-session
→ SessionGuard
→ AuthService.getAuthenticatedUser(usuarioId)
→ request.authenticatedUser
→ FirstAccessCompletedGuard
→ RoleGuard
→ controller
→ service
→ Prisma
```

O `CsrfGuard` é global e independente da autenticação. A sessão é persistida pelo `connect-pg-simple` em PostgreSQL, usando outro pool `pg`, separado do Prisma.

O backend possui atualmente as seguintes policies:

- autenticação por sessão;
- troca obrigatória de senha;
- autorização por `Perfil`;
- visibilidade própria/pública das Ordens;
- OCC por `versao`;
- último Administrador ativo;
- estado ativo de Cliente/Funcionário na criação de OS.

Não existe policy de Environment.

## 2. Inventário dos modelos

O schema real contém seis modelos de domínio e uma tabela de infraestrutura em `backend/prisma/schema.prisma`.

| Modelo | Responsabilidade atual | Unicidades/relações importantes | Escopo futuro |
|---|---|---|---|
| `Cliente` | Cadastro de clientes | `documento @unique`; possui OS | Direto e obrigatório |
| `Funcionario` | Cadastro operacional | relação opcional 1:1 com `Usuario`; responsável atual e histórico | Direto e obrigatório |
| `Usuario` | Credencial, perfil e primeiro acesso | `emailLogin @unique`; `funcionarioId @unique` e `Restrict` | Direto e obrigatório |
| `OrdemServico` | OS atual | `numero @unique`; FK `Restrict` para Cliente e responsável | Direto e obrigatório |
| `HistoricoOrdemServico` | Snapshot de versões anteriores | FKs `Restrict` para OS, responsável e autor; unique `(ordemServicoId, versao)` | Decisão; recomendação: direto |
| `ContadorOrdemServico` | Sequência global de OS | singleton `id = 1` no banco | Um contador por Environment |
| `Session` | Sessão server-side | JSON `sess`, expiração e PK `sid`; sem FK | Infraestrutura, não dado de negócio |

Também existem os enums `Perfil`, `StatusOrdemServico` e `Visibilidade`, que podem continuar globais.

### Constraints físicas não evidentes apenas pelo schema

A migration do contador contém:

- `CHECK ("id" = 1)`;
- `CHECK ("ultimo_numero" >= 0)`;
- seed baseado no maior `OS-<número>` existente.

Isso precisa ser considerado na futura migration, pois remover apenas `@default(1)` do Prisma não elimina o singleton físico.

## 3. Classificação usada

- **A** — deve obrigatoriamente ser limitada ao Environment autenticado.
- **B** — acesso global intencional para descobrir ou operar o contexto autorizado.
- **C** — infraestrutura sem propriedade de negócio por Environment.
- **D** — depende de decisão arquitetural prévia.

## 4. Inventário completo das consultas Prisma e SQL de runtime

### Autenticação

Arquivo: `backend/src/auth/auth.service.ts`

| Método/operação | Consulta | Finalidade | Classe |
|---|---|---|---|
| `authenticate` | `usuario.findUnique({ emailLogin, include: funcionario })` | Login por e-mail global | **B** |
| `getAuthenticatedUser` | `usuario.findUnique({ id })` | Reconstruir o principal a partir da sessão | **B** |
| `changeFirstAccessPassword` | `usuario.update({ id })` | Trocar senha e remover primeiro acesso | **A** |

O login global é coerente com a decisão de manter `emailLogin` globalmente único. A query de sessão também pode continuar global, porque o `usuarioId` vem do cookie assinado e é o ponto de descoberta do ambiente. Depois dessa descoberta, o restante da request precisa operar em A.

### Clientes

Arquivo: `backend/src/clients/clients.service.ts`

| Método | Consultas | Finalidade | Classe |
|---|---|---|---|
| `findAll` | `cliente.findMany` | Lista, status e busca por nome/documento | **A** |
| `findOne` | `cliente.findUnique({ id })` | Detalhe | **A** |
| `create` | `cliente.create` | Cadastro; P2002 vira conflito de documento | **A** |
| `update` | `cliente.update({ id })` | Edição; trata P2002/P2025 | **A** |
| `updateStatus` | `cliente.update({ id })` | Ativação/inativação | **A** |
| `remove` | `ordemServico.findFirst({ clienteId })` | Bloqueio de exclusão com OS | **A** |
| `remove` | `cliente.delete({ id })` | Exclusão definitiva | **A** |

`GET /clients/cep/:cep` não acessa o banco; é integração externa e permanece **C** em relação ao tenant.

### Funcionários e contas

Arquivo: `backend/src/employees/employees.service.ts`

| Fluxo | Consultas principais | Classe |
|---|---|---|
| `create` | `funcionario.create` | **A** |
| `update` | `funcionario.update({ id })` | **A** |
| `findAll` | `funcionario.findMany` com conta | **A** |
| `findOne` | `funcionario.findUnique({ id })` | **A** |
| `createAccess` | transação serializável; `funcionario.findUnique`, `usuario.create`; consulta de conflito por `funcionarioId` | **A** |
| `resetAccessPassword` | `funcionario.findUnique`, `usuario.update({ id })` | **A** |
| `updateAdministrative` | transação serializável; leitura/edição do funcionário, transições de conta e `session.deleteMany` | Domínio **A**; sessão **C** |
| `transitionStatus` | `funcionario.findUnique`, eventual `usuario.update`, `funcionario.update` | **A** |
| `transitionAccessStatus` | `funcionario.findUnique`, `usuario.update` | **A** |
| `transitionAccessProfile` | `funcionario.findUnique`, `usuario.update` | **A** |
| `transitionAccessLoginEmail` | `funcionario.findUnique`, `usuario.update` | **A** |
| `ensureNoActiveOrders` | `ordemServico.findFirst({ responsavelId, status })` | **A** |
| `ensureAnotherActiveAdministrator` | `usuario.count({ ADMINISTRADOR, ativo })` | **A**, mas atualmente global |
| retry serializável | `$transaction(..., Serializable)`, até três tentativas | Mecanismo **C**, operação interna **A** |

Todas as rotas do controller são administrativas e protegidas por `RoleGuard`, mas o perfil Administrador hoje é global, não contextual.

### Ordens de Serviço

Arquivo: `backend/src/orders/orders.service.ts`

| Fluxo | Consulta/operação | Classe |
|---|---|---|
| `findAll` | `ordemServico.findMany` | **A** |
| `findResponsibles` | `ordemServico.findMany`, distinct por responsável | **A** |
| `findOne` | `ordemServico.findFirst({ id, visibilidade })` | **A** |
| `findHistory` | `ordemServico.findFirst` e `historicoOrdemServico.findMany` | **A** |
| `create` | transação serializável | **A** |
| `lockActiveClient` | SQL raw `SELECT ... FROM cliente WHERE id = ? FOR UPDATE` | **A** |
| `lockActiveResponsible` | SQL raw equivalente sobre `funcionario` | **A** |
| criação do número | `contadorOrdemServico.update({ id: 1, increment })` | **A** |
| persistência | `ordemServico.create` | **A** |
| `update` | `ordemServico.findFirst({ id, visibilidade })` | **A** |
| troca de responsável | `funcionario.findUnique({ id })` | **A** |
| snapshot | `historicoOrdemServico.create` | **A** |
| OCC | `ordemServico.updateMany({ id, versao })` | **A** |
| releitura | `ordemServico.findUniqueOrThrow({ id })` | **A** |
| detecção pós-conflito | `ordemServico.findUnique({ id, select: versao })` | **A** |

O helper `getVisibilityWhere` atualmente retorna `{}` para Administrador e, para Funcionário, “própria ou `PUBLICA`”. O predicate de Environment precisa ser obrigatório e combinado por `AND`, nunca substituído por essa policy de visibilidade.

Não há `delete` de OS.

### Dashboard

Arquivo: `backend/src/dashboard/dashboard.service.ts`

Todas as operações são **A**:

- transações `RepeatableRead`;
- `cliente.count` ativo/total;
- `funcionario.count` ativo/total;
- `funcionario.findUnique({ id })`;
- `ordemServico.count`;
- `ordemServico.aggregate` com count/sum/avg;
- contagem de novos Clientes e Funcionários;
- SQL raw de clientes distintos/recorrentes;
- métricas globais de Administrador e por responsável.

O SQL de recorrência consulta `candidate` e `prior` globalmente. Ambos os aliases deverão carregar o mesmo `environment_id`; filtrar apenas `candidate` não é suficiente para uma query robusta.

### Perfil próprio

Arquivo: `backend/src/profile/profile.service.ts`

| Método | Consulta | Classe |
|---|---|---|
| `getProfile` | `funcionario.findUniqueOrThrow({ id })` | **A** |
| `updateProfile` | `funcionario.update({ id })` | **A** |
| `changePassword` | `usuario.findUnique({ id })`, `usuario.update({ id })` | **A** |
| revogação | exclusão de sessões do próprio usuário | **C**, acionada por A |

Os IDs vêm do `authenticatedUser`, não da URL nem do body. Esse desenho já é correto.

### Bootstrap do primeiro Administrador

Arquivo: `backend/src/bootstrap/admin-bootstrap.service.ts`

| Operação | Classe |
|---|---|
| advisory lock PostgreSQL global | **C/D** |
| `usuario.count()` global | **D** |
| `funcionario.create` | **D** |
| `usuario.create` | **D** |

O comando atualmente significa “primeiro usuário do banco”. Futuramente deve signific claramente “Administrador inicial do Environment PRINCIPAL”, ou ser aposentado em favor de provisionamento explícito.

### Sessões

Arquivo: `backend/src/auth/session/session-store.service.ts`

- `connect-pg-simple` executa internamente criação/leitura/atualização/expiração de sessões: **C**.
- `revokeUserSessions` executa SQL raw `DELETE FROM session WHERE sess->>'usuarioId' = $1`: **C**.
- `EmployeesService.updateAdministrative` usa Prisma `session.deleteMany` pelo path JSON: **C**.

### Operações inexistentes no runtime

Não foram encontrados no código de produção:

- `createMany`;
- `upsert`;
- `groupBy`;
- `deleteMany` de dados de negócio;
- raw writes de domínio;
- repositories;
- query builders externos;
- jobs, cron ou filas;
- seeds de domínio;
- exclusão de Funcionário, Usuário ou OS.

Os `deleteMany`, creates e consultas adicionais encontrados nos specs são infraestrutura de fixture/assertion e precisarão receber Environment nos helpers de teste.

## 5. Mapa de autenticação e sessão

### Conteúdo atual de `sess`

O tipo da sessão permite apenas:

```ts
usuarioId?: string;
csrfToken?: string;
```

O JSON também contém `cookie`, inserido pelo `express-session`.

Estados observados:

- sessão anônima após `GET /auth/csrf`: `cookie + csrfToken`;
- após login e regeneração: `cookie + usuarioId`;
- o principal completo não é persistido;
- `GET /auth/session` recarrega o usuário do PostgreSQL.

### Fluxos auditados

- **Login:** normaliza e-mail, busca `Usuario` globalmente, verifica conta e senha, regenera a sessão e salva `usuarioId`.
- **GET `/auth/session`:** `SessionGuard` recarrega conta, perfil, funcionário e primeiro acesso.
- **Logout:** destrói a sessão; não usa `SessionGuard`, mas continua protegido por CSRF global.
- **First access:** usa ID do principal, atualiza senha, regenera sessão e persiste novamente `usuarioId`.
- **Perfil próprio:** usa `funcionarioId`/`id` do principal.
- **Reset administrativo:** localiza a conta pelo Funcionário alvo, atualiza a senha e revoga suas sessões.
- **Mudança de perfil/e-mail/status:** revoga as sessões quando a mudança altera a autorização.
- **Inativação de Funcionário:** desativa a conta e revoga as sessões.

### Ponto seguro para estabelecer Environment

O ponto correto é o `SessionGuard`, ao reconstruir o usuário:

```text
sess.usuarioId
→ Usuario
→ Environment autorizado
→ valida conta/Environment/expiração
→ request.authenticatedUser.environmentId
```

O `environmentId` deve ser anexado ao principal server-side e passado aos services. Não deve ser aceito em body, query ou header como fonte de autorização.

Recomenda-se também verificar no mesmo limite de autenticação:

- conta ativa;
- vínculo íntegro Usuario–Funcionário–Environment;
- Environment ativo;
- `expiresAt > now()` para demos.

Assim, a expiração é aplicada mesmo se o job de limpeza estiver atrasado.

### Duração da demo versus duração da sessão

A sessão atual possui:

- `rolling: false`;
- `disableTouch: true`;
- duração padrão de 8 horas.

Portanto ela já não renova por atividade. Isso não substitui a expiração da demo:

- uma sessão pode expirar antes das 24 horas e o usuário fazer login novamente;
- ao completar 24 horas, todo login e toda request autenticada devem ser recusados pelo estado fixo do Environment;
- `expiresAt` não pode ser recalculado por atividade.

### Session com coluna relacional versus payload

| Alternativa | Vantagens | Riscos/impacto |
|---|---|---|
| Apenas `usuarioId` no payload; Environment derivado a cada request | Sem duplicidade; impossível confiar acidentalmente em ambiente obsoleto; compatível com o store atual | Limpeza exige localizar os usuários do Environment antes de apagá-los; revogação usa JSON sem índice |
| Adicionar `environmentId` ao payload | Limpeza por JSON mais simples; baixo impacto no store | Campo denormalizado pode divergir; jamais pode ser autoridade; todos os fluxos de regeneração devem preenchê-lo |
| Coluna/FK `Session.environmentId` | Índice e integridade; cascade/revogação eficientes | `connect-pg-simple` não preenche colunas extras; exige store customizado, trigger/generated column ou escrita dupla; cria risco de duas fontes de verdade |

**Recomendação para o código atual:** manter `usuarioId` como única identidade autoritativa e derivar Environment pelo usuário no `SessionGuard`. Uma coluna relacional não é necessária para o primeiro marco de isolamento. Na limpeza da demo, remova as sessões antes dos usuários usando os IDs do Environment. Se o volume tornar a consulta JSON problemática, adicionar coluna/index deve ser uma evolução operacional separada.

## 6. Guards e fronteira de isolamento

| Componente | Deve conhecer Environment? | Motivo |
|---|---|---|
| `SessionGuard` | **Sim** | Deve construir o contexto confiável e rejeitar Environment expirado/inativo |
| `FirstAccessCompletedGuard` | Não | Continua verificando apenas o principal já autenticado |
| `RoleGuard` | Não | Perfil e tenant são dimensões independentes; deve continuar sem banco |
| `CsrfGuard` | Não | Protege origem/mutação, não propriedade de dados |
| `HttpExceptionFilter` | Não para autorização | Pode receber Environment como correlação de log, mas não decidir acesso |
| middleware de sessão | Não | Apenas restaura o payload assinado |
| CORS/trust proxy | Não | Infraestrutura HTTP |

Não é recomendável incorporar regras de Environment no `RoleGuard`. “Administrador” deve significar Administrador dentro do Environment já resolvido, e o isolamento deve existir nas queries.

## 7. Vazamentos potenciais por UUID

Se demos fossem habilitadas sem reescrever as queries, estes seriam os ataques principais:

| Endpoint/fluxo | Efeito cross-environment |
|---|---|
| `GET /clients/:id` | Ler Cliente de outro ambiente |
| `PUT /clients/:id` | Editar Cliente externo |
| `PATCH /clients/:id/status` | Ativar/inativar Cliente externo |
| `DELETE /clients/:id` | Excluir Cliente externo ou descobrir que possui OS |
| `GET /employees/:id` | Ler Funcionário e dados da conta |
| `PUT /employees/:id` | Editar cadastro externo |
| `PUT /employees/:id/administrative` | Alterar cadastro, conta, perfil, status e e-mail externos |
| `PATCH /employees/:id/status` | Inativar Funcionário e conta externos |
| `POST /employees/:id/account` | Criar acesso para Funcionário externo |
| `PATCH .../account/status` | Ativar/inativar conta externa |
| `PATCH .../account/profile` | Promover/rebaixar conta externa |
| `PATCH .../account/login-email` | Alterar login e revogar sessões externas |
| `PATCH .../account/password` | Resetar senha e revogar sessões externas |
| Dashboard com `employeeId` | Ler métricas e confirmar existência de Funcionário externo |
| `POST /orders` com `clienteId` | Associar Cliente de outro Environment |
| `POST /orders` com `responsavelId` | Associar Funcionário de outro Environment |
| `PUT /orders/:id` | Administrador editar OS de outro Environment |
| troca de `responsavelId` | Associar responsável externo |
| `GET /orders/:id` | Administrador ler qualquer OS; Funcionário ler OS `PUBLICA` externa |
| `GET /orders/:id/history` | Ler snapshots, responsável e autor externos |
| `/orders?responsibleId=` | Consultar dados/OS por UUID externo |
| `/orders/responsibles` | Descobrir nomes e UUIDs de responsáveis externos |
| OCC `hasPersistedVersionChanged` | Consulta global residual por ID após conflito |
| reset/revogação de sessão | Uma seleção cross-tenant anterior permite revogar sessões da conta externa |

Para recursos inacessíveis, a resposta deve ser indistinguível de recurso inexistente, seguindo o bom padrão atual das OS privadas.

## 8. Relações e integridade cross-environment

### Usuario → Funcionario

A relação é 1:1 e hoje validada apenas pela FK global. A criação de conta recebe um `employeeId` e o busca globalmente.

No modelo futuro:

- ambos devem pertencer ao mesmo Environment;
- a relação deve ser protegida por FK composta, não apenas por validação do service;
- o Environment do usuário não deve poder divergir do Funcionário.

### OrdemServico → Cliente

A criação usa SQL `FOR UPDATE` somente por `cliente.id`. Deve usar:

```sql
WHERE id = :clienteId
  AND environment_id = :authenticatedEnvironmentId
FOR UPDATE
```

Além disso, a FK deve impedir fisicamente `OS A → Cliente B`.

### OrdemServico → Funcionario responsável

Existem dois caminhos:

- criação, com SQL raw `FOR UPDATE`;
- atualização, com `funcionario.findUnique({ id })`.

Ambos precisam de Environment. A FK da OS também deve ser composta para impedir inconsistência mesmo diante de bug aplicativo.

### Historico → OrdemServico / Funcionario / Usuario

Na criação do snapshot são gravados:

- `ordemServicoId` da OS carregada;
- `responsavelId` do estado anterior;
- `alteradoPorUsuarioId` do principal autenticado.

Hoje isso é assumido, não garantido. Um Administrador do Environment A editando por engano uma OS B produziria um histórico misto.

### Recomendação de constraints

Para cada relação sensível, usar `environmentId` nos dois lados e FKs compostas, com índices/uniques auxiliares como:

```text
Usuario(environmentId, funcionarioId)
→ Funcionario(environmentId, id)

OrdemServico(environmentId, clienteId)
→ Cliente(environmentId, id)

OrdemServico(environmentId, responsavelId)
→ Funcionario(environmentId, id)

Historico(environmentId, ordemServicoId)
→ OrdemServico(environmentId, id)

Historico(environmentId, responsavelId)
→ Funcionario(environmentId, id)

Historico(environmentId, alteradoPorUsuarioId)
→ Usuario(environmentId, id)
```

Filtros de aplicação continuam necessários; constraints não substituem autorização, mas impedem corrupção cross-tenant.

## 9. Alterações futuras por módulo

### Auth

- incluir Environment na consulta de login e de sessão;
- recusar login para Environment expirado/inativo usando a mesma resposta genérica de credenciais;
- acrescentar `environmentId` ao principal server-side;
- manter login global por e-mail;
- escopar first access pelo contexto autenticado ou usar ID próprio confiável com verificação de Environment;
- não aceitar Environment no login enquanto o e-mail continuar globalmente único.

### Clients

- todos os métodos recebem o Environment confiável;
- todo `where` inclui `environmentId`;
- `create` grava o Environment;
- documento passa a ser único dentro do Environment;
- limite de 30 Clientes precisa ser transacional, não um `count` sem lock;
- mensagens/OpenAPI devem dizer “já existe neste ambiente”.

### Employees

- criação e listagem escopadas;
- todas as mutações por ID precisam de `environmentId`;
- criação de acesso deve herdar o Environment do Funcionário;
- último Administrador por Environment;
- busca de OS ativas por Environment;
- sessões só são revogadas depois de o alvo ser localizado dentro do Environment;
- limite de dez Funcionários precisa de proteção concorrente.

### Orders

- incluir Environment no predicate base de `getVisibilityWhere`;
- raw locks por `(environmentId, id)`;
- contador por Environment;
- número composto por Environment;
- criação e update gravam/validam Environment;
- troca de responsável escopada;
- snapshots herdam Environment;
- OCC inclui Environment no `updateMany`;
- `hasPersistedVersionChanged` precisa ser escopado;
- limite de 50 OS precisa ser concorrente e por Environment.

### Dashboard

- todas as contagens, aggregates e buscas recebem `environmentId`;
- “global” passa a significar “global dentro do Environment”;
- SQL raw filtra tanto `candidate` quanto `prior`;
- `employeeId` administrativo só é válido dentro do Environment.

### Profile

- preservar IDs vindos exclusivamente do principal;
- adicionar Environment aos `where` como defesa em profundidade;
- nenhuma alteração de contrato HTTP é necessária.

### Bootstrap

- criar ou localizar explicitamente o PRINCIPAL;
- contar usuários somente no PRINCIPAL, ou declarar o comando como one-shot global de criação do PRINCIPAL;
- lock deve proteger essa operação específica;
- demos precisam de fluxo próprio de provisionamento, não reutilização ambígua do bootstrap global.

## 10. `emailLogin`

Dependências atuais:

- `Usuario.emailLogin @unique`;
- `AuthService.authenticate` usa `findUnique`;
- criação de acesso;
- edição administrativa;
- alteração de e-mail;
- bootstrap;
- tratamento de P2002;
- testes de duplicidade e concorrência;
- normalização `trim().toLowerCase()` nos schemas de Funcionários e bootstrap;
- normalização equivalente no login.

Manter a unicidade global:

- simplifica `email + senha → Usuario → Environment`;
- elimina escolha de tenant no frontend;
- evita enumeração/seleção livre de Environment;
- não conflita com nenhum fluxo existente;
- facilita credenciais geradas automaticamente.

Cuidados:

- geração de credenciais de demo deve tratar P2002 e tentar outro valor;
- a constraint PostgreSQL atual é sensível a caixa; a garantia prática de case-insensitive depende de todos os writers usarem os schemas de normalização;
- handlers de P2002 devem conferir o target da constraint à medida que novas unicidades forem adicionadas, em vez de assumir que todo P2002 é e-mail.

Conclusão: manter `emailLogin` globalmente único é a opção mais compatível com a arquitetura atual.

## 11. `Cliente.documento`

A validação atual:

- remove tudo que não é dígito;
- transforma vazio em `null`;
- valida CPF/CNPJ;
- não faz precheck;
- depende da constraint do banco;
- converte P2002 em `CLIENT_DOCUMENT_ALREADY_EXISTS`.

Mudanças futuras:

- trocar `@unique` por `@@unique([environmentId, documento])`;
- gravar `environmentId` no create;
- escopar busca/lista/edição;
- manter o tratamento via constraint, agora para a composta;
- ajustar textos de erro/OpenAPI;
- preservar testes de múltiplos `null`.

No PostgreSQL, múltiplas linhas com `documento = NULL` continuam permitidas em uma unique composta normal. Isso atende ao comportamento atual.

Testes novos essenciais:

- documento X permitido em A e B;
- documento X duplicado dentro de A bloqueado;
- `null` repetido dentro de A e entre ambientes;
- update de A não conflita com documento igual em B;
- P2002 de outra constraint não vira incorretamente erro de documento.

## 12. Número e contador de OS

### Funcionamento atual

Na criação transacional:

1. trava Cliente;
2. trava responsável;
3. incrementa atomicamente o contador `id = 1`;
4. formata `OS-000001`;
5. cria a OS;
6. tudo ocorre em transação `Serializable`, com até 25 tentativas.

A proteção atual combina:

- row lock do update do contador;
- transação serializável;
- unique global de `numero`;
- rollback do incremento se a criação falhar.

O teste concorrente cria 12 OS e exige sequência contígua e índice unique.

### Modelo futuro recomendado

- `ContadorOrdemServico` com uma linha por Environment;
- Environment como PK/unique do contador;
- remover a constraint física `id = 1`;
- inicializar contador `0` na criação do Environment;
- atualizar atomicamente a linha do Environment;
- `OrdemServico @@unique([environmentId, numero])`;
- manter a transação e os retries;
- incluir Environment nos locks de Cliente/Funcionário e no create.

Cada Environment serializa apenas suas próprias criações; A e B podem gerar `OS-000001` simultaneamente.

### Migration do contador existente

Não recalcular simplesmente pelo `MAX(numero)` se o contador atual já estiver à frente por exclusões antigas. A linha atual deve ser transformada/migrada para o PRINCIPAL preservando `ultimoNumero`.

### Testes necessários

- mesma sequência permitida em A e B;
- concorrência contígua dentro de A;
- concorrência simultânea A/B sem bloqueio lógico entre contadores;
- falha após incremento faz rollback;
- Cliente/Funcionário cross-environment não consome número;
- contador ausente falha de modo controlado;
- unique composta existe e a global não permanece.

## 13. Regra do último Administrador

A implementação está centralizada em `ensureAnotherActiveAdministrator`:

```ts
usuario.count({
  where: {
    perfil: ADMINISTRADOR,
    ativo: true,
  },
});
```

É chamada em:

- inativação de Funcionário com conta Administrador ativa;
- inativação da conta;
- mudança de perfil Administrador → Funcionário;
- update administrativo, por meio das mesmas transições;
- self-downgrade/self-suspension/self-deactivation.

A transação serializável e os retries já protegem contra duas desativações concorrentes.

Mudanças:

- receber `environmentId`;
- contar apenas `Usuario` do mesmo Environment;
- localizar o alvo dentro desse Environment antes da contagem;
- manter serialização/retry;
- idealmente confirmar também a integridade com o Funcionário ativo, embora os fluxos atuais mantenham conta e funcionário coerentes.

Não basta adicionar o filtro na contagem: todas as leituras e updates que precedem a contagem também precisam ser escopadas.

## 14. Histórico de OS

### Alternativa 1: depender apenas de OrdemServico

Vantagens:

- menos coluna duplicada;
- Environment pode ser obtido por join.

Riscos:

- não impede responsável ou autor de outro Environment;
- queries de limpeza e auditoria exigem join;
- uma query direta de histórico pode esquecer o join;
- dificulta futura RLS e índices;
- demo expirada fica mais difícil de limpar diretamente.

### Alternativa 2: `environmentId` direto no histórico

Vantagens:

- queries e limpeza simples;
- suporte a índice/RLS;
- snapshots permanecem inequivocamente atribuídos;
- permite FKs compostas para OS, responsável e autor;
- impede fisicamente relações cruzadas.

Risco:

- duplicação do Environment derivável da OS;
- exige constraints compostas para evitar divergência.

**Recomendação:** adicionar `environmentId` diretamente e protegê-lo por FKs compostas. A duplicação é justificável porque o histórico possui três relações tenant-sensitive e é dado de auditoria.

## 15. Exclusão de demo

### Comportamento atual dos `onDelete`

Todas as relações de domínio são `Restrict`:

- Usuário → Funcionário;
- OS → Cliente;
- OS → responsável;
- Histórico → OS;
- Histórico → responsável;
- Histórico → autor.

Portanto:

- Usuário impede exclusão do Funcionário;
- OS impede exclusão de Cliente/Funcionário;
- Histórico impede exclusão de OS/Funcionário/Usuário.

`Session` não tem FK.

### Onde Cascade pode ser apropriado

- Environment → contador: seguro;
- OS → histórico: potencialmente apropriado, pois o snapshot pertence à OS;
- Environment → sessões, se houver relação operacional confiável;
- Environment → dados de demo somente se houver fortes proteções contra exclusão do PRINCIPAL e constraints cross-environment.

### Onde Cascade é perigoso

- Cliente → OS;
- Funcionário → OS;
- Funcionário/Usuário → histórico;
- qualquer cascade condicionalmente desejado apenas para Demo, pois FK não distingue PRINCIPAL;
- cascade amplo do Environment sem proteção operacional, por risco de exclusão catastrófica do PRINCIPAL.

### Recomendação

Preferir um serviço explícito de limpeza transacional no primeiro marco, mantendo relações de negócio restritivas. Ordem possível:

1. marcar Environment como expirado/em limpeza e bloquear novas requests;
2. excluir sessões dos usuários do Environment;
3. excluir `HistoricoOrdemServico`;
4. excluir `OrdemServico`;
5. excluir `Usuario`;
6. excluir `Funcionario`;
7. excluir `Cliente`;
8. excluir `ContadorOrdemServico`;
9. excluir `Environment`.

Com os limites previstos, o volume máximo por demo é pequeno e uma transação explícita é viável. O processo deve ser idempotente e protegido por lock/status para impedir duas limpezas concorrentes.

A expiração de acesso não pode depender da conclusão da limpeza: o guard deve negar o Environment após `expiresAt`.

## 16. Estratégia futura de migration

Uma estratégia segura para dados existentes:

1. Criar `Environment` e um registro PRINCIPAL com identificador estável.
2. Adicionar `environmentId` nullable aos modelos selecionados.
3. Criar índices não únicos para o backfill e queries futuras.
4. Associar Clientes e Funcionários existentes ao PRINCIPAL.
5. Backfill de Usuários, preferencialmente conferindo o Environment do Funcionário.
6. Backfill das OS, validando que Cliente e responsável estão no PRINCIPAL.
7. Backfill do histórico, validando OS, responsável e autor.
8. Transformar o contador singleton no contador do PRINCIPAL, preservando `ultimoNumero`.
9. Executar verificações de integridade e contagens antes de endurecer constraints.
10. Criar FKs simples/compostas e validá-las.
11. Criar as uniques compostas de documento e número.
12. Remover as uniques globais antigas somente depois de o código estar compatível.
13. Tornar `environmentId` `NOT NULL`.
14. Ativar o principal server-side e queries escopadas.
15. Só então habilitar provisionamento de demos.

### Riscos

- `ALTER ... SET NOT NULL` pode bloquear tabela; pode-se validar previamente uma check constraint.
- `CREATE UNIQUE INDEX CONCURRENTLY` não pode ser executado dentro de uma transação comum de migration.
- schema Prisma e constraints compostas precisam permanecer sincronizados.
- deploy de código e migration incompatíveis pode criar uma janela em que registros novos ficam sem Environment.
- sessões existentes não têm Environment.

### Sessões durante a migration

Como o payload já contém `usuarioId`, sessões existentes podem continuar funcionando se o `SessionGuard` derivar Environment pela relação já backfilled. Não é obrigatório invalidá-las.

Ainda assim, um logout global durante o cutover é a opção operacional mais simples caso:

- a migration altere o formato do principal;
- existam usuários inconsistentes;
- seja adotada coluna obrigatória na sessão;
- não se queira manter código temporário de compatibilidade.

### Downtime

É possível minimizar downtime com deploys compatíveis:

1. schema nullable;
2. backfill;
3. código que lê e aplica Environment;
4. constraints finais.

Uma janela de manutenção curta ainda é recomendável para a troca das uniques e endurecimento final, dependendo do volume real e da política de deploy.

## 17. Testes existentes afetados

| Família | Arquivos/impacto |
|---|---|
| Autenticação | `backend/src/auth/auth.controller.spec.ts`: fixtures precisam de Environment; login global, sessão, first access e expiração precisam ser revalidados |
| Sessões | `session-store.service.spec.ts`, `session.middleware.spec.ts`: pouco impacto se o payload continuar só com `usuarioId`; maior impacto se houver coluna/payload de Environment |
| Guards | `session.guard.spec.ts` precisa validar Environment ativo/expirado; Role, FirstAccess e CSRF devem continuar independentes |
| Clientes | `backend/src/clients/clients.controller.spec.ts`: todos os helpers e casos de documento/lista/detalhe/mutação |
| Funcionários | `backend/src/employees/employees.controller.spec.ts`: todos os fluxos de conta, sessões, último Admin e concorrência |
| OS | `backend/src/orders/orders.controller.spec.ts`: criação, raw locks, visibilidade, filtros, OCC, responsável e contador |
| Histórico | Mesma suíte de Ordens: autorização atual, snapshots, autor/responsável e cleanup |
| Contador | Mesma suíte de Ordens: setup/restore atualmente pressupõe `id = 1` |
| Dashboard | `backend/src/dashboard/dashboard.controller.spec.ts`: todo resultado hoje descrito como “global” passa a ser por Environment |
| Perfil | `backend/src/profile/profile.controller.spec.ts`: preservar alvo próprio e adicionar fixtures multiambiente |
| Bootstrap | `admin-bootstrap.service.spec.ts`: deve passar a provar bootstrap do PRINCIPAL |
| Banco/e2e | helpers de fixture, cleanup e migrations precisam criar/usar Environment |

Não existem suites separadas para histórico ou contador; ambas estão concentradas em `orders.controller.spec.ts`.

## 18. Novos testes de isolamento necessários

### Ataques obrigatórios

- A não lê Cliente de B;
- A não edita Cliente de B;
- A não inativa Cliente de B;
- A não exclui Cliente de B;
- A não associa Cliente de B a OS de A;
- A não associa Funcionário de B na criação de OS;
- A não transfere OS para Funcionário de B;
- Administrador A não lê/edita OS de B;
- Funcionário A não lê OS `PUBLICA` de B;
- A não acessa histórico de B;
- snapshots não aceitam responsável ou autor de outro Environment;
- Administrador A não reseta senha de B;
- A não altera perfil, status ou e-mail de login de B;
- A não revoga sessões de B por meio de alvo externo;
- Dashboard A não conta nem consulta funcionário de B;
- autocomplete de responsáveis A não revela B.

Todos os acessos negados por ID devem ser indistinguíveis de UUID inexistente.

### Unicidade e contador

- mesmo documento permitido em A/B;
- documento duplicado bloqueado dentro de A;
- `null` múltiplo;
- mesmo e-mail de login bloqueado globalmente entre A/B;
- número `OS-000001` permitido em A/B;
- sequência concorrente independente;
- contador A não altera B.

### Regra do Administrador

- único Admin de A não pode ser inativado mesmo se B tiver vários;
- Admin de A pode ser inativado se A tiver outro;
- concorrência de duas despromoções dentro de A preserva um Admin;
- transições simultâneas em A e B não interferem.

### Sessão e expiração

- payload com `environmentId` adulterado, se existir, não altera o ambiente autorizado;
- sessão de usuário A sempre produz contexto A;
- Environment expirado invalida request e login;
- atividade não estende `expiresAt`;
- sessão antiga após exclusão do usuário é destruída;
- logout/login em outro dispositivo permanece dentro da mesma demo.

### Limpeza

- limpar Demo A não remove nem altera B ou PRINCIPAL;
- sessões de A são removidas;
- cleanup repetido é idempotente;
- Environment em limpeza não aceita novas gravações.

### Limites

- 30 Clientes, 10 Funcionários e 50 OS por Environment;
- limites independentes entre A/B;
- duas criações concorrentes no limite não ultrapassam a capacidade.

## 19. Pontos fáceis de esquecer

- `getVisibilityWhere` precisa sempre combinar Environment com a visibilidade.
- `orderListSelect`, `orderDetailSelect`, `orderHistorySelect`, `employee*Select` e `profileSelect` são reutilizados, mas selects não substituem predicates.
- `/orders/responsibles` funciona como autocomplete e pode revelar nomes/UUIDs.
- filtros `responsibleId` e `employeeId` são IDs enviados pelo cliente e precisam ser contextualizados.
- `hasPersistedVersionChanged` é uma query secundária fora da transação principal e também precisa de escopo.
- SQL raw de Cliente/Funcionário e Dashboard não recebe scoping automaticamente do Prisma.
- tratamento genérico de P2002 pode mapear a constraint errada após novas uniques.
- fixtures de teste hoje criam relações sem Environment e precisam de helpers centrais.
- cleanup dos specs pressupõe IDs globais e contador singleton.
- a migration inicial usa todas as FKs como `Restrict`.
- o bootstrap registra o e-mail do Administrador no log; um futuro provisionador de demo não deve registrar senha/credenciais completas.
- o filtro global registra mensagem/stack de exceções inesperadas; erros Prisma podem conter IDs/metadados. Logs devem ser protegidos e, futuramente, correlacionados por Environment sem registrar payloads privados.
- não há job de expiração; será preciso adicionar um, mas autorização não deve depender dele.
- não há limite por IP ou capacidade global atualmente.
- não há Prisma Studio configurado em script nem seed de aplicação.
- o limite de entidades não pode usar somente `count()` fora de transação, devido a concorrência.

## 20. Pontos que exigem decisão arquitetural

1. **Enforcement no banco:** aplicação + FKs compostas, ou também PostgreSQL RLS. A recomendação mínima é predicates explícitos e FKs compostas; RLS muda significativamente conexão, transações e testes.
2. **Histórico:** Environment direto ou apenas derivado da OS. Recomendo direto.
3. **Sessões:** manter apenas `usuarioId`, acrescentar Environment no JSON ou criar coluna/FK. Recomendo derivar pelo usuário e não usar Session como fonte de autorização.
4. **Proteção do PRINCIPAL:** regra operacional/DB que impeça sua expiração e exclusão.
5. **Política de limpeza:** serviço explícito transacional versus cascade amplo. Recomendo limpeza explícita.
6. **Semântica dos limites:** se contam todos os registros existentes, apenas ativos ou total histórico. Isso precisa estar definido antes do provisionamento de demos.
7. **Bootstrap:** adaptar o comando atual para o PRINCIPAL ou substituí-lo por provisionamento unificado.
8. **Sessões no cutover:** preservar via `usuarioId` ou forçar logout global por simplicidade operacional.

## 21. Ordem recomendada de implementação futura

1. Fechar as decisões bloqueadoras abaixo.
2. Modelar `Environment`, relações compostas e índices.
3. Criar PRINCIPAL e fazer backfill sem habilitar demos.
4. Transformar o contador singleton em contador do PRINCIPAL.
5. Fazer o `SessionGuard` derivar e validar Environment.
6. Propagar o contexto confiável aos services.
7. Escopar Auth pós-login, Clientes, Funcionários, Perfil, Ordens, Histórico e Dashboard.
8. Corrigir todos os SQL raw.
9. Adicionar constraints compostas e uniques por Environment.
10. Adaptar bootstrap e fixtures de teste.
11. Implementar a suíte cross-environment completa.
12. Validar que todas as queries runtime estão classificadas.
13. Só então criar provisionamento de demo, credenciais e limites.
14. Implementar expiração/cleanup.
15. Por último, limites por IP e capacidade global.

A regra operacional deve ser: **nenhuma Demo pode ser criada enquanto houver um único endpoint de negócio não escopado**.

## Bloqueadores antes de implementar

- Decidir se o isolamento será application-level + constraints compostas ou também usará PostgreSQL RLS.
- Decidir se `HistoricoOrdemServico` terá `environmentId` direto.
- Decidir a estratégia de Session: somente `usuarioId`, payload denormalizado ou coluna/FK.
- Definir proteção e impossibilidade de expiração/exclusão do Environment PRINCIPAL.
- Definir a política de exclusão: limpeza explícita ou cascade.
- Definir se o deploy de migration preservará sessões existentes ou forçará logout global.
- Definir o que conta para os limites de 30/10/50, antes de habilitar demos.

## O que NÃO precisa mudar

- `emailLogin` pode permanecer globalmente único.
- O frontend não precisa enviar `environmentId` nos endpoints existentes.
- `GET/PUT /profile` deve continuar sem ID escolhido pelo cliente.
- `RoleGuard` não precisa virar um guard de tenant.
- `FirstAccessCompletedGuard` e `CsrfGuard` podem permanecer independentes.
- Argon2, política de senhas e normalização de e-mail podem ser preservados.
- Validação de CPF/CNPJ e normalização de documento podem ser preservadas.
- Integração ViaCEP não precisa de escopo de dados.
- OCC por `versao`, snapshots e retries serializáveis podem continuar.
- A regra de visibilidade `PRIVADA/PUBLICA` pode continuar, desde que aplicada depois do filtro obrigatório de Environment.
- DTOs existentes não precisam expor `environmentId` para autorizar operações.
- Não é necessário introduzir uma camada repository completa; predicates e helpers tenant-aware pequenos são suficientes.
- CORS, trust proxy, OpenAPI, filtro HTTP e endpoint raiz não precisam participar do isolamento.
