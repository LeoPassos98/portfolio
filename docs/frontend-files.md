# Mapa da Estrutura Frontend

Este documento organiza os arquivos autorais relevantes do frontend por famílias funcionais e estruturais.

Dentro de cada família, os arquivos seguem a ordem de criação. Quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

Destina-se a pessoas e agentes que precisam localizar responsabilidades no frontend sem depender do histórico da implementação.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

## Visão rápida

| Área                    | Responsabilidade                                                                  | Arquivos |
| ----------------------- | --------------------------------------------------------------------------------- | -------: |
| Configuração e entrada  | Inicialização, rotas, providers e build do frontend                               |        3 |
| Infraestrutura HTTP     | Cliente Axios compartilhado, ambiente e CSRF em memória                           |        1 |
| Infraestrutura de dados | QueryClient compartilhado para cache e coordenação de server state                |        1 |
| Estilos e tema          | Estilos globais e tokens visuais                                                  |        1 |
| Componentes UI          | Elementos reutilizáveis da interface                                              |        7 |
| Componentes de feedback | Comunicação de estados, confirmações e proteção de alterações pendentes           |        6 |
| Layouts                 | Estruturas compartilhadas de páginas                                              |        3 |
| Autenticação            | Sessão real, login, primeiro acesso, contrato HTTP, validação e proteção de rotas |       12 |
| Dashboard               | Visões administrativa e individual de métricas                                    |        5 |
| Ordens de Serviço       | Listagem, detalhe, criação, edição, histórico, validação e integrações reais      |       10 |
| Clientes                | Listagem, cadastro e edição reais, com mocks preservados para Ordens              |        8 |
| Funcionários            | Listagem real, perfil, formulários validados, situação e gestão de acesso         |       13 |

## Sumário

