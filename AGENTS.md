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
