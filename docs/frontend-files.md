# Mapa de arquivos do frontend

Este documento organiza os elementos autorais relevantes do frontend por família. Dentro de cada família, as entradas seguem a ordem de criação; elementos do mesmo commit usam uma ordem de leitura estrutural, pois o Git não registra uma sequência interna entre arquivos criados juntos.

As descrições representam a responsabilidade atual de cada elemento. Alterações futuras devem atualizar a entrada existente, sem criar um histórico paralelo ao Git.

## Configuração e entrada do frontend

### `frontend/src/main.tsx`

Ponto de entrada da aplicação React. Carrega a fonte e os estilos globais, monta `App` no DOM e fornece o contexto de navegação por meio de `BrowserRouter`.

### `frontend/src/App.tsx`

Declara as rotas da SPA e associa cada caminho à página correspondente. Também redireciona a raiz para o login.

### `frontend/vite.config.ts`

Configura o build e o ambiente de desenvolvimento do frontend com os plugins de React e Tailwind CSS.

## Estilos e tema

### `frontend/src/index.css`

Entrada global de estilos do Tailwind CSS. Define os tokens de tipografia, raio e cores usados pela interface.

## Componentes UI

### `frontend/src/components/ui/`

Reúne componentes visuais básicos e reutilizáveis, independentes das regras de uma feature específica.

### `frontend/src/components/ui/Button.tsx`

Botão reutilizável tipado com as propriedades nativas de `<button>`. Centraliza os estilos de ação primária, foco, estado desabilitado e extensão por `className`.

### `frontend/src/components/ui/Input.tsx`

Campo de entrada reutilizável tipado com as propriedades nativas de `<input>`. Padroniza dimensões, foco e aparência do estado inválido acionado por `aria-invalid`.

### `frontend/src/components/ui/Label.tsx`

Rótulo reutilizável baseado em `<label>`. Padroniza a tipografia dos campos e permite associação acessível com inputs por `htmlFor`.

## Layouts

### `frontend/src/features/auth/components/AuthLayout.tsx`

Layout das telas de autenticação. Centraliza o conteúdo em uma superfície sobre o fundo da aplicação e recebe a interface específica por `children`.

### `frontend/src/components/layout/`

Reúne layouts compartilhados por diferentes áreas da aplicação, sem vinculá-los a uma feature específica.

### `frontend/src/components/layout/AppLayout.tsx`

Estrutura responsiva compartilhada das telas internas. Renderiza uma sidebar permanente no desktop, oferece navegação recolhível no mobile, destaca a rota ativa e exibe o conteúdo de cada página na área principal.

## Autenticação

### `frontend/src/features/auth/`

Agrupa páginas, componentes e schemas pertencentes ao fluxo de autenticação.

### `frontend/src/features/auth/pages/LoginPage.tsx`

Implementa a tela de login com campos acessíveis, alternância de visibilidade da senha, formulário gerenciado pelo React Hook Form e navegação mock para o Dashboard após validação.

### `frontend/src/features/auth/schemas/loginSchema.ts`

Define com Zod as regras de validação do e-mail e da senha do login. Também exporta `LoginFormData`, inferido diretamente do schema e usado por `LoginPage`.

## Dashboard

### `frontend/src/features/dashboard/`

Agrupa a página e futuras responsabilidades específicas do Dashboard.

### `frontend/src/features/dashboard/pages/DashboardPage.tsx`

Página inicial da área interna. Compõe, com `MetricCard`, um resumo em uma grade responsiva com seis métricas mockadas e navegáveis dentro de `AppLayout`.

### `frontend/src/features/dashboard/components/`

Reúne componentes visuais específicos do Dashboard.

### `frontend/src/features/dashboard/components/MetricCard.tsx`

Card de métrica navegável reutilizado pelo Dashboard. Recebe o nome, o valor, o destino e as classes semânticas necessárias para preservar as variações visuais das métricas.

## Ordens de Serviço

### `frontend/src/features/orders/`

Agrupa a página e futuras responsabilidades relacionadas às ordens de serviço.

### `frontend/src/features/orders/pages/OrdersPage.tsx`

Página inicial de ordens de serviço. Atualmente renderiza apenas seu título dentro de `AppLayout`.

## Clientes

### `frontend/src/features/clients/`

Agrupa a página e futuras responsabilidades relacionadas aos clientes.

### `frontend/src/features/clients/pages/ClientsPage.tsx`

Página inicial de clientes. Atualmente renderiza apenas seu título dentro de `AppLayout`.

## Funcionários

### `frontend/src/features/employees/`

Agrupa a página e futuras responsabilidades relacionadas aos funcionários.

### `frontend/src/features/employees/pages/EmployeesPage.tsx`

Página inicial de funcionários. Atualmente renderiza apenas seu título dentro de `AppLayout`.