- [Configuração e entrada](#configuração-e-entrada)
- [Infraestrutura HTTP](#infraestrutura-http)
- [Infraestrutura de dados](#infraestrutura-de-dados)
- [Estilos e tema](#estilos-e-tema)
- [Componentes UI](#componentes-ui)
- [Componentes de feedback](#componentes-de-feedback)
- [Layouts](#layouts)
- [Autenticação](#autenticação)
- [Dashboard](#dashboard)
- [Ordens de Serviço](#ordens-de-serviço)
- [Clientes](#clientes)
- [Funcionários](#funcionários)

---

## Configuração e entrada

Inicializa a aplicação, declara suas rotas e configura o ambiente de desenvolvimento e build.

Diretório principal: `frontend/`

### 1. `frontend/src/main.tsx`

Carrega a fonte e os estilos globais e monta `App` no DOM.

Compõe os providers de server state, autenticação, feedback de sucesso e navegação.

### 2. `frontend/src/App.tsx`

Declara as rotas da SPA, associa caminhos às páginas, apresenta o bootstrap técnico da sessão e centraliza a proteção das áreas autenticadas e exclusivas de Administrador.

### 3. `frontend/vite.config.ts`

Configura desenvolvimento e build com os plugins de React e Tailwind CSS.

---

## Infraestrutura HTTP

Centraliza o transporte HTTP, a configuração de ambiente da API e a proteção CSRF reutilizável.

Diretório principal: `frontend/src/shared/lib/http/`

### 1. `frontend/src/shared/lib/http/apiClient.ts`

Cria a única instância Axios do frontend com `VITE_API_URL` e `withCredentials`; falha sem a URL da API.

Anexa o token CSRF em memória às mutações, invalida-o após troca de sessão e encaminha `AUTH_UNAUTHENTICATED` ao estado global de autenticação.

---

## Infraestrutura de dados

Disponibiliza a instância compartilhada de TanStack Query para futuras integrações de server state, sem assumir a responsabilidade de autenticação.

Diretório principal: `frontend/src/shared/lib/query/`

### 1. `frontend/src/shared/lib/query/queryClient.ts`

Cria o `QueryClient` único da SPA com os defaults do TanStack Query; é fornecido na raiz por `QueryClientProvider` e será consumido pelas features que migrarem para dados remotos.

---

## Estilos e tema

Centraliza os estilos globais e os tokens visuais utilizados pela interface.

Diretório principal: `frontend/src/`

### 1. `frontend/src/index.css`

Importa o Tailwind CSS e define tokens de tipografia, raio e cores.

---

## Componentes UI

Reúne elementos visuais básicos e reutilizáveis, independentes das regras de features específicas.

Diretório principal: `frontend/src/components/ui/`

### 1. `frontend/src/components/ui/Button.tsx`

Botão tipado com propriedades nativas. Padroniza ação primária, foco, estado desabilitado e extensão por `className`.

### 2. `frontend/src/components/ui/Input.tsx`

Campo tipado com propriedades nativas. Padroniza dimensões, foco e estado inválido acionado por `aria-invalid`.

### 3. `frontend/src/components/ui/Label.tsx`

Rótulo baseado em `<label>`, com tipografia padronizada e associação acessível por `htmlFor`.

### 4. `frontend/src/components/ui/Select.tsx`

Seletor tipado com propriedades nativas. Padroniza dimensões, foco e estado inválido acionado por `aria-invalid`.

### 5. `frontend/src/components/ui/StatusBadge.tsx`

Indicador textual compacto cujas variantes aplicam os tokens semânticos de warning, info, success, neutral e error.

### 6. `frontend/src/components/ui/Textarea.tsx`

Campo de texto longo tipado com propriedades nativas. Padroniza dimensões, foco e estado inválido para descrições e observações.

### 7. `frontend/src/components/ui/SearchableSelect.tsx`

Combobox reutilizável sem dependências externas, com busca textual, seleção explícita e lista acessível.

Integra valor e erro com formulários e atende aos seletores de Cliente e Responsável da OS.

---

## Componentes de feedback

Comunica estados e respostas da interface sem depender de uma feature específica.

Diretório principal: `frontend/src/components/feedback/`

### 1. `frontend/src/components/feedback/EmptyState.tsx`

Apresenta uma mensagem acessível para ausência de conteúdo, com título e descrição opcional.

### 2. `frontend/src/components/feedback/ConfirmationDialog.tsx`

Apresenta confirmação reutilizável para ações críticas em um modal acessível.

Mantém foco, aceita Escape e devolve o foco ao controle de origem. É usada no cancelamento de OS e na exclusão de Cliente.

### 3. `frontend/src/components/feedback/useUnsavedChangesGuard.tsx`

Expõe proteção reutilizável contra abandono de formulários alterados a partir de `isDirty`.

Intercepta links internos compatíveis, mantém o destino pendente até confirmação e registra o aviso nativo de `beforeunload`.

### 4. `frontend/src/components/feedback/SuccessFeedbackContext.ts`

Declara o contrato e o Context tipado da API global de feedback de sucesso, mantendo Provider e consumidores no mesmo contrato.

### 5. `frontend/src/components/feedback/SuccessFeedbackProvider.tsx`

Mantém o toast de sucesso textual, não bloqueante e dispensável, expondo a API global que será chamada por mutations confirmadas.

### 6. `frontend/src/components/feedback/useSuccessFeedback.ts`

Expõe o hook de consumo seguro de `showSuccess` e `dismissSuccess` para fluxos futuros de mutation bem-sucedida.

---

## Layouts

Define estruturas visuais compartilhadas por telas de autenticação e áreas internas.

Diretórios: `frontend/src/features/auth/components/` e `frontend/src/components/layout/`

### 1. `frontend/src/features/auth/components/AuthLayout.tsx`

Centraliza telas de autenticação em uma superfície sobre o fundo da aplicação e recebe conteúdo por `children`.

### 2. `frontend/src/components/layout/AppLayout.tsx`

Estrutura as telas internas com header, sidebar recolhível persistida e navegação filtrada pelo perfil da sessão.

Preserva a rolagem própria da sidebar e do drawer mobile. Também encerra a sessão real antes de voltar ao Login.

### 3. `frontend/src/components/layout/AppBrand.tsx`

Reserva uma marca geométrica reutilizável para o shell autenticado, sem definir o logo final do produto.

---

## Autenticação

Reúne o modelo de sessão próprio do frontend, autenticação global real, telas de login e primeiro acesso, contratos HTTP, schemas de validação e guards de navegação.

Diretório principal: `frontend/src/features/auth/`

### 1. `frontend/src/features/auth/pages/LoginPage.tsx`

Implementa login acessível com React Hook Form, validação, visibilidade de senha, feedback de falha e navegação conforme a sessão real retornada pelo backend.

### 2. `frontend/src/features/auth/schemas/loginSchema.ts`

Define com Zod as regras de Login, normaliza o e-mail de login e exporta `LoginFormData`, inferido e usado por `LoginPage` com React Hook Form.

### 3. `frontend/src/features/auth/pages/FirstAccessPage.tsx`

Implementa no `AuthLayout` a definição e confirmação obrigatória da nova senha com React Hook Form e Zod.

Submete a alteração real e navega ao Dashboard somente depois da atualização da sessão.

### 4. `frontend/src/features/auth/schemas/firstAccessSchema.ts`

Define com Zod a política de nova senha e confirmação do primeiro acesso sem transformar os valores informados, exportando `FirstAccessFormData` para a tela correspondente.

### 5. `frontend/src/features/auth/context/AuthSessionContext.ts`

Declara o Context tipado da autenticação real, com sessão, bootstrap, ações e sinalização de invalidação centralizada.

### 6. `frontend/src/features/auth/context/AuthSessionProvider.tsx`

Restaura a sessão por `/auth/session` e mantém a fonte global de autenticação.

Expõe login, troca de senha, logout, nova tentativa de bootstrap e limpeza central após `AUTH_UNAUTHENTICATED`.

### 7. `frontend/src/features/auth/hooks/useAuthSession.ts`

Expõe o hook de consumo seguro apenas da sessão atual para telas e componentes autenticados, preservando consumidores que não precisam das ações de autenticação.

### 8. `frontend/src/features/auth/components/ProtectedRoute.tsx`

Centraliza o guard reutilizável das rotas internas e aguarda o bootstrap de sessão.

Exige autenticação, encaminha a troca obrigatória de senha ao primeiro acesso e redireciona perfil sem permissão ao Dashboard com feedback contextual.

### 9. `frontend/src/features/auth/api/authApi.ts`

Expõe as funções HTTP reais de login, restauração de sessão, primeiro acesso e logout.

Mantém contratos independentes do modelo da aplicação e invalida o CSRF após mutações que regeneram ou encerram a sessão.

### 10. `frontend/src/features/auth/types/authenticatedSession.ts`

Define o modelo de sessão da aplicação separado do contrato bruto da API e concentra a tradução de perfil, identificador e nome do funcionário para os nomes usados pelo React.

### 11. `frontend/src/features/auth/hooks/useAuth.ts`

Expõe o estado e as ações completas da autenticação para os fluxos que precisam alterar ou verificar a sessão.

### 12. `frontend/src/features/auth/components/AuthSessionBootstrap.tsx`

Apresenta o estado mínimo de verificação inicial da sessão e a falha técnica recuperável, sem renderizar uma área protegida antes da confirmação de acesso.

---

## Dashboard

Apresenta métricas de situação atual e desempenho para as visões de Administrador e Funcionário com dados mockados.

Diretório principal: `frontend/src/features/dashboard/`

### 1. `frontend/src/features/dashboard/pages/DashboardPage.tsx`

Compõe o Dashboard administrativo ou individual conforme o perfil da sessão autenticada.

Recebe o feedback do guard e delega o painel individual ao componente compartilhado.

### 2. `frontend/src/features/dashboard/components/MetricCard.tsx`

Renderiza métricas numéricas ou monetárias com texto secundário e classes semânticas, usando link acessível somente quando existe um destino compatível.

### 3. `frontend/src/features/dashboard/components/EmployeePerformancePanel.tsx`

Reúne situação atual, seletor de período, cálculos e cards de desempenho de um funcionário, adaptando os textos para uso próprio ou consulta administrativa.

### 4. `frontend/src/features/dashboard/mocks/adminDashboard.ts`

Define os totais atuais, opções de período e valores mockados de desempenho usados exclusivamente pelo Dashboard do Administrador.

### 5. `frontend/src/features/dashboard/mocks/employeeDashboard.ts`

Relaciona cada funcionário mockado às suas ordens atuais e métricas por período, permitindo reutilizar o mesmo painel no Dashboard e no Perfil administrativo.

---

## Ordens de Serviço

Reúne listagem, detalhes, criação, edição, histórico, tipos e integrações HTTP do fluxo de ordens de serviço.

Diretório principal: `frontend/src/features/orders/`

### 1. `frontend/src/features/orders/pages/OrdersPage.tsx`

Lista OS em tabela desktop ou lista mobile com TanStack Query, preservando filtros de status, busca, responsável e período pela URL, paginação visual local, criação e acesso aos detalhes.

Envia status, busca normalizada, responsável e intervalo de criação a `GET /orders`; datas civis da URL são convertidas no timezone local para o intervalo `[from, before)`. As opções seguras de responsáveis vêm de `GET /orders/responsibles`; o backend aplica a autorização contextual e a filtragem, enquanto a paginação visual permanece local sobre o resultado recebido.

### 2. `frontend/src/features/orders/types/order.ts`

Define os tipos legados ainda usados por fluxos mockados externos, status, visibilidade, opções de responsável e os modelos reais de leitura `OrderDetail` e `OrderHistoryItem`.

Os modelos reais preservam o decimal como texto e incluem as datas de conclusão, cancelamento e versão necessária para OCC.

### 3. `frontend/src/features/orders/pages/OrderDetailsPage.tsx`

Consulta detalhe e histórico reais com queries TanStack independentes, usando `GET /orders/:id` e `GET /orders/:id/history`.

Preserva a visualização responsiva, loading, erro, retry, não revelação de OS inacessível e seleção de snapshot. Na versão atual, oferece edição conforme a UX de perfil/estado e reabertura real de Cancelada para Administrador, sincronizando detalhe, listas e histórico.

### 4. `frontend/src/features/orders/pages/OrderEditPage.tsx`

Obtém o `OrderDetail` real por query, mostra loading, erro contextual e não revelação de OS sem acesso antes de compor o formulário compartilhado.

Executa a edição real com versão originalmente carregada, sincroniza caches, preserva os valores em falha e só recarrega o formulário por ação explícita após conflito OCC. Consulta Funcionários ativos somente para Administrador em OS aberta.

### 5. `frontend/src/features/orders/pages/OrderCreatePage.tsx`

Consulta Clientes ativos e, somente para Administrador, Funcionários ativos; apresenta loading, erro com retry e estados vazios contextuais antes de compor o formulário.

Executa a mutation real de criação, atualiza o cache do detalhe, invalida listas e navega para a nova OS. Funcionário usa o responsável da sessão sem consultar a API administrativa.

### 6. `frontend/src/features/orders/components/OrderForm.tsx`

Reúne a estrutura visual reutilizável e validada de criação e edição de OS.

Inclui seletores pesquisáveis para Administrador e consome permissões e transições centralizadas.

Nos modos de criação e edição, recebe operações reais, mantém o decimal como texto, trata pendência, registros stale e dirty state. A edição mantém o submit confirmado de cancelamento, trata os erros estáveis do backend e preserva valores até a recarga consciente do conflito.

### 7. `frontend/src/features/orders/schemas/orderSchema.ts`

Define schemas de criação e edição reais, com descrição, observações e decimal textual compatíveis com o contrato do backend sem converter valor em número.

### 8. `frontend/src/features/orders/lib/orderVisibility.ts`

Centraliza a UX tipada de edição, transição de status e reabertura sobre `OrderDetail`; a autorização efetiva permanece no NestJS.

Administrador edita OS aberta, corrige Concluída e reabre Cancelada; Funcionário edita somente a própria OS aberta.

É reutilizada por detalhes, edição e formulário.

### 9. `frontend/src/features/orders/api/ordersApi.ts`

Concentra as consultas tipadas de `GET /orders`, `GET /orders/responsibles`, `GET /orders/:id`, `GET /orders/:id/history`, criação via `POST /orders` e atualização via `PUT /orders/:id` na instância Axios compartilhada.

Separa contratos HTTP explícitos dos modelos React de lista, detalhe e snapshot, centraliza os mappers de enums e preserva `valor` como texto decimal exato no server state.

### 10. `frontend/src/features/orders/api/orderQueryKeys.ts`

Centraliza as query keys de listagem, responsáveis, detalhe e histórico de OS.

As chaves de detalhe e histórico são distintas porque representam recursos HTTP e estados de query independentes; a chave da listagem contém somente os parâmetros efetivamente enviados ao backend.

---

## Clientes

Concentra a consulta e as estruturas de cadastro e edição de clientes.

Diretório principal: `frontend/src/features/clients/`

### 1. `frontend/src/features/clients/types/client.ts`

Define o modelo de detalhe `Client`, o item compacto `ClientListItem`, a situação e os endereços usados pelo React, mantendo-os independentes dos nomes do contrato HTTP do backend.

### 2. `frontend/src/features/clients/mocks/clients.ts`

Exporta clientes representativos usados somente pelas features ainda mockadas, especialmente o seletor de Cliente das Ordens de Serviço.

### 3. `frontend/src/features/clients/pages/ClientsPage.tsx`

Exibe em `AppLayout` a listagem real e responsiva de Clientes com TanStack Query.

Sincroniza busca e filtro de status com a URL e fornece skeleton, erro recuperável, estados vazios e acesso à edição. Clientes ativos permanecem como padrão.

### 4. `frontend/src/features/clients/pages/ClientCreatePage.tsx`

Implementa no `AppLayout` o cadastro real de Cliente com mutation TanStack Query.

Exibe feedback após confirmação do servidor, invalida a listagem e protege alterações pendentes.

Consulta CEP no blur, preenche somente dados disponíveis e mantém fallback manual quando o CEP não é encontrado ou o fornecedor falha.

### 5. `frontend/src/features/clients/pages/ClientEditPage.tsx`

Carrega o Cliente pela rota e monta o formulário somente após confirmar o detalhe.

Persiste edição cadastral com proteção contra abandono.

Administrador também altera situação e exclui com mutations separadas; Funcionário edita somente dados cadastrais. O backend confirma a regra de OS vinculada.

### 6. `frontend/src/features/clients/schemas/clientSchema.ts`

Define com Zod as validações e normalizações reutilizadas nos formulários de criação e edição de Clientes, incluindo os dígitos verificadores de CPF/CNPJ.

### 7. `frontend/src/features/clients/api/clientsApi.ts`

Concentra os endpoints tipados de Clientes na instância Axios compartilhada.

Separa os contratos HTTP do NestJS dos modelos React e traduz cadastro, detalhe, listagem, situação e CEP sem expor o fornecedor externo.

### 8. `frontend/src/features/clients/api/clientQueryKeys.ts`

Centraliza as query keys de listagens e detalhes de Clientes, reutilizadas pelas queries e pelas invalidações de cache após mutations.

---

## Funcionários

Concentra a consulta, os formulários e a estrutura integrada de gestão de acesso dos funcionários.

Diretório principal: `frontend/src/features/employees/`

### 1. `frontend/src/features/employees/pages/EmployeesPage.tsx`

Exibe em `AppLayout` a listagem real e responsiva de Funcionários com TanStack Query.

Envia busca e filtro de situação sincronizados com a URL ao backend, apresenta loading, erro com retry, tabela no desktop, lista no mobile, estados vazios e acesso ao Perfil.

A situação do cadastro e da conta permanecem distintas.

### 2. `frontend/src/features/employees/pages/EmployeeCreatePage.tsx`

Implementa no `AppLayout` o cadastro responsivo de Funcionário com React Hook Form, Zod e mutation TanStack Query para `POST /employees`.

Protege alterações não salvas, bloqueia envios duplicados, sincroniza o cache de detalhe/listagens, apresenta feedback de sucesso ou erro compreensível e navega após persistir. A conta de acesso continua separada.

### 3. `frontend/src/features/employees/pages/EmployeeEditPage.tsx`

Carrega o Funcionário real da rota com TanStack Query, incluindo skeleton, erro com retry e estado específico para `EMPLOYEE_NOT_FOUND`.

Atualiza nome, telefone e e-mail de contato por `PUT`, a situação do Funcionário por `PATCH` separado e os campos independentes da conta por `PATCH /employees/:id/account/status`, `PATCH /employees/:id/account/profile`, `PATCH /employees/:id/account/login-email` e `PATCH /employees/:id/account/password`; as mutations que alteram dados visíveis sincronizam o detalhe e invalidam as listagens.

O formulário editável de acesso contém somente o e-mail de login e reseta para a resposta normalizada da API após persistir; perfil e situação seguem seus controles independentes. A redefinição administrativa de senha usa formulário, schema e mutation próprios, mantém a senha somente no estado local, preserva espaços e limpa os campos após sucesso, sem invalidar listagens que a resposta não altera.

Cria a conta de acesso de Funcionário sem conta por `POST /employees/:id/account`, bloqueia reenvio durante a mutation, atualiza o detalhe/listagens e limpa o formulário após sucesso. Apresenta a duplicidade de e-mail no campo e refaz o detalhe quando outra operação já criou a conta. O perfil exibido sempre vem do cache do detalhe, aguarda a resposta do backend e trata `LAST_ACTIVE_ADMIN_REQUIRED`.

Mantém separados e-mail de contato e e-mail de login e protege alterações pendentes.

Aplica visualmente a relação entre cadastro e acesso. A decisão sobre o último Administrador fica exclusivamente no backend, sem dependência de mocks no fluxo de perfil.

### 4. `frontend/src/features/employees/pages/EmployeeProfilePage.tsx`

Consulta o perfil administrativo real do Funcionário com TanStack Query, incluindo a conta de acesso opcional, loading, erro com retry e estado de não encontrado.

Preserva as ações de edição e acesso; o painel compartilhado de desempenho continua mockado nesta etapa.

### 5. `frontend/src/features/employees/mocks/employees.ts`

Exporta funcionários representativos, com dados de conta ativa, inativa ou ausente, para edição, Perfil administrativo e demais fluxos mockados ainda não integrados.

### 6. `frontend/src/features/employees/types/employee.ts`

Define o formato de detalhe, o item específico de listagem, as situações e os dados de login da conta de acesso usados pelos fluxos de funcionários.

### 7. `frontend/src/features/employees/schemas/employeeSchema.ts`

Define com Zod as validações e normalizações reutilizadas nos dados cadastrais dos formulários de Funcionários, sem abranger os campos da conta de acesso.

### 8. `frontend/src/features/employees/schemas/employeeAccessSchema.ts`

Define com Zod as validações reutilizadas de criação de conta, alteração do e-mail de login e redefinição administrativa de senha. A política de senha preserva o valor exato, inclusive espaços, entre 8 e 128 caracteres.

Inclui normalização do e-mail de login, perfil e confirmação da senha temporária exigidos na criação.

### 9. `frontend/src/features/employees/lib/employeeStatus.ts`

Centraliza a disponibilidade mockada de alteração da situação do Funcionário a partir das OS sob sua responsabilidade.

Bloqueia somente a inativação enquanto existir OS Aguardando ou Em andamento e preserva a independência da conta na reativação.

### 10. `frontend/src/features/employees/lib/employeeAccessStatus.ts`

Centraliza a relação visual entre as situações do cadastro e da conta de acesso.

Cadastro inativo força a conta associada a Inativa; reativação preserva conta inativa ou ausência de conta. Também expõe a disponibilidade visual do controle de situação, sem antecipar a regra do último Administrador.

### 11. `frontend/src/features/employees/api/employeesApi.ts`

Concentra as consultas, a criação, a edição cadastral, a criação de conta e as alterações independentes de situação, perfil e e-mail de login na instância Axios compartilhada.

Separa os contratos HTTP do NestJS dos modelos React, mapeia a conta opcional e traduz os formulários de criação, edição e acesso para os contratos HTTP; `loginEmail` só existe no detalhe, onde a API o fornece.

### 12. `frontend/src/features/employees/api/employeeQueryKeys.ts`

Centraliza as query keys de listagem e detalhe de Funcionários, com os parâmetros de filtro e busca usados pela query real.
