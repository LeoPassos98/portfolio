# Configuração do projeto

## Repositório Git

O repositório foi inicializado com Git na branch principal `main` para versionar o projeto desde sua criação.

```bash
git init -b main
```

O remote `origin` usa SSH (`git@github.com:LeoPassos98/portfolio.git`) para permitir a comunicação autenticada com o GitHub.

## Frontend

O frontend foi criado com React, TypeScript e Vite para fornecer uma base tipada e um ambiente moderno de desenvolvimento e build.

```bash
npm create vite@latest frontend -- --template react-ts
```

O diretório do frontend concentra os comandos e as dependências da aplicação web.

```bash
cd frontend
```

As dependências declaradas pelo template foram instaladas para permitir o desenvolvimento e a compilação do frontend.

```bash
npm install
```

O build foi executado para confirmar que a base do frontend compila corretamente para produção.

```bash
npm run build
```

## Tailwind CSS

O Tailwind CSS foi adicionado para permitir a criação dos estilos da interface por meio de classes utilitárias integradas ao Vite.

```bash
npm install tailwindcss @tailwindcss/vite
```

## Tipografia

A fonte variável IBM Plex Sans foi adicionada de forma self-hosted para ser empacotada com a aplicação, sem depender de uma requisição externa em runtime.

```bash
npm install @fontsource-variable/ibm-plex-sans
```

## Navegação

O React Router será responsável pela navegação client-side da SPA, usando Declarative Mode para definir a estrutura de rotas com componentes React.

```bash
npm install react-router
```
