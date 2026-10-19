# Mapa da Estrutura Frontend

Este documento organiza os arquivos autorais relevantes dos frontends por famílias funcionais e estruturais. `apps/site/frontend/` contém somente o portfólio público; `apps/sistema-os/frontend/` contém somente o Sistema OS e sua DEMO. Cada pacote mantém instalação e configuração próprias.

Dentro de cada família, os arquivos seguem a ordem de criação. Quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

Destina-se a pessoas e agentes que precisam localizar responsabilidades no frontend sem depender do histórico da implementação.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

O mapa contém somente os arquivos atuais em `apps/`, sem imports entre frontends. O código antigo da raiz foi removido após conferir seus correspondentes; seu histórico está no commit `4e1db94`.

## Visão rápida

| Área                    | Responsabilidade                                                                  | Arquivos |
| ----------------------- | --------------------------------------------------------------------------------- | -------: |
| Configuração e entrada  | Metadados, inicialização, rotas, providers, build e publicação do frontend        | 14 |
| Infraestrutura HTTP     | Cliente Axios local ao Sistema OS, ambiente e CSRF em memória                           | 1 |
| Infraestrutura de dados | QueryClient local ao Sistema OS para cache e coordenação de server state                | 1 |
| Estilos e tema          | Estilos globais e tokens visuais                                                  | 2 |
| Componentes UI          | Elementos reutilizáveis da interface                                              | 7 |
| Componentes de feedback | Comunicação de estados, confirmações e proteção de alterações pendentes           | 8 |
| Layouts                 | Estruturas compartilhadas de páginas                                              | 4 |
| Área pública            | Portfólio profissional e apresentação pública dos projetos                        | 2 |
| Ambiente DEMO           | Geração pública de credenciais temporárias e continuação explícita para o login   | 3 |
| Autenticação            | Sessão real, login, primeiro acesso, contrato HTTP, validação e proteção de rotas | 12 |
| Dashboard               | Visões reais administrativa e individual, cache, períodos e métricas              | 7 |
| Ordens de Serviço       | Listagem, detalhe, criação, edição, histórico, validação e integrações reais      | 10 |
| Clientes                | Listagem, cadastro e edição reais, com arquivo legado de mock sem consumidor      | 8 |
| Funcionários            | Listagem real, perfil, formulários validados, situação e gestão de acesso         | 12 |
| Meu perfil              | Autoatendimento de dados pessoais e senha para qualquer usuário autenticado       | 5 |
| Navegação entre aplicações | Links externos configuráveis entre portfólio e Sistema OS | 2 |

Total: **98 arquivos relevantes**, contados uma vez por pacote e família.

## Sumário

