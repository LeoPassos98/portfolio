# Orientações para agentes

Estas orientações definem como agentes devem alterar e documentar este repositório. São destinadas a quem implementa, revisa ou mantém o projeto.

## Sumário

- [Legibilidade humana](#legibilidade-humana)
- [Padrão de documentação Markdown](#padrão-de-documentação-markdown)
- [Documentação de configuração](#documentação-de-configuração)
- [Documentação de testes](#documentação-de-testes)
- [Commits](#commits)
- [Estilo com Tailwind](#estilo-com-tailwind)
- [Mapas de arquivos do frontend e backend](#mapas-de-arquivos-do-frontend-e-backend)
- [Mapa de arquivos do backend](#mapa-de-arquivos-do-backend)

---

## Legibilidade humana

A legibilidade humana é um requisito de aceitação para todo arquivo autoral do projeto.

Antes de concluir uma alteração, revise o arquivo como uma pessoa que não acompanhou sua implementação:

- organize o conteúdo em uma ordem previsível, do contexto geral aos detalhes;
- use nomes, títulos e seções que expressem claramente a responsabilidade de cada parte;
- mantenha funções, parágrafos e blocos de configuração curtos o suficiente para leitura contínua;
- evite repetição, acoplamento desnecessário e concentração de muitas ideias no mesmo bloco;
- prefira abstrações, componentes e seções com uma única responsabilidade compreensível;
- documente decisões e comportamentos não óbvios, mas não descreva literalmente o que o código já deixa claro;
- use tabelas, listas ou exemplos quando forem mais fáceis de consultar do que prosa;
- preserve a ordem e o estilo já adotados no arquivo;
- remova texto desatualizado, redundante ou que não ajude a entender, usar ou manter o projeto.

A revisão deve responder “sim” a estas perguntas:

1. Uma pessoa consegue entender a finalidade do arquivo rapidamente?
2. Consegue localizar a informação ou comportamento que procura?
3. Cada bloco contém uma ideia ou responsabilidade principal?
4. O texto e o código podem ser entendidos sem depender do histórico da implementação?
5. Há alguma repetição ou complexidade que poderia ser removida sem perder informação?

Se a resposta for “não”, melhore a estrutura antes de considerar a tarefa concluída.

## Padrão de documentação Markdown

Todo arquivo `.md` autoral deve seguir um padrão de leitura humana:

- começar com um título que identifique claramente o assunto;
- informar logo no início a finalidade e o público do documento;
- organizar o conteúdo em uma sequência previsível, do essencial aos detalhes;
- usar títulos e subtítulos descritivos, sem criar níveis excessivos de hierarquia;
- manter cada parágrafo focado em uma ideia principal;
- preferir listas, tabelas e exemplos quando facilitarem consulta ou comparação;
- usar blocos de código para comandos e trechos técnicos, indicando a linguagem quando aplicável;
- explicar pré-requisitos, entradas, saídas e limitações quando forem necessários para executar o procedimento;
- evitar repetir a mesma informação em diferentes seções;
- não manter instruções, resultados, nomes ou links desatualizados;
- usar português claro e consistente com o restante da documentação;
- adicionar um sumário quando o documento tiver extensão suficiente para dificultar a navegação;
- evitar texto genérico que não descreva especificamente este projeto.

Antes de concluir, revise o Markdown renderizado e confirme que uma pessoa consegue entender a finalidade do documento, localizar a informação desejada e seguir suas instruções sem depender do histórico da implementação.

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

Organize o catálogo por família funcional. Para arquivos simples, prefira uma tabela curta que concentre finalidade, cenários, regra ou risco e infraestrutura. Para suítes grandes, use uma entrada própria com cenários agrupados por operação. Registre resultados e infraestrutura compartilhados uma vez no nível da família ou da suíte, apontando apenas as exceções nas entradas; não repita uma ficha fixa para cada arquivo.

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
];
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
