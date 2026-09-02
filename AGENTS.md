# Orientações para agentes

## Documentação de configuração

Sempre que uma tecnologia, ferramenta ou configuração estrutural for adicionada ao projeto, atualize `docs/setup.md` com:

- o comando relevante usado para instalação ou configuração;
- uma explicação curta do motivo daquela tecnologia ou configuração existir no projeto.

Não registrar comandos de inspeção ou verificação temporária.

## Documentação de testes

### Fonte documental

`docs/testing.md` é o catálogo oficial dos testes e validações concretas do projeto. Os arquivos de teste continuam sendo a fonte executável; o catálogo indica onde estão, o que comprovam e por que existem.

### Quando atualizar

Atualize `docs/testing.md` na mesma tarefa, antes do commit final, quando aplicável, sempre que ela:

- criar ou remover um arquivo de teste autoral;
- adicionar, remover ou alterar substancialmente cenários relevantes de um arquivo existente;
- mudar a finalidade de um arquivo de teste;
- introduzir uma nova forma concreta de validação;
- executar e consolidar uma auditoria, smoke ou validação de navegador relevante que mereça registro.

Quando novos casos relevantes forem adicionados a um arquivo já catalogado, atualize a entrada existente em vez de criar uma entrada histórica duplicada.

### O que registrar

Para testes automatizados, registre o caminho exato, a finalidade, os cenários relevantes, a justificativa, as regras ou comportamentos comprovados, a infraestrutura importante, o resultado conhecido e observações ou limitações quando existirem.

Para validações manuais, registre o fluxo validado, o motivo, o resultado, o marco ou commit relevante e observações úteis.

### O que não fazer

- não transformar `docs/testing.md` em tutorial genérico;
- não explicar apenas conceitos como “o que é teste unitário”;
- não listar testes que não existem;
- não copiar integralmente o código dos testes;
- não atualizar apenas o contador sem atualizar algo que melhore a compreensão;
- não substituir os arquivos de teste como fonte executável.

## Commits

- Cada commit deve representar uma única mudança lógica.
- Não misturar funcionalidades, documentação, configuração ou refatorações não relacionadas no mesmo commit.
- Usar Conventional Commits quando aplicável:
  - feat: nova funcionalidade;
  - fix: correção;
  - docs: documentação;
  - test: testes;
  - refactor: refatoração sem mudança de comportamento;
  - chore: configuração, infraestrutura ou manutenção.
- Antes de criar um commit, revisar as alterações que serão incluídas.
- Não criar commits automaticamente, a menos que isso tenha sido explicitamente solicitado.
- Não fazer push automaticamente, a menos que isso tenha sido explicitamente solicitado.

## Estilo com Tailwind

Ao montar `className` através de arrays:

- cada classe utilitária do Tailwind deve ficar em uma string separada;
- cada item deve ficar em sua própria linha;
- não agrupar várias classes Tailwind dentro da mesma string.

Essa regra existe para melhorar leitura, revisão e manutenção.

```tsx
const classes = [
  'bg-primary',
  'hover:bg-primary-hover',
  'focus-visible:ring-primary',
  'mt-6',
  'rounded-ui',
  'px-4',
  'py-2',
  'text-white',
  'focus-visible:ring-2',
  'focus-visible:ring-offset-2',
  'focus-visible:outline-none',
  className,
]
```

## Mapas de arquivos do frontend e backend

Sempre que um novo arquivo ou diretório autoral do frontend tiver responsabilidade relevante na estrutura, no comportamento ou na interface da aplicação, atualize `docs/frontend-files.md`.

O documento deve:

- registrar o caminho completo;
- organizar as entradas por famílias funcionais ou estruturais;
- possuir uma visão rápida com as quantidades de arquivos e um sumário para as famílias;
- usar diretórios como contexto para organizar as seções, sem numerá-los como arquivos;
- documentar e numerar os arquivos relevantes dentro de suas respectivas famílias;
- manter descrições curtas e orientadas à responsabilidade atual de cada arquivo;
- quando fizer sentido, mencionar onde ele é utilizado ou como participa da aplicação;
- dentro de cada família, preservar a ordem de criação;
- atualizar a entrada existente quando a responsabilidade mudar, sem criar um histórico de alterações.

Não registrar:

- `node_modules`;
- `dist`;
- arquivos gerados automaticamente por instalação;
- `package.json` ou `package-lock.json`;
- arquivos puramente padrões ou de infraestrutura sem responsabilidade específica na aplicação;
- assets ou arquivos sem função arquitetural relevante.

O objetivo de `docs/frontend-files.md` é servir como um mapa do estado atual do frontend, sem explicar implementações linha por linha.

## Mapa de arquivos do backend

Sempre que um novo arquivo ou diretório autoral relevante do backend tiver responsabilidade criada ou alterada na estrutura, no comportamento ou na infraestrutura técnica da aplicação, atualize `docs/backend-files.md`.

Esta regra abrange arquivos relacionados a:

- backend NestJS;
- banco de dados e persistência;
- autenticação e segurança;
- integrações externas;
- infraestrutura técnica relacionada ao backend;
- módulos e features do backend;
- testes autorais relevantes.

O documento deve:

- registrar o caminho completo;
- organizar as entradas por famílias funcionais ou estruturais;
- possuir uma visão rápida com as quantidades de arquivos e um sumário para as famílias;
- usar diretórios como contexto para organizar as seções, sem numerá-los como arquivos;
- documentar e numerar os arquivos relevantes dentro de suas respectivas famílias;
- manter descrições curtas e orientadas à responsabilidade atual de cada arquivo;
- quando fizer sentido, mencionar onde ele é utilizado ou como participa da aplicação;
- dentro de cada família, preservar a ordem de criação;
- atualizar a entrada existente quando a responsabilidade mudar, sem criar um histórico de alterações.

Não registrar:

- `node_modules`;
- `dist`;
- arquivos gerados automaticamente por instalação;
- `package.json` ou `package-lock.json`;
- artefatos de build, caches ou arquivos temporários;
- arquivos puramente padrões ou de infraestrutura sem responsabilidade específica na aplicação;
- assets ou arquivos sem função arquitetural relevante.

O objetivo de `docs/backend-files.md` é servir como um mapa do estado atual do backend, sem explicar implementações linha por linha.
