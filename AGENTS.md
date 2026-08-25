# Orientações para agentes

## Documentação de configuração

Sempre que uma tecnologia, ferramenta ou configuração estrutural for adicionada ao projeto, atualize `docs/setup.md` com:

- o comando relevante usado para instalação ou configuração;
- uma explicação curta do motivo daquela tecnologia ou configuração existir no projeto.

Não registrar comandos de inspeção ou verificação temporária.

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

## Mapa de arquivos do frontend

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
