# Portfólio e Sistema de Ordens de Serviço

Este repositório contém o portfólio público e o sistema full stack para gestão de ordens de serviço. É o ponto de entrada para pessoas que vão executar, desenvolver ou manter o projeto.

## Estrutura

| Área        | Responsabilidade                                                                    |
| ----------- | ----------------------------------------------------------------------------------- |
| `frontend/` | Frontend original preservado durante a modularização                                      |
| `apps/sistema-os/backend/`  | API NestJS, persistência PostgreSQL, autenticação e regras de negócio               |
| `apps/site/frontend/` | Site público independente, com portfólio e estudo de caso, sem autenticação ou API |
| `apps/sistema-os/frontend/` | Frontend exclusivo do Sistema OS, com autenticação, áreas internas e geração DEMO |
| `docs/`     | Guias de configuração e mapas atualizados da estrutura, dos testes e das validações |

Os três pacotes em `apps/` possuem instalação e build independentes, sem workspaces. Arquivos privados de ambiente e artefatos antigos em `backend/` foram mantidos localmente; não são copiados, versionados nem usados automaticamente pelo backend reorganizado.

## Documentação

A modularização preserva `frontend/` como aplicação original e reúne frontend e backend do Sistema OS em `apps/sistema-os/`. Site público e frontend Sistema OS possuem escopos, dependências e configuração de publicação próprios. A DEMO continua separada do login, e a migração de produção permanece pendente.

| Documento                                            | Quando consultar                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Configuração do projeto](docs/setup.md)             | Para preparar o ambiente e entender as tecnologias configuradas               |
| [Mapa da estrutura frontend](docs/frontend-files.md) | Para localizar responsabilidades e arquivos autorais da interface             |
| [Mapa da estrutura backend](docs/backend-files.md)   | Para localizar responsabilidades e arquivos autorais da API                   |
| [Preparação do deploy](docs/deploy.md) | Para configurar os painéis, revisar o pipeline externo e preparar publicação/reversão |
| [Testes e validações](docs/testing.md)               | Para encontrar testes executáveis, resultados conhecidos e validações manuais |

## Primeiros passos

Consulte primeiro o [guia de configuração](docs/setup.md). Depois, use os mapas de arquivos para navegar pela área que será alterada e o catálogo de testes para escolher as verificações adequadas.
