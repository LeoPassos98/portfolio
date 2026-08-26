# Mapa da Estrutura Frontend

Este documento organiza os arquivos autorais relevantes do frontend por famílias funcionais e estruturais. Dentro de cada família, os arquivos seguem a ordem de criação; quando surgiram no mesmo commit, a ordem é estrutural, pois o Git não registra uma sequência interna.

As descrições representam a responsabilidade atual de cada arquivo. Este mapa não substitui o histórico do Git.

## Visão rápida

| Área | Responsabilidade | Arquivos |
| --- | --- | ---: |
| Configuração e entrada | Inicialização, rotas e build do frontend | 3 |
| Estilos e tema | Estilos globais e tokens visuais | 1 |
| Componentes UI | Elementos reutilizáveis da interface | 5 |
| Componentes de feedback | Comunicação de estados da interface | 1 |
| Layouts | Estruturas compartilhadas de páginas | 2 |
| Autenticação | Login, primeiro acesso e validação | 3 |
| Dashboard | Situação operacional e desempenho administrativo | 3 |
| Ordens de Serviço | Listagem, detalhes, criação, edição, histórico, tipos e mocks | 8 |
| Clientes | Filtro e formulários estruturais de clientes | 3 |
| Funcionários | Filtro, formulários e acesso estrutural | 3 |

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

Estrutura as telas internas com sidebar desktop, navegação mobile recolhível, indicação de rota ativa e área principal.

---

## Autenticação

Reúne as telas de login e primeiro acesso, seus fluxos de protótipo e o schema de validação atual.

Diretório principal: `frontend/src/features/auth/`

### 1. `frontend/src/features/auth/pages/LoginPage.tsx`

Implementa login acessível com React Hook Form, validação, visibilidade de senha, navegação mock para o Dashboard e atalho temporário para simular o primeiro acesso.

### 2. `frontend/src/features/auth/schemas/loginSchema.ts`

Define com Zod as regras de e-mail e senha e exporta `LoginFormData`, inferido e usado por `LoginPage`.

### 3. `frontend/src/features/auth/pages/FirstAccessPage.tsx`

Estrutura o fluxo obrigatório de definição da nova senha no `AuthLayout` e conclui temporariamente o protótipo navegando para o Dashboard, ainda sem validação, submissão real ou integração com sessão.

---

## Dashboard

Apresenta a situação operacional e o desempenho do Dashboard administrativo com dados mockados.

Diretório principal: `frontend/src/features/dashboard/`

### 1. `frontend/src/features/dashboard/pages/DashboardPage.tsx`

Compõe em `AppLayout` os blocos responsivos de situação atual e desempenho, controla o período selecionado e transforma os mocks administrativos em métricas para `MetricCard`.

### 2. `frontend/src/features/dashboard/components/MetricCard.tsx`

Renderiza métricas numéricas ou monetárias com texto secundário e classes semânticas, usando link acessível somente quando existe um destino compatível.

### 3. `frontend/src/features/dashboard/mocks/adminDashboard.ts`

Define os totais atuais, opções de período e valores mockados de desempenho usados exclusivamente pelo Dashboard do Administrador.

---

## Ordens de Serviço

Reúne listagem, detalhes, criação, edição, histórico, tipos e dados mockados do fluxo de ordens de serviço.

Diretório principal: `frontend/src/features/orders/`

### 1. `frontend/src/features/orders/pages/OrdersPage.tsx`

Lista ordens em tabela desktop ou lista mobile, controla filtros, busca e paginação pela URL e oferece criação e acesso aos detalhes.

### 2. `frontend/src/features/orders/types/order.ts`

Define `Order` e seus status aceitos, tipando os mocks e o formato esperado de futuros dados da API.

### 3. `frontend/src/features/orders/mocks/orders.ts`

Exporta as ordens de protótipo como `Order[]`, separadas da página que as apresenta.

### 4. `frontend/src/features/orders/pages/OrderDetailsPage.tsx`

Obtém a ordem pela rota, exibe seus dados e ações, conecta à edição, lista snapshots do histórico e usa `EmptyState` quando não há ordem ou histórico.

### 5. `frontend/src/features/orders/pages/OrderEditPage.tsx`

Mantém número e cliente somente para leitura e estrutura controles e ações de edição sem submissão ou persistência.

### 6. `frontend/src/features/orders/pages/OrderCreatePage.tsx`

Usa opções mockadas locais para cliente e responsável, mostra o status inicial aguardando e estrutura criação e cancelamento sem submissão ou numeração manual.

### 7. `frontend/src/features/orders/types/orderHistory.ts`

Define o snapshot do histórico de uma ordem com vínculo, data e hora, autor, responsável e status daquele momento.

### 8. `frontend/src/features/orders/mocks/orderHistory.ts`

Exporta snapshots mockados e tipados usados pelos detalhes da ordem para representar seu histórico.

---

## Clientes

Concentra a consulta e as estruturas de cadastro e edição de clientes.

Diretório principal: `frontend/src/features/clients/`

### 1. `frontend/src/features/clients/pages/ClientsPage.tsx`

Exibe em `AppLayout` a ação de novo cliente, um seletor de status sincronizado com a URL e um registro mockado mínimo com acesso à edição, usando clientes ativos como padrão e preservando os demais parâmetros.

### 2. `frontend/src/features/clients/pages/ClientCreatePage.tsx`

Estrutura no `AppLayout` o cadastro responsivo de cliente com dados cadastrais, contato, endereço e ações ainda sem comportamento.

### 3. `frontend/src/features/clients/pages/ClientEditPage.tsx`

Estrutura no `AppLayout` a edição responsiva dos mesmos dados de cliente, sem carregamento pelo parâmetro da rota ou persistência.

---

## Funcionários

Concentra a consulta, os formulários e a estrutura integrada de gestão de acesso dos funcionários.

Diretório principal: `frontend/src/features/employees/`

### 1. `frontend/src/features/employees/pages/EmployeesPage.tsx`

Exibe em `AppLayout` a ação de novo funcionário, um seletor de status sincronizado com a URL e um registro mockado mínimo com acesso à edição, usando funcionários ativos como padrão e preservando os demais parâmetros.

### 2. `frontend/src/features/employees/pages/EmployeeCreatePage.tsx`

Estrutura no `AppLayout` o cadastro responsivo do funcionário e informa que sua conta de acesso será criada separadamente.

### 3. `frontend/src/features/employees/pages/EmployeeEditPage.tsx`

Estrutura no `AppLayout` a edição responsiva do funcionário e integra a criação da conta de acesso no estado sem acesso, sem carregar dados ou executar operações.
