import { useEffect } from "react";
import { ActionLink, ArrowIcon } from "../../../components/ui/PortfolioUI";
import { PublicLayout } from "../../../components/layout/PublicLayout";
import { osLoginUrl } from "../../../shared/lib/osLinks";
import loginScreenshot from "../../../assets/projects/sistema-os/login-demo-desktop.webp";
import dashboardScreenshot from "../../../assets/projects/sistema-os/dashboard-desktop.webp";
import ordersScreenshot from "../../../assets/projects/sistema-os/ordens-servico-desktop.webp";
import orderHistoryScreenshot from "../../../assets/projects/sistema-os/ordem-historico-desktop.webp";
import clientsScreenshot from "../../../assets/projects/sistema-os/clientes-desktop.webp";
import mobileClientsScreenshot from "../../../assets/projects/sistema-os/clientes-mobile.webp";

function ProjectHero() {
  return (
    <section className="site-hero px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto site-container">
        <a
          href="/#projetos"
          className="site-text-link inline-flex items-center gap-2 text-sm"
        >
          <span aria-hidden="true">←</span>
          Voltar aos projetos
        </a>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
              Estudo de caso
            </p>
            <h1 className="text-heading mt-5 max-w-4xl">
              Sistema de Gestão de Ordens de Serviço
            </h1>
            <p className="text-foreground mt-6 max-w-3xl text-lg leading-8 sm:text-xl">
              Um projeto autoral para centralizar clientes, funcionários e ordens
              de serviço, desenvolvido a partir de um cenário simulado.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ActionLink href={osLoginUrl} variant="primary">
                Testar aplicação
                <ArrowIcon />
              </ActionLink>
              <ActionLink
                href="https://github.com/LeoPassos98/portfolio"
                target="_blank"
                rel="noreferrer"
                variant="secondary"
              >
                Ver código no GitHub <span aria-hidden="true">↗</span>
              </ActionLink>
            </div>
          </div>

          <dl className="border-border grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3 lg:grid-cols-1">
            <div className="bg-surface p-5">
              <dt className="text-neutral text-xs font-semibold tracking-wider uppercase">
                Tipo
              </dt>
              <dd className="text-foreground mt-2 font-semibold">
                Projeto autoral full stack
              </dd>
            </div>
            <div className="bg-surface p-5">
              <dt className="text-neutral text-xs font-semibold tracking-wider uppercase">
                Responsabilidade
              </dt>
              <dd className="text-foreground mt-2 font-semibold">
                Produto, interface e backend
              </dd>
            </div>
            <div className="bg-surface p-5">
              <dt className="text-neutral text-xs font-semibold tracking-wider uppercase">
                Contexto
              </dt>
              <dd className="text-foreground mt-2 font-semibold">
                Cenário simulado
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

type ProjectScreen = {
  image: string;
  title: string;
  alt: string;
  description: string;
  width: number;
  height: number;
};

const projectScreens = {
  mobile: {
    image: mobileClientsScreenshot,
    title: "Clientes no celular",
    alt: "Consulta de clientes em um celular, com busca, filtro de status e cartões de clientes fictícios.",
    description: "A consulta de clientes se adapta a cartões em telas menores.",
    width: 390,
    height: 844,
  },
  login: {
    image: loginScreenshot,
    title: "Login e acesso DEMO",
    alt: "Login ao lado do gerador DEMO, com opções de dados de exemplo e ambiente vazio.",
    description: "Login e geração de acesso temporário na mesma página.",
    width: 1440,
    height: 900,
  },
  history: {
    image: orderHistoryScreenshot,
    title: "Detalhes e histórico",
    alt: "Serviço concluído com resumo operacional e versão anterior preservada, incluindo autor e responsável.",
    description: "O histórico apresenta uma versão anterior da ordem de serviço.",
    width: 1440,
    height: 900,
  },
  dashboard: {
    image: dashboardScreenshot,
    title: "Visão operacional",
    alt: "Dashboard da DEMO com indicadores de clientes, funcionários, ordens em aberto e desempenho.",
    description: "Situação atual da operação e desempenho do período selecionado.",
    width: 1440,
    height: 900,
  },
  orders: {
    image: ordersScreenshot,
    title: "Ordens de serviço",
    alt: "Listagem de ordens com cliente, status, responsável, data, valor, filtros e paginação.",
    description: "Busca e filtros de status, responsável e período na listagem.",
    width: 1440,
    height: 900,
  },
  clients: {
    image: clientsScreenshot,
    title: "Gerenciamento de clientes",
    alt: "Tabela de clientes fictícios ativos, com contatos, busca e acesso ao cadastro.",
    description: "Clientes, contatos e situação cadastral reunidos em uma consulta.",
    width: 1440,
    height: 900,
  },
} satisfies Record<string, ProjectScreen>;

function ProjectScreenshot({ screen }: { screen: ProjectScreen }) {
  const portrait = screen.height > screen.width;

  return (
    <a
      href={screen.image}
      target="_blank"
      rel="noreferrer"
      aria-label={`Ampliar imagem: ${screen.title} (nova aba)`}
      className="group block overflow-hidden rounded-2xl border border-border bg-background hover:border-primary focus-visible:outline-offset-[-4px]"
    >
      <figure
        className={
          portrait
            ? "grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 p-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6 sm:p-6"
            : undefined
        }
      >
        <img
          src={screen.image}
          alt={screen.alt}
          width={screen.width}
          height={screen.height}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        <figcaption className={portrait ? "min-w-0" : "p-5"}>
          <p className="text-heading font-semibold">{screen.title}</p>
          <p className="text-foreground mt-2 text-sm leading-6">
            {screen.description}
          </p>
          <span className="text-primary mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold group-hover:underline">
            Ampliar imagem
            <span aria-hidden="true">↗</span>
          </span>
        </figcaption>
      </figure>
    </a>
  );
}

function ProjectOverview() {
  return (
    <section aria-labelledby="project-context-title">
      <div className="mx-auto site-container">
        <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
          Contexto e abordagem
        </p>
        <h2 id="project-context-title" className="text-heading mt-4 max-w-2xl">
          Organizar a operação antes de escolher a tecnologia.
        </h2>

        <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="text-heading">O problema do cenário</h3>
            <p className="text-foreground mt-4 leading-7">
              Em um cenário simulado de uma pequena empresa prestadora de
              serviços, informações sobre clientes, funcionários e serviços
              ficam dispersas entre planilhas, mensagens e anotações.
            </p>
            <p className="text-foreground mt-3 leading-7">
              O objetivo foi centralizar essas informações, organizar o
              trabalho e oferecer uma experiência simples para seus usuários.
            </p>
          </div>
          <div>
            <h3 className="text-heading">Minha abordagem</h3>
            <p className="text-foreground mt-4 leading-7">
              Comecei pelo levantamento e pela organização das necessidades.
              Elas foram transformadas em requisitos funcionais e não
              funcionais, regras de negócio, modelos de dados e fluxos de
              navegação.
            </p>
            <p className="text-foreground mt-3 leading-7">
              A separação entre administradores e funcionários se traduziu em
              permissões na API; o acesso de visitantes, em ambientes isolados.
              Essas regras orientaram a implementação e os cenários de teste.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectChallenges() {
  const challenges = [
    {
      id: "experiencia-do-usuario",
      title: "Experiência do usuário",
      problem:
        "Oferecer funcionalidades administrativas sem tornar os fluxos de navegação e operação desnecessariamente complexos.",
      decision:
        "Organizar as telas por responsabilidades, apresentar ações conforme as permissões e utilizar feedbacks claros para orientar o usuário.",
      example:
        "Na consulta de clientes, busca e filtro de status permanecem visíveis no celular, enquanto os registros são apresentados em cartões.",
      screen: projectScreens.mobile,
    },
    {
      id: "seguranca-e-controle-de-acesso",
      title: "Segurança e controle de acesso",
      problem:
        "Permitir que funcionários e administradores utilizem o mesmo sistema, respeitando diferentes níveis de permissão.",
      decision:
        "Implementar autenticação por sessões persistidas no PostgreSQL, proteção CSRF e autorização no backend, utilizando o NestJS.",
      reasoning:
        "O acesso precisa poder ser encerrado quando uma conta é inativada ou muda de perfil. A persistência das sessões permite revogá-las no servidor. A API também verifica o perfil nas operações restritas: ocultar uma ação na interface não basta para impedir uma requisição sem permissão.",
      references: [
        {
          label: "Sessões no PostgreSQL",
          path: "auth/session/session-store.service.ts",
        },
        {
          label: "Proteção CSRF",
          path: "auth/guards/csrf.guard.ts",
        },
        {
          label: "Autorização por perfil",
          path: "auth/guards/role.guard.ts",
        },
      ],
    },
    {
      id: "demonstracao-segura",
      title: "Demonstração segura",
      problem:
        "Permitir que visitantes experimentem funcionalidades reais sem interferir nos ambientes de outros usuários.",
      decision:
        "Criar ambientes demonstrativos isolados e temporários, com dados de exemplo ou vazios, expiração e limites de utilização.",
      reasoning:
        "Para permitir alterações reais durante o teste, cada acesso DEMO recebe seu próprio ambiente. O backend identifica esse ambiente pela conta autenticada e restringe as consultas e alterações a ele. Assim, o visitante pode explorar cadastros e ordens sem acessar os registros de outra demonstração; a expiração e os limites controlam o uso dos recursos.",
      example:
        "A geração de acesso DEMO foi integrada à página de login, permitindo experimentar o sistema sem criar um segundo fluxo de autenticação.",
      screen: projectScreens.login,
    },
    {
      id: "historico-e-integridade",
      title: "Histórico e integridade",
      problem:
        "Preservar a rastreabilidade das alterações realizadas nas ordens de serviço.",
      decision:
        "Implementar histórico de versões por snapshots, regras de transição de estados e validações de integridade no banco de dados.",
      screen: projectScreens.history,
    },
  ];

  return (
    <section
      id="desafios"
      aria-labelledby="project-challenges-title"
      className="border-y border-border bg-surface"
    >
      <div className="mx-auto site-container">
        <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
          Desafios e decisões
        </p>
        <h2 id="project-challenges-title" className="text-heading mt-4 max-w-2xl">
          As decisões por trás da aplicação.
        </h2>
        <p className="text-foreground mt-4 max-w-2xl leading-7">
          Quatro desafios orientaram a experiência de uso e a arquitetura.
          As capturas mostram a aplicação real, com dados fictícios da DEMO.
        </p>

        <div className="mt-10 divide-y divide-border">
          {challenges.map((challenge, index) => (
            <article
              key={challenge.id}
              id={challenge.id}
              aria-labelledby={`${challenge.id}-title`}
              className="scroll-mt-28 py-8 first:pt-0 last:pb-0"
            >
              <div
                className={
                  challenge.screen
                    ? "grid items-start gap-6 lg:grid-cols-2 lg:gap-12"
                    : undefined
                }
              >
                <div>
                  <p className="text-primary text-xs font-semibold site-eyebrow uppercase">
                    Desafio {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 id={`${challenge.id}-title`} className="text-heading mt-3">
                    {challenge.title}
                  </h3>
                  <dl
                    className={
                      challenge.screen
                        ? "mt-5 grid gap-5"
                        : "mt-5 grid gap-5 md:grid-cols-2 md:gap-12"
                    }
                  >
                    <div>
                      <dt className="text-foreground font-semibold">Problema</dt>
                      <dd className="text-foreground mt-2 leading-7">
                        {challenge.problem}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-foreground font-semibold">Decisão</dt>
                      <dd className="text-foreground mt-2 leading-7">
                        {challenge.decision}
                      </dd>
                    </div>
                  </dl>
                  {challenge.reasoning && (
                    <p className="text-foreground mt-5 max-w-3xl leading-7">
                      {challenge.reasoning}
                    </p>
                  )}
                  {challenge.example && (
                    <p className="text-foreground mt-5 text-sm leading-6">
                      {challenge.example}
                    </p>
                  )}
                  {challenge.references && (
                    <aside
                      aria-labelledby="security-references-title"
                      className="mt-6 rounded-xl border border-border bg-background p-5"
                    >
                      <h4 id="security-references-title" className="text-heading">
                        Evidências no código
                      </h4>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                        {challenge.references.map((reference) => (
                          <li key={reference.path}>
                            <a
                              href={`https://github.com/LeoPassos98/portfolio/blob/main/apps/sistema-os/backend/src/${reference.path}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Ver código: ${reference.label} (nova aba)`}
                              className="site-text-link inline-flex min-h-11 items-center gap-2 text-sm leading-6"
                            >
                              {reference.label}
                              <span aria-hidden="true">↗</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </aside>
                  )}
                </div>
                {challenge.screen && (
                  <ProjectScreenshot screen={challenge.screen} />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectResult() {
  const capabilities = [
    "Clientes, funcionários e ordens de serviço reunidos para consultar as informações operacionais em um só lugar.",
    "Dashboards, busca e filtros para localizar registros e acompanhar a situação dos serviços.",
    "Perfis e permissões para separar ações administrativas das atividades dos funcionários, com controle na API.",
    "Histórico de versões para consultar o estado anterior de uma ordem e identificar o autor da alteração.",
    "DEMO isolada para experimentar o produto com dados fictícios ou começar com um ambiente vazio.",
  ];

  return (
    <section id="resultado" aria-labelledby="project-result-title">
      <div className="mx-auto site-container">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
              Resultado
            </p>
            <h2 id="project-result-title" className="text-heading mt-4">
              Uma aplicação web funcional.
            </h2>
            <p className="text-foreground mt-4 leading-7">
              Capacidades implementadas para atender às necessidades do cenário
              simulado:
            </p>
            <ul className="text-foreground mt-6 space-y-3">
              {capabilities.map((capability) => (
                <li key={capability} className="flex gap-3 leading-7">
                  <span aria-hidden="true" className="text-primary font-bold">
                    ✓
                  </span>
                  {capability}
                </li>
              ))}
            </ul>
            <p className="text-foreground mt-6 text-sm leading-6">
              React, TypeScript, NestJS, Prisma e PostgreSQL, com infraestrutura
              distribuída entre Cloudflare e Northflank.
            </p>
            <p className="text-foreground mt-3 text-sm leading-6">
              A validação técnica inclui testes automatizados de revogação de
              sessões, permissões e isolamento entre ambientes, além de
              verificações dos fluxos no navegador.
            </p>
          </div>
          <ProjectScreenshot screen={projectScreens.dashboard} />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <ProjectScreenshot screen={projectScreens.orders} />
          <ProjectScreenshot screen={projectScreens.clients} />
        </div>
      </div>
    </section>
  );
}

function ProjectCallToAction() {
  return (
    <section
      data-theme="dark"
      className="portfolio-theme bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24"
    >
      <div className="mx-auto flex site-container flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold site-eyebrow text-primary uppercase">
            Explore o produto
          </p>
          <h2 className="mt-4">Conheça o fluxo funcionando na aplicação.</h2>
          <p className="mt-5 text-lg leading-8 text-foreground">
            Gere um acesso temporário e explore o sistema em um ambiente
            isolado, com dados de exemplo ou começando do zero.
          </p>
        </div>
        <ActionLink href={osLoginUrl} variant="primary" className="shrink-0">
          Testar aplicação
          <ArrowIcon />
        </ActionLink>
      </div>
    </section>
  );
}

function ServiceOrderProjectPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Sistema de Gestão de Ordens de Serviço · Leonardo Passos";

    return () => {
      document.title = "Leonardo Passos · Desenvolvedor de Software";
    };
  }, []);

  return (
    <PublicLayout>
      <article className="w-full">
        <ProjectHero />
        <ProjectOverview />
        <ProjectChallenges />
        <ProjectResult />
        <ProjectCallToAction />
      </article>
    </PublicLayout>
  );
}

export { ServiceOrderProjectPage };
