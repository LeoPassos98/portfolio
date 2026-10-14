# Portfólio e Sistema de Ordens de Serviço

Este repositório contém o portfólio público e o sistema full stack para gestão de ordens de serviço. É o ponto de entrada para pessoas que vão executar, desenvolver ou manter o projeto.

## Estrutura

| Área        | Responsabilidade                                                                    |
| ----------- | ----------------------------------------------------------------------------------- |
| `apps/sistema-os/backend/`  | API NestJS, persistência PostgreSQL, autenticação e regras de negócio               |
| `apps/site/frontend/` | Site público independente, com portfólio e estudo de caso, sem autenticação ou API |
| `apps/sistema-os/frontend/` | Frontend exclusivo do Sistema OS, com autenticação, áreas internas e geração DEMO |
| `docs/`     | Guias de configuração e mapas atualizados da estrutura, dos testes e das validações |

Os três pacotes em `apps/` possuem instalação, ambiente, lockfile e build independentes, sem workspaces, biblioteca compartilhada ou imports entre aplicações. PostgreSQL e sessões permanecem no serviço separado do Northflank.

| Aplicação | Domínio publicado |
| --- | --- |
| Portfólio | https://leonardopassos.com |
| Frontend Sistema OS | https://os.leonardopassos.com |
| API Sistema OS | https://os-api.leonardopassos.com |

A publicação da modularização foi confirmada pelo responsável, com referência no commit `4e1db94`. Os diretórios antigos `frontend/` e `backend/` da raiz foram removidos; somente os três pacotes em `apps/` compõem a arquitetura executável.

## Documentação

O site funciona sem API ou autenticação. O Sistema OS mantém frontend e backend próprios em `apps/sistema-os/`, com a DEMO separada do login. O Worker antigo `portfolio`, caso ainda exista, depende de remoção manual no Cloudflare após revisão dos vínculos e da reversão; esta limpeza não altera a infraestrutura.

| Documento                                            | Quando consultar                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Configuração do projeto](docs/setup.md)             | Para preparar o ambiente e entender as tecnologias configuradas               |
| [Mapa da estrutura frontend](docs/frontend-files.md) | Para localizar responsabilidades e arquivos autorais da interface             |
| [Mapa da estrutura backend](docs/backend-files.md)   | Para localizar responsabilidades e arquivos autorais da API                   |
| [Publicação e operação](docs/deploy.md) | Para consultar diretórios, domínios, comandos e cuidados de manutenção/reversão |
| [Testes e validações](docs/testing.md)               | Para encontrar testes executáveis, resultados conhecidos e validações manuais |

## Primeiros passos

Consulte primeiro o [guia de configuração](docs/setup.md). Depois, use os mapas de arquivos para navegar pela área que será alterada e o catálogo de testes para escolher as verificações adequadas.
