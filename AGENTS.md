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
