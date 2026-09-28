import { useEffect } from "react";
import { Link } from "react-router";
import { PublicLayout } from "../../../components/layout/PublicLayout";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M4 10h12m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProjectHero() {
  return (
    <section className="bg-surface border-b border-neutral-bg px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1180px]">
        <a
          href="/#projetos"
          className="text-neutral hover:text-primary rounded-ui inline-flex items-center gap-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
          Voltar aos projetos
        </a>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              Estudo de caso
            </p>
            <h1 className="text-foreground mt-5 max-w-4xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl sm:leading-[1.08] lg:text-6xl">
              Sistema de Gestão de Ordens de Serviço
            </h1>
            <p className="text-neutral mt-6 max-w-3xl text-lg leading-8 sm:text-xl">
              Uma aplicação full stack criada para centralizar clientes,
              equipe e ordens de serviço em uma operação clara, rastreável e
              segura.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="bg-primary hover:bg-primary-hover rounded-ui inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Testar aplicação
                <ArrowIcon />
              </Link>
              <a
                href="https://github.com/LeoPassos98/portfolio"
                target="_blank"
                rel="noreferrer"
                className="border-neutral-bg text-foreground hover:border-primary hover:text-primary rounded-ui inline-flex items-center justify-center border px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Ver código no GitHub <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <dl className="border-neutral-bg grid gap-px overflow-hidden rounded-2xl border bg-neutral-bg sm:grid-cols-3 lg:grid-cols-1">
            <div className="bg-surface p-5">
              <dt className="text-neutral text-xs font-semibold tracking-wider uppercase">
                Tipo
              </dt>
              <dd className="text-foreground mt-2 font-semibold">
                Aplicação web full stack
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
                Estado
              </dt>
              <dd className="text-foreground mt-2 font-semibold">
                Em evolução contínua
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function ProjectOverview() {
  const topics = [
    {
      title: "Problema",
      description:
        "Informações operacionais dispersas dificultam acompanhar clientes, responsáveis e o andamento de cada serviço.",
    },
    {
      title: "Solução",
      description:
        "Uma experiência única para registrar, consultar e atualizar a operação com regras claras em todas as etapas.",
    },
    {
      title: "Meu papel",
      description:
        "Concepção do produto e implementação completa da interface, API, persistência, segurança e validações.",
    },
  ];

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Visão geral
          </p>
          <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            O projeto começa pelo fluxo de trabalho, não pela tecnologia.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {topics.map((topic, index) => (
            <article
              key={topic.title}
              className="border-neutral-bg rounded-2xl border bg-surface p-7"
            >
              <p className="text-primary text-sm font-bold">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="text-foreground mt-5 text-xl font-bold">
                {topic.title}
              </h3>
              <p className="text-neutral mt-3 leading-7">
                {topic.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectGallery() {
  const screens = [
    {
      title: "Visão operacional",
      description: "Dashboard e indicadores principais do sistema.",
    },
    {
      title: "Ordens de serviço",
      description: "Listagem, estados e acompanhamento do trabalho.",
    },
    {
      title: "Clientes e equipe",
      description: "Cadastros que sustentam o fluxo operacional.",
    },
  ];

  return (
    <section className="bg-surface border-y border-neutral-bg px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Produto em imagens
          </p>
          <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Espaço preparado para apresentar a aplicação real.
          </h2>
          <p className="text-neutral mt-5 text-lg leading-8">
            As capturas serão adicionadas quando a base visual do produto
            estiver estável.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {screens.map((screen) => (
            <figure
              key={screen.title}
              className="border-neutral-bg overflow-hidden rounded-2xl border bg-background"
            >
              <div className="bg-foreground aspect-[4/3] p-5">
                <div className="flex items-center gap-1.5 border-b border-white/10 pb-4">
                  <span className="h-2 w-2 rounded-full bg-white/30" />
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  <span className="h-2 w-2 rounded-full bg-white/10" />
                </div>
                <div className="mt-6 space-y-3">
                  <span className="block h-3 w-2/5 rounded-full bg-white/20" />
                  <span className="block h-20 rounded-xl border border-white/10 bg-white/5" />
                  <div className="grid grid-cols-2 gap-3">
                    <span className="block h-14 rounded-lg border border-white/10 bg-white/5" />
                    <span className="block h-14 rounded-lg border border-white/10 bg-white/5" />
                  </div>
                </div>
              </div>
              <figcaption className="p-5">
                <p className="text-foreground font-semibold">{screen.title}</p>
                <p className="text-neutral mt-2 text-sm leading-6">
                  {screen.description}
                </p>
                <p className="text-primary mt-4 text-xs font-semibold tracking-wide uppercase">
                  Captura a adicionar
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductScope() {
  const capabilities = [
    {
      title: "Visão operacional",
      description:
        "Dashboards apresentam situação, volume e desempenho de acordo com o perfil da sessão.",
    },
    {
      title: "Clientes e equipe",
      description:
        "Cadastros, perfis e estados de acesso mantêm as pessoas da operação organizadas.",
    },
    {
      title: "Ordens de serviço",
      description:
        "Criação, acompanhamento, histórico e transições de estado representam o ciclo real do serviço.",
    },
    {
      title: "Acesso e segurança",
      description:
        "Sessões, perfis, primeiro acesso e isolamento de ambientes protegem dados e ações sensíveis.",
    },
  ];

  return (
    <section className="bg-surface border-y border-neutral-bg px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Escopo do produto
          </p>
          <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Uma jornada conectada de ponta a ponta.
          </h2>
          <p className="text-neutral mt-5 leading-7">
            Cada área participa do mesmo fluxo operacional e compartilha regras
            consistentes de navegação, autorização e atualização de dados.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {capabilities.map((capability) => (
            <article
              key={capability.title}
              className="border-neutral-bg rounded-xl border p-6"
            >
              <h3 className="text-foreground font-semibold">
                {capability.title}
              </h3>
              <p className="text-neutral mt-3 text-sm leading-6">
                {capability.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechnicalDecisions() {
  const groups = [
    {
      title: "Interface",
      technologies: "React, TypeScript e Tailwind CSS",
      rationale:
        "Componentes tipados e uma linguagem visual consistente sustentam fluxos claros em diferentes tamanhos de tela.",
    },
    {
      title: "Aplicação e dados",
      technologies: "NestJS, Prisma e PostgreSQL",
      rationale:
        "Contratos explícitos, regras centralizadas e persistência relacional protegem a coerência da operação.",
    },
    {
      title: "Qualidade",
      technologies: "Vitest e validações de navegador",
      rationale:
        "Testes automatizados e verificações de fluxo reduzem regressões nas regras que sustentam o produto.",
    },
  ];

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-3xl">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Decisões técnicas
          </p>
          <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Tecnologias apresentadas no contexto das decisões que apoiam.
          </h2>
          <p className="text-neutral mt-5 text-lg leading-8">
            A stack não define o projeto sozinha. Cada ferramenta participa de
            uma responsabilidade concreta e pode evoluir conforme o produto
            exigir.
          </p>
        </div>

        <div className="mt-12 divide-y divide-neutral-bg rounded-2xl border border-neutral-bg bg-surface">
          {groups.map((group) => (
            <article
              key={group.title}
              className="grid gap-4 p-6 sm:p-8 md:grid-cols-[0.55fr_1.45fr] md:gap-10"
            >
              <div>
                <h3 className="text-foreground text-lg font-bold">
                  {group.title}
                </h3>
                <p className="text-primary mt-2 text-sm font-semibold">
                  {group.technologies}
                </p>
              </div>
              <p className="text-neutral leading-7">{group.rationale}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCallToAction() {
  return (
    <section className="bg-foreground px-4 py-20 text-white sm:px-6 sm:py-24">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-indigo-200 uppercase">
            Explore o produto
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Conheça o fluxo funcionando na aplicação.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            O acesso atual leva à entrada do sistema. O fluxo público de
            demonstração será conectado a esta ação quando estiver disponível.
          </p>
        </div>
        <Link
          to="/login"
          className="bg-surface text-foreground hover:bg-info-bg rounded-ui inline-flex shrink-0 items-center justify-center gap-2 px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
        >
          Testar aplicação
          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}

function ServiceOrderProjectPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title =
      "Sistema de Gestão de Ordens de Serviço · Leonardo Passos";

    return () => {
      document.title = "Leonardo Passos · Desenvolvedor full stack";
    };
  }, []);

  return (
    <PublicLayout>
      <article className="w-full">
        <ProjectHero />
        <ProjectOverview />
        <ProjectGallery />
        <ProductScope />
        <TechnicalDecisions />
        <ProjectCallToAction />
      </article>
    </PublicLayout>
  );
}

export { ServiceOrderProjectPage };
