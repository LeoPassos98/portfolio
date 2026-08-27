# Mapa da Estrutura Frontend

Este documento organiza os arquivos autorais relevantes do frontend por famílias funcionais e estruturais. Dentro de cada família, os arquivos seguem a ordem de criação; quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

## Visão rápida

| Área | Responsabilidade | Arquivos |
| --- | --- | ---: |
| Configuração e entrada | Inicialização, rotas e build do frontend | 3 |
| Estilos e tema | Estilos globais e tokens visuais | 1 |
| Componentes UI | Elementos reutilizáveis da interface | 7 |
| Componentes de feedback | Comunicação de estados da interface | 1 |
| Layouts | Estruturas compartilhadas de páginas | 3 |
| Autenticação | Login, primeiro acesso e validação | 4 |
| Dashboard | Visões administrativa e individual de métricas | 5 |
| Ordens de Serviço | Listagem, detalhes, criação, edição, histórico, tipos e mocks | 9 |
| Clientes | Listagem mockada, filtro, busca e formulários estruturais de clientes | 5 |
| Funcionários | Listagem mockada, perfil, formulários e gestão de acesso | 6 |

## Sumário

- [Configuração e entrada](#configuração-e-entrada)
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

Carrega a fonte e os estilos globais, monta `App` no DOM e fornece o contexto de navegação com `BrowserRouter`.

### 2. `frontend/src/App.tsx`

Declara as rotas da SPA, associa caminhos às páginas e redireciona a raiz para o login.

### 3. `frontend/vite.config.ts`

Configura desenvolvimento e build com os plugins de React e Tailwind CSS.

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

Combobox reutilizável sem dependências externas, com busca textual, seleção explícita, lista acessível e navegação por teclado; usado pelos seletores de Cliente e Responsável da OS.

---

## Componentes de feedback

Comunica estados e respostas da interface sem depender de uma feature específica.

Diretório principal: `frontend/src/components/feedback/`

### 1. `frontend/src/components/feedback/EmptyState.tsx`

Apresenta uma mensagem acessível para ausência de conteúdo, com título e descrição opcional.

---

## Layouts

Define estruturas visuais compartilhadas por telas de autenticação e áreas internas.

Diretórios: `frontend/src/features/auth/components/` e `frontend/src/components/layout/`

### 1. `frontend/src/features/auth/components/AuthLayout.tsx`

Centraliza telas de autenticação em uma superfície sobre o fundo da aplicação e recebe conteúdo por `children`.

### 2. `frontend/src/components/layout/AppLayout.tsx`

Estrutura as telas internas em frame desktop centralizado, com header, sidebar recolhível persistida e conteúdo rolável; preserva header e drawer de navegação próprios no mobile.

### 3. `frontend/src/components/layout/AppBrand.tsx`

Reserva uma marca geométrica reutilizável para o shell autenticado, sem definir o logo final do produto.

---

## Autenticação

Reúne as telas de login e primeiro acesso, seus fluxos de protótipo e o schema de validação atual.

Diretório principal: `frontend/src/features/auth/`

### 1. `frontend/src/features/auth/pages/LoginPage.tsx`

Implementa login acessível com React Hook Form, validação, visibilidade de senha, navegação mock para o Dashboard e atalho temporário para simular o primeiro acesso.

### 2. `frontend/src/features/auth/schemas/loginSchema.ts`

Define com Zod as regras de Login, normaliza o e-mail de login e exporta `LoginFormData`, inferido e usado por `LoginPage` com React Hook Form.

### 3. `frontend/src/features/auth/pages/FirstAccessPage.tsx`

Implementa com React Hook Form e Zod o fluxo obrigatório de definição e confirmação da nova senha no `AuthLayout`; após validação, conclui temporariamente o protótipo navegando para o Dashboard, sem submissão real ou integração com sessão.

### 4. `frontend/src/features/auth/schemas/firstAccessSchema.ts`

Define com Zod a política de nova senha e confirmação do primeiro acesso sem transformar os valores informados, exportando `FirstAccessFormData` para a tela correspondente.

---

## Dashboard

Apresenta métricas de situação atual e desempenho para as visões de Administrador e Funcionário com dados mockados.

Diretório principal: `frontend/src/features/dashboard/`

### 1. `frontend/src/features/dashboard/pages/DashboardPage.tsx`

Compõe o Dashboard administrativo e seleciona temporariamente por query parameter a visão do funcionário, delegando o painel individual ao componente compartilhado.

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

Reúne listagem, detalhes, criação, edição, histórico, tipos e dados mockados do fluxo de ordens de serviço.

Diretório principal: `frontend/src/features/orders/`

### 1. `frontend/src/features/orders/pages/OrdersPage.tsx`

Lista ordens em tabela desktop ou lista mobile, controla filtros, busca e paginação pela URL e oferece criação e acesso aos detalhes.

### 2. `frontend/src/features/orders/types/order.ts`

Define `Order`, seus status e visibilidade, incluindo os dados de serviço, valor, observações e datas usados nos mocks, Detalhes e futura edição.

### 3. `frontend/src/features/orders/mocks/orders.ts`

Exporta ordens de protótipo completas como `Order[]`, com dados de serviço, valor, visibilidade, observações e datas para apresentação por rota.

### 4. `frontend/src/features/orders/pages/OrderDetailsPage.tsx`

Obtém a ordem completa pela rota, apresenta seus dados de forma responsiva e permite consultar snapshots históricos em modo somente leitura, sem confundir ou alterar a versão atual.

### 5. `frontend/src/features/orders/pages/OrderEditPage.tsx`

Obtém a ordem pela rota, trata identificadores inexistentes e compõe o formulário compartilhado com cliente e número somente leitura, sem submissão ou persistência.

### 6. `frontend/src/features/orders/pages/OrderCreatePage.tsx`

Compõe o formulário compartilhado no modo de criação, preservando a estrutura mockada de Cliente, Dados do serviço e Configuração sem submissão.

### 7. `frontend/src/features/orders/types/orderHistory.ts`

Define o snapshot histórico com versão, dados de negócio preservados, data e hora, autor e responsável daquele momento.

### 8. `frontend/src/features/orders/mocks/orderHistory.ts`

Exporta snapshots mockados e tipados com versões e estados anteriores completos para consulta nos Detalhes da OS.

### 9. `frontend/src/features/orders/components/OrderForm.tsx`

Reúne a estrutura visual reutilizável de criação e edição de OS, incluindo os seletores pesquisáveis de Cliente e Responsável, preenchendo dados mockados quando há uma ordem e preservando as diferenças de cliente, número e informações automáticas entre os fluxos.

---

## Clientes

Concentra a consulta e as estruturas de cadastro e edição de clientes.

Diretório principal: `frontend/src/features/clients/`

### 1. `frontend/src/features/clients/types/client.ts`

Define o formato, a situação e os dados cadastrais completos usados pela consulta e edição mockadas de clientes.

### 2. `frontend/src/features/clients/mocks/clients.ts`

Exporta clientes representativos, ativos e inativos, com dados cadastrais completos para a listagem e edição mockadas.

### 3. `frontend/src/features/clients/pages/ClientsPage.tsx`

Exibe em `AppLayout` a consulta mockada responsiva de clientes, com busca por nome ou CPF/CNPJ, filtro de status sincronizado com a URL, tabela no desktop, lista no mobile, estados vazios e acesso à edição; clientes ativos permanecem como padrão.

### 4. `frontend/src/features/clients/pages/ClientCreatePage.tsx`

Estrutura no `AppLayout` o cadastro responsivo de cliente com dados cadastrais, contato, endereço e ações ainda sem comportamento.

### 5. `frontend/src/features/clients/pages/ClientEditPage.tsx`

Carrega o cliente mockado pela rota para preencher a edição responsiva, identifica a situação ativo/inativo e trata registros inexistentes, sem persistência.

---

## Funcionários

Concentra a consulta, os formulários e a estrutura integrada de gestão de acesso dos funcionários.

Diretório principal: `frontend/src/features/employees/`

### 1. `frontend/src/features/employees/pages/EmployeesPage.tsx`

Exibe em `AppLayout` a consulta mockada responsiva de funcionários, com busca por nome, telefone ou e-mail, filtro de situação sincronizado com a URL, tabela no desktop, lista no mobile, estados vazios e acesso ao Perfil do Funcionário; a situação do cadastro e da conta permanecem distintas.

### 2. `frontend/src/features/employees/pages/EmployeeCreatePage.tsx`

Estrutura no `AppLayout` o cadastro responsivo do funcionário e informa que sua conta de acesso será criada separadamente.

### 3. `frontend/src/features/employees/pages/EmployeeEditPage.tsx`

Carrega o funcionário mockado pela rota para apresentar valores cadastrais e a situação da conta de acesso na edição responsiva, mantém a criação de acesso apenas visual quando inexistente e retorna ao Perfil sem executar operações reais.

### 4. `frontend/src/features/employees/pages/EmployeeProfilePage.tsx`

Reúne dados administrativos, situação da conta, ações de edição e acesso e o painel compartilhado de desempenho do funcionário selecionado pela rota.

### 5. `frontend/src/features/employees/mocks/employees.ts`

Exporta funcionários representativos, com dados de conta ativa, inativa ou ausente, para a listagem, edição e Perfil administrativo mockados.

### 6. `frontend/src/features/employees/types/employee.ts`

Define o formato, as situações e os dados de login da conta de acesso usados pela consulta e edição mockadas de funcionários.
