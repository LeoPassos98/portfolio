# Base visual do portfólio e histórico do Design Lab

Este documento orienta quem desenvolve e revisa a identidade de Leonardo Passos. Em 26/10/2026, o usuário aprovou todo o conteúdo atual do Design Lab e autorizou sua aplicação no site. A Home e o estudo de caso passam a usar essa base, preservando suas seções, conteúdo e destinos de navegação. A página temporária e seus arquivos foram removidos a pedido do usuário após a adoção dessa base. Este documento preserva os tokens e o histórico de decisões; não há catálogo executável.

## Sumário

- [Encerramento do laboratório](#encerramento-do-laboratório)
- [Aplicação no site](#aplicação-no-site)
- [Tokens atuais](#tokens-atuais)
- [Consulta e edição de cores](#consulta-e-edição-de-cores)
- [Catálogo histórico](#catálogo-histórico)
- [Decisões e revisão](#decisões-e-revisão)
- [Pendências e limites](#pendências-e-limites)

## Encerramento do laboratório

O Design Lab foi encerrado após a aplicação da identidade à Home e ao estudo de caso. Foram removidos `src/features/design-lab/`, a rota condicional e a importação dinâmica em `App.tsx`, além da exclusão de detecção do Tailwind que atendia a essa pasta. `/design-lab` agora usa o fallback da Home nos dois ambientes.

Os tokens de `src/styles/tokens.css`, os estilos públicos de `src/styles/site.css`, os componentes de `src/components/ui/PortfolioUI.tsx` e os SVGs autorais permanecem no site. Nenhum componente público depende dos arquivos removidos. Não há dependências novas, API, autenticação ou banco.

## Aplicação no site

| Arquivo | Responsabilidade |
| --- | --- |
| `apps/site/frontend/src/styles/tokens.css` | Fonte única dos valores aprovados: marca, temas, texto, ações, superfícies, espaçamento, tipografia, raios, sombras e movimento |
| `apps/site/frontend/src/index.css` | Importa a fundação e associa utilitários semânticos do Tailwind aos tokens; desativa sua paleta padrão |
| `apps/site/frontend/src/styles/site.css` | Composição pública, escala H1–H6, foco, botões, cards, badges, header, menu e footer |
| `apps/site/frontend/src/components/ui/PortfolioUI.tsx` | `ActionLink`, `Button`, `Card`, `Badge` e seta compartilhada; propriedades nativas e variantes de ações |
| `apps/site/frontend/src/components/layout/PublicLayout.tsx` | Marca estática, navegação responsiva, indicação de seção, tema persistente, skip link e rodapé |

`.portfolio-theme` delimita um tema; `data-theme="dark"` ativa os valores escuros. Cada escopo redefine a fundação para permitir blocos escuros dentro de páginas claras. Componentes usam `var(--site-...)` ou utilitários como `bg-surface`, `text-heading` e `border-border`; cores literais ficam somente na camada de tokens. Os SVGs autorais mantêm seus próprios gradientes.

A preferência inicial segue o sistema quando não há escolha salva. O botão Claro/Escuro muda o tema imediatamente e salva somente essa preferência em `localStorage`, na chave `portfolio-theme`. Sem armazenamento disponível, o controle continua funcionando durante a visita. O rodapé e as composições de destaque escuras mantêm seus próprios escopos para preservar contraste.

O header público foi adaptado a partir da estrutura de navbar Raycast fornecida pelo usuário: marca à esquerda, navegação no centro geométrico e ações à direita. Usa superfície com 45% de transparência, borda de 2 px (`--site-header-border-width`) com iluminação de cima para baixo, contraste suavizado no dark e cor de contorno semântico (`--site-header-border-color`), sombra por tokens, troca de tema por ícone à direita e logo colorido nos dois temas. No compacto, o grupo da marca inclui um botão real de menu. O CTA “Acessar sistema” foi retirado do header e do disclosure por solicitação do usuário; os CTAs de conteúdo continuam disponíveis. Esta variação pública está em avaliação visual e preserva a largura de 1180 px e os SVGs autorais.

O início da Home e do estudo de caso compartilha o fundo da página (`.site-hero` / `--site-bg`), evitando uma faixa de outra cor abaixo do header. A linha horizontal de gradiente foi retirada desse limite; o token da mistura permanece na fundação visual. As elevações usam a mesma composição nos dois temas: contorno sutil mais sombra projetada; apenas as cores/intensidades variam pelos tokens `--site-elevation-edge`, `--site-shadow-color` e `--site-shadow-raised-color`. Transparência, blur, raios, espessuras e movimento seguem regras comuns.

Formulários, modal, toast, skeleton e estados demonstrativos faziam parte do catálogo removido. Seus IDs permanecem apenas no histórico; a Home não recebeu essas funcionalidades ou integrações.

## Tokens atuais

A fonte de verdade é `apps/site/frontend/src/styles/tokens.css`. Nomes representam funções; links e botões têm papéis independentes.

### Cores semânticas

| Papel / token | Claro | Escuro |
| --- | --- | --- |
| Fundo / `--site-bg` | `#E8EDF4` | `#0B1020` |
| Superfície / `--site-surface` | `#FFFFFF` | `#151C2E` |
| Superfície elevada / `--site-surface-raised` | `#DCE4EF` | `#293650` |
| Texto / `--site-text` | `#111827` | `#F8FAFC` |
| Links, foco e indicadores / `--site-primary` | `#123091` | `#91A7FF` |
| Botão primário e texto terciário / `--site-button-primary` | `#202C4C` | `#91A7FF` |
| Hover dos botões / `--site-button-primary-hover` | `#2D406E` | `#B6C5FF` |
| Títulos / `--site-heading` | `#202C4C` (aprovado) | `#C6D2FF` (aprovado) |
| Borda estrutural / `--site-border` | `#E2E8F0` | `#2A344C` |
| Superfície auxiliar / `--site-surface-soft` | `#F1F5F9` | `#1C263C` |
| Texto auxiliar / `--site-muted` | `#526176` | `#ADB9CD` |
| Hover de links / `--site-primary-hover` | `#0D2470` | `#B6C5FF` |
| Texto sobre ação / `--site-on-primary` | `#FFFFFF` | `#0B1020` |
| Contorno de controle / `--site-control-border` | `#718096` | `#7889A6` |
| Sucesso / texto e fundo | `#166534` / `#F0FDF4` | `#86EFAC` / `#152E27` |
| Erro / texto e fundo | `#991B1B` / `#FEF2F2` | `#FCA5A5` / `#361F2B` |
| Atenção / texto e fundo | `#854D0E` / `#FEFCE8` | `#FDE68A` / `#332C20` |
| Informação / fundo | `#EEF2FF` | `#202C4C` |


As quatro cores de identidade são `--site-brand-orange: #FF6805`, `--site-brand-pink: #D94072`, `--site-brand-purple: #4B2FC8` e `--site-brand-blue: #123091`. São referências autorais, usadas com moderação. `--site-gradient-support` mistura laranja → rosa → azul escuro continuamente, com stops em 0%, 33% e 100%; as proporções iniciais 33/20/47 orientam o equilíbrio visual, sem faixas rígidas. Gradientes dos SVGs permanecem intactos.

ID-03 usa uma cor própria para a elevação: `#DCE4EF` no claro e `#293650` no escuro, além de sombra. A nova distinção foi incluída no aceite geral. Títulos usam `#202C4C` / `#C6D2FF`; corpo, auxílio e links usam funções próprias. Branco, azul profundo, noturno e azul claro são bases reutilizadas por aliases semânticos. Sombras e sobreposição também são tokens por tema.

### Tipografia, dimensões e comportamento

| Família | Base adotada |
| --- | --- |
| Fonte | IBM Plex Sans Variable já instalada; monospace nativa para código |
| Texto | 12, 14, 16, 18, 24 e 32 px; H1 a H6 seguem a escala aprovada |
| Hierarquia | Corpo com entrelinha 1,65; títulos 1,15 e peso 600 |
| Espaçamento | `--site-space-1` a `--site-space-8`: 4, 8, 12, 16, 24, 32, 48 e 64 px; escala Tailwind vinculada à unidade de 4 px |
| Raios | 6 px, controles de 10 px, cards de 16 px e pill |
| Elevação | Contorno e sombra nas duas variantes; geometria compartilhada e cores/intensidades semânticas por tema |
| Header | Borda de 2 px com iluminação superior; transparência de 45% e blur comuns aos temas |
| Ações | Variantes primária, secundária e terciária; alturas 36, 44 e 52 px |
| Foco | Contorno semântico de 3 px com afastamento de 3 px |
| Estados | Hover, active, disabled e loading; botões bloqueiam repetição durante loading |
| Movimento | Transições de 160 ms, carregamento de 900 ms; redução de movimento respeitada |
| Containers | Leitura até 42 rem; container até 1180 px, centralizado, com espaçamento interno de 24 px (`--site-content-gutter`), seguindo o layout principal do Sistema OS |
| Responsividade | Navegação compacta abaixo de 48 rem; composições largas a partir de 64 rem |

O padrão horizontal foi conferido em `apps/sistema-os/frontend/src/components/layout/AppLayout.tsx`: limite externo de 1180 px e conteúdo com padding de 24 px. No portfólio, o espaçamento fica dentro dos containers, sem margens externas adicionais nas seções, no header ou no footer. Isso mantém a mesma largura de referência também em viewports menores que o limite. O código do Sistema OS permanece independente e inalterado.

Breakpoints de CSS ficam literais nas media queries, pois variáveis não funcionam nessas condições. Menu público usa disclosure, fecha com Escape e devolve foco ao acionador; também fecha ao clicar fora ou voltar à largura desktop. Os links do Sistema OS continuam apontando para `/login` na aplicação separada.

## Consulta e edição de cores

Consulte os valores e papéis em `src/styles/tokens.css`. Pelo F12, selecione `.portfolio-theme` no site e ajuste temporariamente uma variável `--site-*`; recarregar remove a alteração. Para registrar uma proposta, informe variável, tema, valor e componente.

A paleta interativa, as legendas dinâmicas, os aliases `--dl-*` e o hook de leitura pertenciam à página temporária e foram removidos. Não existe editor de cores ou persistência dessas alterações na aplicação.

## Catálogo histórico

O catálogo removido continha 35 amostras e a composição `BASE-01`. A tabela conserva os IDs para interpretar as decisões anteriores; não aponta para componentes executáveis atuais.

| Parte | Conteúdo | Referências |
| --- | --- | --- |
| 01 — Cores e leitura | Composição clara/escura; fundo, superfície e elevação | `BASE-01`, `ID-03` |
| 02 — Marca e identidade | SVGs autorais, paleta e gradiente | `ID-01`, `ID-02`, `ID-04` |
| 03 — Tipografia | H1–H6, corpo, auxílio, link, código e destaque | `TYPE-01`, `TYPE-02` |
| 04 — Botões e links | Hierarquia, tamanhos, ícones e estados | `BTN-01` a `BTN-03` |
| 05 — Navegação | Header, menu, tema, breadcrumb, sequência e topo | `NAV-01` a `NAV-03` |
| 06 — Cards e containers | Projetos, técnica, informação, destaque e contato | `CARD-01` a `CARD-07` |
| 07 — Formulários | Campos, labels, seleção, validação e disabled | `FORM-01`, `FORM-02` |
| 08 — Feedback e estados | Alertas, badges, toast, tooltip, modal, spinner, skeleton e vazio | `FDB-01` a `FDB-04` |
| 09 — Conteúdo e layout | Listas, código, tecnologias, etapas, grids e composições | `CNT-01` a `CNT-03`, `LAY-01` a `LAY-04` |
| 10 — Rodapé | Navegação, contatos profissionais e organização responsiva | `FTR-01` a `FTR-03` |

## Decisões e revisão

Em 26/10/2026, o usuário rejeitou o catálogo longo por falta de clareza, especialmente nas cores das fontes. A versão 2 passou a mostrar uma parte por vez e a composição clara/escura com legenda. Após ajustar a elevação de ID-03, o usuário afirmou: “eu gostei de todas as informações do http://localhost:5174/design-lab, pode aplicar e tornar realidade na aplicação base”. Esse aceite aprova a versão atual nos dois temas, incluindo hovers, superfícies, tipografia e demais famílias, e autoriza a aplicação à Home e ao estudo de caso.

| Decisão atual | Estado | Consequência |
| --- | --- | --- |
| Catálogo longo anterior | Rejeitado | Substituído pela revisão por partes |
| Versão 2 e suas amostras | Aprovado | Base adotada no site; página temporária removida posteriormente |
| Tokens compartilhados e cores por referência | Aprovado | Diretriz explícita do pedido de aplicação; sem paleta duplicada |
| Fonte IBM Plex Sans e escala atual | Aprovado | Adotadas como base; alterações futuras podem ser revisadas |
| Aplicação às páginas públicas | Aprovado | Estrutura e conteúdo preservados, identidade aplicada |
| Novos componentes ou mudanças futuras | Em avaliação | O aceite cobre a versão atual, não aprova propostas futuras automaticamente |

O histórico abaixo distingue propostas substituídas das escolhas incorporadas à base. As linhas de ID-03 e BTN-01 receberam o aceite geral posterior; decisões rejeitadas permanecem registradas. Estados possíveis: **Em avaliação**, **Aprovado**, **Revisar** e **Rejeitado**.

| Referência | Estado | Feedback / decisão | Substitui ou é substituído por |
| --- | --- | --- | --- |
| ID-01 · placa branca no tema escuro | Rejeitado | O usuário dispõe de versão do logo com nome branco; a placa clara não deve ser necessária | Superfícies do próprio tema, sem placa clara |
| ID-01 · apresentação nos dois temas da versão 2 | Aprovado | Usuário: “aprovado em dark e light”; preservados os SVGs atuais, colorido no claro e todo branco no escuro | SVG com símbolo colorido e nome branco poderá ser incorporado quando fornecido |
| ID-02 · quatro cores da identidade | Aprovado | Usuário: “gostei das cores”; valores preservados nos dois temas | — |
| ID-03 · contraste no modo escuro | Aprovado | Usuário: “no modo escuro está bom o contraste”; tokens escuros preservados | — |
| ID-03 · fundo claro anterior `#F8FAFC` | Revisar | Usuário considerou o background claro demais | Nova proposta `#E8EDF4` |
| ID-03 · fundos, superfícies e elevação anteriores | Revisar | Houve aprovação anterior; na versão 2 o usuário considerou surface e elevated surface próximos demais nos dois temas | Fundo e superfície principal preservados; nova elevação abaixo |
| ID-03 · camada elevada com cor própria | Aprovado | `#DCE4EF` no claro e `#293650` no escuro, além da sombra; antes as duas camadas usavam a mesma cor | Substitui a elevação diferenciada somente por sombra |
| ID-04 · azul → roxo | Rejeitado | Usuário considerou o gradiente leve, com cores parecidas | Nova proposta laranja → roxo |
| ID-04 · laranja → roxo | Revisar | Usuário percebeu laranja em excesso e pediu outra distribuição de cores | Substituído por laranja 33%, rosa 20% e azul escuro 47% |
| ID-04 · faixas 33/20/47 com transições estreitas | Revisar | Usuário esclareceu que as proporções eram aproximadas e que a mistura ficou rígida | Substituído por mistura contínua |
| ID-04 · mistura contínua laranja → rosa → azul escuro | Aprovado | Usuário: “aprovado em dark e light” na versão 2; mistura e stops preservados | Substitui as faixas rígidas 33/20/47 |
| TYPE-01 · escala H1–H6 | Aprovado | Usuário aprovou os tamanhos; escala, pesos e espaçamentos preservados | — |
| TYPE-01 · título claro anterior `#0B1020` | Revisar | Usuário considerou o tom praticamente preto sobre branco | Substituído por `#202C4C` |
| TYPE-01 · título claro `#202C4C` | Aprovado | Usuário: “gostei da cor = #202c4c”; substitui o tom anterior, preservando escala e TYPE-02 | Substitui `#0B1020` somente em TYPE-01 claro |
| TYPE-01 · título escuro anterior `#91A7FF` | Revisar | Usuário definiu e aprovou `#C6D2FF` para os títulos escuros | Substituído por `#C6D2FF` |
| TYPE-01 · título escuro `#C6D2FF` | Aprovado | Usuário: “#c6d2ff no modo dark ta aprovado”; escala preservada | Substitui `#91A7FF` somente nos títulos |
| TYPE-02 · leitura e hierarquia | Aprovado | Usuário: “ok”; composição, cores e estilos de leitura preservados | — |
| BTN-01 · base escura | Aprovado | Usuário aprovou as cores; preenchimento `#91A7FF` preservado | — |
| BTN-01 · base clara `#202C4C` | Aprovado | Cor solicitada aplicada aos botões primário e terciário, sem alterar links, foco ou indicadores | Substitui a referência `--dl-primary` dentro dessas variantes |
| BTN-01 · hover claro `#2D406E` e escuro `#B6C5FF` | Aprovado | Família de azul aprovada no aceite geral da versão 2; contraste verificado | Substituem os hovers anteriores dos botões |
| BTN-02 · tamanhos pequeno, médio e grande | Aprovado | Usuário: “tamanhos ok”; alturas e espaçamentos preservados. Ícones e ação externa incluídos no aceite geral posterior | — |
| BTN-03 · comportamentos e estados | Aprovado | Usuário aprovou os estados. Foco, active, disabled e loading preservados; as cores de hover foram incluídas no aceite geral posterior | — |

## Pendências e limites

- O header usa o SVG colorido nos dois temas, por solicitação posterior do usuário; o rodapé conserva a versão branca. Uma versão autoral adicional poderá ser incorporada quando fornecida.
- Receber foto profissional, capturas reais do Sistema OS e destinos de e-mail, LinkedIn e WhatsApp. Os espaços existentes continuam identificados como pendentes; nenhum contato foi inventado.
- Formulários e feedback do antigo laboratório não enviavam dados e foram removidos. Somente a preferência de tema do site é persistida.
- Novos ajustes devem manter os IDs e registrar tema, variante e decisão. A aprovação atual não equivale a uma auditoria integral de acessibilidade.
- Validação local cobre Chromium e tamanhos emulados; Safari, Firefox, leitor de tela e dispositivo físico permanecem fora dessa verificação.

Animação artística, Sistema OS, backend e alterações de infraestrutura permanecem fora deste trabalho. O usuário autorizou commit e push do estado final; a publicação segue a configuração externa do repositório. Resultados estão no [catálogo de validações](testing.md#aplicação-da-base-visual-aprovada-ao-site).