- [Configuração e entrada](#configuração-e-entrada)
- [Infraestrutura HTTP](#infraestrutura-http)
- [Infraestrutura de dados](#infraestrutura-de-dados)
- [Estilos e tema](#estilos-e-tema)
- [Componentes UI](#componentes-ui)
- [Componentes de feedback](#componentes-de-feedback)
- [Layouts](#layouts)
- [Área pública](#área-pública)
- [Ambiente DEMO](#ambiente-demo)
- [Autenticação](#autenticação)
- [Dashboard](#dashboard)
- [Ordens de Serviço](#ordens-de-serviço)
- [Clientes](#clientes)
- [Funcionários](#funcionários)
- [Meu perfil](#meu-perfil)
- [Navegação entre aplicações](#navegação-entre-aplicações)

---

## Configuração e entrada

Inicializa a aplicação, declara suas rotas e configura o ambiente de desenvolvimento e build.

Diretórios: `apps/site/frontend/`, `apps/site/frontend/src/`, `apps/sistema-os/frontend/`, `apps/sistema-os/frontend/src/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/site/frontend/README.md` | Execução do portfólio público, links configuráveis para o OS e build sem API. |
| 2 | `apps/site/frontend/index.html` | Documento público, metadados e favicon preservados. |
| 3 | `apps/site/frontend/src/main.tsx` | Monta React, BrowserRouter, fonte e CSS, sem providers de sessão, Query ou notificações. |
| 4 | `apps/site/frontend/src/App.tsx` | Home e estudo de caso; rotas desconhecidas retornam a / com replace no histórico, sem página de erro ou acesso ao login OS. |
| 5 | `apps/site/frontend/vite.config.ts` | Plugins React e Tailwind e build independente do site. |
| 6 | `apps/site/frontend/wrangler.jsonc` | Static Assets locais e fallback SPA com a identidade portfolio-site. |
| 7 | `apps/sistema-os/frontend/README.md` | Execução do Sistema OS, variáveis da API/portfólio e validações locais. |
| 8 | `apps/sistema-os/frontend/index.html` | Documento e metadados do Sistema OS, com favicon preservado. |
| 9 | `apps/sistema-os/frontend/src/main.tsx` | Carrega fonte/CSS e monta App com providers de Query, sessão, notificações e Router. |
| 10 | `apps/sistema-os/frontend/src/App.tsx` | Login único com painel DEMO, primeiro acesso e áreas internas; raiz e fallback geral passam pelo login, sem rota /demo. |
| 11 | `apps/sistema-os/frontend/vite.config.ts` | Configura desenvolvimento e build com os plugins de React e Tailwind CSS. |
| 12 | `apps/sistema-os/frontend/wrangler.jsonc` | Publica o dist local como Static Assets do Worker portfolio-sistema-os, com fallback de SPA. |
| 13 | `apps/site/frontend/.env.production.example` | URL pública do OS para o build de produção do site, sem carga automática pelo Vite ou segredo. |
| 14 | `apps/sistema-os/frontend/.env.production.example` | URLs públicas os-api e portfólio para o build de produção do OS, sem alterar ambiente local ou sessão. |

---

## Infraestrutura HTTP

Centraliza o transporte HTTP, a configuração de ambiente da API e a proteção CSRF reutilizável.

Diretórios: `apps/sistema-os/frontend/src/shared/lib/http/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/shared/lib/http/apiClient.ts` | Cria Axios com VITE_API_URL e credenciais; anexa CSRF às mutações, recupera token obsoleto uma vez e trata perda de sessão. |

---

## Infraestrutura de dados

Disponibiliza a instância compartilhada de TanStack Query para o server state real; o `AuthSessionProvider` descarta integralmente esse cache nas fronteiras de identidade.

Diretórios: `apps/sistema-os/frontend/src/shared/lib/query/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/shared/lib/query/queryClient.ts` | Cria o `QueryClient` único da SPA com os defaults do TanStack Query; é fornecido na raiz por `QueryClientProvider` e é consumido pelas features com dados remotos. |

---

## Estilos e tema

Centraliza os estilos globais e os tokens visuais utilizados pela interface.

Diretórios: `apps/site/frontend/src/`, `apps/sistema-os/frontend/src/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/site/frontend/src/index.css` | Tokens de tipografia e cores do portfólio, sem animações ou estilos de notificações. |
| 2 | `apps/sistema-os/frontend/src/index.css` | Importa o Tailwind CSS, define tokens de tipografia, raio e cores e mantém as animações discretas de entrada, saída e progresso das notificações, com redução de movimento para as transições. |

---

## Componentes UI

Reúne elementos visuais básicos e reutilizáveis, independentes das regras de features específicas.

Diretórios: `apps/sistema-os/frontend/src/components/ui/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/components/ui/Button.tsx` | Botão tipado com propriedades nativas. Padroniza ação primária, foco, estado desabilitado e extensão por `className`. |
| 2 | `apps/sistema-os/frontend/src/components/ui/Input.tsx` | Campo tipado com propriedades nativas. Padroniza dimensões, foco e estado inválido acionado por `aria-invalid`. |
| 3 | `apps/sistema-os/frontend/src/components/ui/Label.tsx` | Rótulo baseado em `<label>`, com tipografia padronizada e associação acessível por `htmlFor`. |
| 4 | `apps/sistema-os/frontend/src/components/ui/Select.tsx` | Seletor tipado com propriedades nativas. Padroniza dimensões, foco e estado inválido acionado por `aria-invalid`. |
| 5 | `apps/sistema-os/frontend/src/components/ui/StatusBadge.tsx` | Indicador textual compacto cujas variantes aplicam os tokens semânticos de warning, info, success, neutral e error. |
| 6 | `apps/sistema-os/frontend/src/components/ui/Textarea.tsx` | Campo de texto longo tipado com propriedades nativas. Padroniza dimensões, foco e estado inválido para descrições e observações. |
| 7 | `apps/sistema-os/frontend/src/components/ui/SearchableSelect.tsx` | Combobox reutilizável sem dependências externas, com busca textual, seleção explícita e lista acessível. |

---

## Componentes de feedback

Comunica estados e respostas da interface sem depender de uma feature específica.

Diretórios: `apps/sistema-os/frontend/src/components/feedback/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/components/feedback/EmptyState.tsx` | Apresenta uma mensagem acessível para ausência de conteúdo, com título e descrição opcional. |
| 2 | `apps/sistema-os/frontend/src/components/feedback/ConfirmationDialog.tsx` | Apresenta confirmação reutilizável para ações críticas em um modal acessível. |
| 3 | `apps/sistema-os/frontend/src/components/feedback/useUnsavedChangesGuard.tsx` | Expõe proteção reutilizável contra abandono de formulários alterados a partir de `isDirty`. |
| 4 | `apps/sistema-os/frontend/src/components/feedback/notificationConfig.ts` | Centraliza a duração compartilhada, o limite máximo visível e o breve tempo de saída das notificações. |
| 5 | `apps/sistema-os/frontend/src/components/feedback/NotificationContext.ts` | Declara os tipos semânticos, os dados renderizados e o contrato do Context global de notificações. |
| 6 | `apps/sistema-os/frontend/src/components/feedback/Notification.tsx` | Renderiza cada notificação com identificação visual e textual, fechamento acessível, anel de progresso e temporizador próprio. Pausa e retoma o tempo restante por hover, foco ou aba oculta, sem intervalos frequentes. |
| 7 | `apps/sistema-os/frontend/src/components/feedback/NotificationProvider.tsx` | Mantém a pilha global no topo da viewport, com a notificação mais recente primeiro e limite de quatro itens. Expõe operações de sucesso, erro, alerta e informação e preserva apenas as quatro notificações mais recentes. |
| 8 | `apps/sistema-os/frontend/src/components/feedback/useNotifications.ts` | Expõe o consumo seguro da API global de notificações e impede uso fora do `NotificationProvider`. |

---

## Layouts

Define estruturas visuais compartilhadas por telas públicas, de autenticação e áreas internas.

Diretórios: `apps/site/frontend/src/components/layout/`, `apps/sistema-os/frontend/src/features/auth/components/`, `apps/sistema-os/frontend/src/components/layout/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/site/frontend/src/components/layout/PublicLayout.tsx` | Marca, seções e rodapé públicos; acesso externo ao login do OS sem consulta de sessão. |
| 2 | `apps/sistema-os/frontend/src/features/auth/components/AuthLayout.tsx` | Centraliza autenticação e bootstrap, com marca apontando ao portfólio externo; permite ampliar apenas o login no desktop para acomodar o painel DEMO ao lado do formulário. |
| 3 | `apps/sistema-os/frontend/src/components/layout/AppLayout.tsx` | Estrutura as telas internas com header, sidebar recolhível persistida e navegação filtrada pelo perfil da sessão. A identidade autenticada abre o mesmo menu de usuário no desktop e no mobile, com `Meu perfil`, separador e `Sair`, suporte a foco, teclado, Escape e clique externo. |
| 4 | `apps/sistema-os/frontend/src/components/layout/AppBrand.tsx` | Marca OS com destinos internos via Router ou externos via href, conforme o contexto. |

---

## Área pública

Reúne o portfólio profissional público, separado das rotas de autenticação e da aplicação autenticada.

Diretórios: `apps/site/frontend/src/features/public/pages/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/site/frontend/src/features/public/pages/HomePage.tsx` | Apresentação profissional, projetos e contato; CTA externo para o login único do OS. |
| 2 | `apps/site/frontend/src/features/public/pages/ServiceOrderProjectPage.tsx` | Estudo de caso do Sistema OS, título do documento e dois CTAs para o login único, com geração DEMO. |

---

## Ambiente DEMO

Oferece geração de credenciais temporárias dentro do `/login`, com EXEMPLO/VAZIO, prazos, cópia e preenchimento explícito do formulário, sem login automático. Não há página ou rota frontend `/demo`; o endpoint backend `/demo/access` permanece.

Diretórios: `apps/sistema-os/frontend/src/features/demo/api/`, `apps/sistema-os/frontend/src/features/demo/lib/`, `apps/sistema-os/frontend/src/features/demo/components/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/features/demo/api/demoApi.ts` | Define `DemoDataMode` e a resposta de credenciais e prazos. Envia `POST /demo/access` pela instância `apiClient`, sempre com `tutorialEnabled: false`, reutilizando os interceptors de CSRF existentes. |
| 2 | `apps/sistema-os/frontend/src/features/demo/lib/demoAccessError.ts` | Traduz os códigos reais de limite de pendências, ambientes ativos por origem, capacidade global e frequência de geração para mensagens públicas. Usa `details.retryAfterSeconds` ou o header `Retry-After` para informar uma espera aproximada, sem exibir mensagens internas do servidor. |
| 3 | `apps/sistema-os/frontend/src/features/demo/components/DemoAccessPanel.tsx` | Gerador integrado ao login, com estado somente em memória, modos, credenciais/prazos, cópia, loading, proteção de duplicidade, erros e callback Preencher login. |

---

## Autenticação

Reúne o modelo de sessão próprio do frontend, autenticação global real, telas de login e primeiro acesso, contratos HTTP, schemas de validação e guards de navegação.

Diretórios: `apps/sistema-os/frontend/src/features/auth/pages/`, `apps/sistema-os/frontend/src/features/auth/schemas/`, `apps/sistema-os/frontend/src/features/auth/context/`, `apps/sistema-os/frontend/src/features/auth/hooks/`, `apps/sistema-os/frontend/src/features/auth/components/`, `apps/sistema-os/frontend/src/features/auth/api/`, `apps/sistema-os/frontend/src/features/auth/types/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/features/auth/pages/LoginPage.tsx` | Compõe login e painel DEMO; preserva autenticação, erros e redirecionamentos. Preenche campos por React Hook Form, valida, limpa erro e foca e-mail sem enviar login ou persistir credenciais. |
| 2 | `apps/sistema-os/frontend/src/features/auth/schemas/loginSchema.ts` | Define com Zod as regras de Login, normaliza o e-mail de login e exporta `LoginFormData`, inferido e usado por `LoginPage` com React Hook Form. |
| 3 | `apps/sistema-os/frontend/src/features/auth/pages/FirstAccessPage.tsx` | Implementa no `AuthLayout` a definição e confirmação obrigatória da nova senha com React Hook Form e Zod. |
| 4 | `apps/sistema-os/frontend/src/features/auth/schemas/firstAccessSchema.ts` | Define com Zod a política de nova senha e confirmação do primeiro acesso sem transformar os valores informados, exportando `FirstAccessFormData` para a tela correspondente. |
| 5 | `apps/sistema-os/frontend/src/features/auth/context/AuthSessionContext.ts` | Declara o Context tipado da autenticação real, com sessão, bootstrap, ações, sincronização semântica da identidade autenticada e sinalização de invalidação centralizada. |
| 6 | `apps/sistema-os/frontend/src/features/auth/context/AuthSessionProvider.tsx` | Restaura a sessão por `/auth/session` e mantém a fonte global de autenticação e a fronteira entre identidade e server state. |
| 7 | `apps/sistema-os/frontend/src/features/auth/hooks/useAuthSession.ts` | Expõe o hook de consumo seguro apenas da sessão atual para telas e componentes autenticados, preservando consumidores que não precisam das ações de autenticação. |
| 8 | `apps/sistema-os/frontend/src/features/auth/components/ProtectedRoute.tsx` | Centraliza o guard reutilizável das rotas internas e aguarda o bootstrap de sessão. |
| 9 | `apps/sistema-os/frontend/src/features/auth/api/authApi.ts` | Expõe as funções HTTP reais de login, restauração de sessão, primeiro acesso e logout. |
| 10 | `apps/sistema-os/frontend/src/features/auth/types/authenticatedSession.ts` | Define o modelo de sessão da aplicação e os dados aceitos para sincronizar sua identidade, separados do contrato bruto da API, e concentra a tradução de perfil, identificador e nome do funcionário para os nomes usados pelo React. |
| 11 | `apps/sistema-os/frontend/src/features/auth/hooks/useAuth.ts` | Expõe o estado e as ações completas da autenticação para os fluxos que precisam alterar ou verificar a sessão. |
| 12 | `apps/sistema-os/frontend/src/features/auth/components/AuthSessionBootstrap.tsx` | Apresenta o estado mínimo de verificação inicial da sessão e a falha técnica recuperável, sem renderizar uma área protegida antes da confirmação de acesso. |

---

## Dashboard

Apresenta métricas de situação atual e desempenho para Administrador e Funcionário, consumindo a API real com TanStack Query.

Diretórios: `apps/sistema-os/frontend/src/features/dashboard/pages/`, `apps/sistema-os/frontend/src/features/dashboard/components/`, `apps/sistema-os/frontend/src/features/dashboard/api/`, `apps/sistema-os/frontend/src/features/dashboard/lib/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/features/dashboard/pages/DashboardPage.tsx` | Compõe o Dashboard administrativo ou individual conforme o perfil da sessão autenticada, com queries independentes para situação e desempenho. |
| 2 | `apps/sistema-os/frontend/src/features/dashboard/components/MetricCard.tsx` | Renderiza métricas numéricas ou monetárias e seu skeleton correspondente, usando link acessível somente quando existe um destino compatível. |
| 3 | `apps/sistema-os/frontend/src/features/dashboard/components/EmployeePerformancePanel.tsx` | Consulta a situação e o desempenho reais do `employeeId`, com cache isolado, período local, skeleton, erro/retry e atalhos de OS restritos ao responsável. |
| 4 | `apps/sistema-os/frontend/src/features/dashboard/api/dashboardApi.ts` | Modela os contratos discriminados de situação e desempenho e concentra as requisições Axios tipadas para os escopos administrativo e de Funcionário. |
| 5 | `apps/sistema-os/frontend/src/features/dashboard/api/dashboardQueryKeys.ts` | Define keys de TanStack Query que distinguem Administrador, Funcionário, situação, desempenho e intervalo efetivamente enviado. |
| 6 | `apps/sistema-os/frontend/src/features/dashboard/lib/dashboardPeriod.ts` | Define as opções reais do seletor e converte período civil local em limites RFC3339 `[from, before)`, ou em intervalo ausente para todo o período. |
| 7 | `apps/sistema-os/frontend/src/features/dashboard/lib/dashboardFormatters.ts` | Centraliza a apresentação de valores monetários decimais recebidos como string e percentuais derivados de contagens inteiras. |

---

## Ordens de Serviço

Reúne listagem, detalhes, criação, edição, histórico, tipos e integrações HTTP do fluxo de ordens de serviço.

Diretórios: `apps/sistema-os/frontend/src/features/orders/pages/`, `apps/sistema-os/frontend/src/features/orders/types/`, `apps/sistema-os/frontend/src/features/orders/components/`, `apps/sistema-os/frontend/src/features/orders/schemas/`, `apps/sistema-os/frontend/src/features/orders/lib/`, `apps/sistema-os/frontend/src/features/orders/api/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/features/orders/pages/OrdersPage.tsx` | Lista OS em tabela desktop ou lista mobile com TanStack Query, preservando filtros de status, busca, responsável e período pela URL, paginação visual local, criação e acesso aos detalhes. |
| 2 | `apps/sistema-os/frontend/src/features/orders/types/order.ts` | Define os tipos legados ainda usados por fluxos mockados externos, status, visibilidade, opções de responsável e os modelos reais de leitura `OrderDetail` e `OrderHistoryItem`. |
| 3 | `apps/sistema-os/frontend/src/features/orders/pages/OrderDetailsPage.tsx` | Consulta detalhe e histórico reais com queries TanStack independentes, usando `GET /orders/:id` e `GET /orders/:id/history`. |
| 4 | `apps/sistema-os/frontend/src/features/orders/pages/OrderEditPage.tsx` | Obtém o `OrderDetail` real por query, mostra loading, erro contextual e não revelação de OS sem acesso antes de compor o formulário compartilhado. |
| 5 | `apps/sistema-os/frontend/src/features/orders/pages/OrderCreatePage.tsx` | Consulta Clientes ativos e, somente para Administrador, Funcionários ativos; apresenta loading, erro com retry e estados vazios contextuais antes de compor o formulário. |
| 6 | `apps/sistema-os/frontend/src/features/orders/components/OrderForm.tsx` | Reúne a estrutura visual reutilizável e validada de criação e edição de OS. |
| 7 | `apps/sistema-os/frontend/src/features/orders/schemas/orderSchema.ts` | Define schemas de criação e edição reais, com descrição, observações e decimal textual compatíveis com o contrato do backend sem converter valor em número. |
| 8 | `apps/sistema-os/frontend/src/features/orders/lib/orderVisibility.ts` | Centraliza a UX tipada de edição, transição de status e reabertura sobre `OrderDetail`; a autorização efetiva permanece no NestJS. |
| 9 | `apps/sistema-os/frontend/src/features/orders/api/ordersApi.ts` | Concentra as consultas tipadas de `GET /orders`, `GET /orders/responsibles`, `GET /orders/:id`, `GET /orders/:id/history`, criação via `POST /orders` e atualização via `PUT /orders/:id` na instância Axios compartilhada. |
| 10 | `apps/sistema-os/frontend/src/features/orders/api/orderQueryKeys.ts` | Centraliza as query keys de listagem, responsáveis, detalhe e histórico de OS. |

---

## Clientes

Concentra a consulta e as estruturas de cadastro e edição de clientes.

Diretórios: `apps/sistema-os/frontend/src/features/clients/types/`, `apps/sistema-os/frontend/src/features/clients/mocks/`, `apps/sistema-os/frontend/src/features/clients/pages/`, `apps/sistema-os/frontend/src/features/clients/schemas/`, `apps/sistema-os/frontend/src/features/clients/api/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/features/clients/types/client.ts` | Define o modelo de detalhe `Client`, o item compacto `ClientListItem`, a situação e os endereços usados pelo React, mantendo-os independentes dos nomes do contrato HTTP do backend. |
| 2 | `apps/sistema-os/frontend/src/features/clients/mocks/clients.ts` | Mantém dados representativos legados sem consumidores no runtime atual; Clientes e Ordens de Serviço usam APIs reais. |
| 3 | `apps/sistema-os/frontend/src/features/clients/pages/ClientsPage.tsx` | Exibe em `AppLayout` a listagem real e responsiva de Clientes com TanStack Query. |
| 4 | `apps/sistema-os/frontend/src/features/clients/pages/ClientCreatePage.tsx` | Implementa no `AppLayout` o cadastro real de Cliente com mutation TanStack Query. |
| 5 | `apps/sistema-os/frontend/src/features/clients/pages/ClientEditPage.tsx` | Carrega o Cliente pela rota e monta o formulário somente após confirmar o detalhe. |
| 6 | `apps/sistema-os/frontend/src/features/clients/schemas/clientSchema.ts` | Define com Zod as validações e normalizações reutilizadas nos formulários de criação e edição de Clientes, incluindo os dígitos verificadores de CPF/CNPJ. |
| 7 | `apps/sistema-os/frontend/src/features/clients/api/clientsApi.ts` | Concentra os endpoints tipados de Clientes na instância Axios compartilhada. |
| 8 | `apps/sistema-os/frontend/src/features/clients/api/clientQueryKeys.ts` | Centraliza as query keys de listagens e detalhes de Clientes, reutilizadas pelas queries e pelas invalidações de cache após mutations. |

---

## Funcionários

Concentra a consulta, os formulários e a estrutura integrada de gestão de acesso dos funcionários.

Diretórios: `apps/sistema-os/frontend/src/features/employees/pages/`, `apps/sistema-os/frontend/src/features/employees/mocks/`, `apps/sistema-os/frontend/src/features/employees/types/`, `apps/sistema-os/frontend/src/features/employees/schemas/`, `apps/sistema-os/frontend/src/features/employees/lib/`, `apps/sistema-os/frontend/src/features/employees/api/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/features/employees/pages/EmployeesPage.tsx` | Exibe em `AppLayout` a listagem real e responsiva de Funcionários com TanStack Query. |
| 2 | `apps/sistema-os/frontend/src/features/employees/pages/EmployeeCreatePage.tsx` | Implementa no `AppLayout` o cadastro responsivo de Funcionário com React Hook Form, Zod e mutation TanStack Query para `POST /employees`. |
| 3 | `apps/sistema-os/frontend/src/features/employees/pages/EmployeeEditPage.tsx` | Carrega o Funcionário real da rota com TanStack Query, incluindo skeleton, erro com retry e estado específico para `EMPLOYEE_NOT_FOUND`. |
| 4 | `apps/sistema-os/frontend/src/features/employees/pages/EmployeeProfilePage.tsx` | Consulta o perfil administrativo real do Funcionário com TanStack Query, incluindo a conta de acesso opcional, loading, erro com retry e estado de não encontrado. |
| 5 | `apps/sistema-os/frontend/src/features/employees/mocks/employees.ts` | Mantém dados representativos legados sem consumidores no runtime atual; os fluxos de Funcionários e Ordens de Serviço usam APIs reais. |
| 6 | `apps/sistema-os/frontend/src/features/employees/types/employee.ts` | Define o formato de detalhe, o item específico de listagem, as situações e os dados de login da conta de acesso usados pelos fluxos de funcionários. |
| 7 | `apps/sistema-os/frontend/src/features/employees/schemas/employeeSchema.ts` | Define com Zod as validações e normalizações reutilizadas nos dados cadastrais dos formulários de Funcionários, sem abranger os campos da conta de acesso. |
| 8 | `apps/sistema-os/frontend/src/features/employees/schemas/employeeAccessSchema.ts` | Define com Zod as validações reutilizadas da edição administrativa conjunta, criação de conta, alteração do e-mail de login e redefinição administrativa de senha. A política de senha preserva o valor exato, inclusive espaços, entre 8 e 128 caracteres. |
| 9 | `apps/sistema-os/frontend/src/features/employees/lib/employeeStatus.ts` | Centraliza a disponibilidade mockada de alteração da situação do Funcionário a partir das OS sob sua responsabilidade. |
| 10 | `apps/sistema-os/frontend/src/features/employees/lib/employeeAccessStatus.ts` | Centraliza a relação visual entre as situações do cadastro e da conta de acesso. |
| 11 | `apps/sistema-os/frontend/src/features/employees/api/employeesApi.ts` | Concentra as consultas, a criação, a edição cadastral legada, a edição administrativa conjunta, a criação de conta e as operações próprias de acesso na instância Axios compartilhada. |
| 12 | `apps/sistema-os/frontend/src/features/employees/api/employeeQueryKeys.ts` | Centraliza as query keys de listagem e detalhe de Funcionários, com os parâmetros de filtro e busca usados pela query real. |

---

## Meu perfil

Oferece autoatendimento pessoal para Administrador e Funcionário na rota autenticada `/profile`, separado da árvore administrativa `/employees`.

Diretórios: `apps/sistema-os/frontend/src/features/profile/types/`, `apps/sistema-os/frontend/src/features/profile/schemas/`, `apps/sistema-os/frontend/src/features/profile/api/`, `apps/sistema-os/frontend/src/features/profile/pages/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/sistema-os/frontend/src/features/profile/types/profile.ts` | Define o modelo seguro exibido pela tela: nome, telefone, e-mail de contato, perfil e situações do Funcionário e da conta. |
| 2 | `apps/sistema-os/frontend/src/features/profile/schemas/profileSchema.ts` | Reutiliza as regras de nome e telefone de Funcionários e valida separadamente senha atual, nova senha e confirmação para os dois formulários independentes. |
| 3 | `apps/sistema-os/frontend/src/features/profile/api/profileApi.ts` | Concentra leitura, atualização pessoal e troca voluntária de senha nos endpoints `/profile`, traduzindo o contrato HTTP e invalidando o CSRF após a revogação das sessões. |
| 4 | `apps/sistema-os/frontend/src/features/profile/api/profileQueryKeys.ts` | Centraliza a query key do perfil autenticado para leitura e atualização coerentes do cache. |
| 5 | `apps/sistema-os/frontend/src/features/profile/pages/ProfilePage.tsx` | Exibe os dados pessoais e estados somente leitura, salva nome e telefone apenas por ação explícita, sincroniza imediatamente o nome do header com a resposta persistida e comunica o sucesso pela pilha global. Mantém a seção de Segurança independente, protege alterações pendentes e, após trocar a senha, limpa a sessão local, notifica o usuário e redireciona ao Login. |

---

## Navegação entre aplicações

Configura os destinos externos entre site e Sistema OS sem transportar credenciais ou consultar a API.

Diretórios: `apps/site/frontend/src/shared/lib/`, `apps/sistema-os/frontend/src/shared/lib/`

| Nº | Caminho completo | Responsabilidade |
| ---: | --- | --- |
| 1 | `apps/site/frontend/src/shared/lib/osLinks.ts` | Define o link único /login usando VITE_OS_URL, com fallback para https://os.leonardopassos.com e remoção de barras finais; consumido pelo layout, Home e estudo de caso. |
| 2 | `apps/sistema-os/frontend/src/shared/lib/siteLinks.ts` | Define o destino externo do portfólio usando VITE_SITE_URL, fallback para https://leonardopassos.com e remoção de barras finais; consumido pelo layout de autenticação. |
