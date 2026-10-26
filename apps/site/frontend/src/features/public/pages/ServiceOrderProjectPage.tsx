import { useEffect } from "react";
import {
  ActionLink,
  ArrowIcon,
  Card,
} from "../../../components/ui/PortfolioUI";
import { PublicLayout } from "../../../components/layout/PublicLayout";
import { osLoginUrl } from "../../../shared/lib/osLinks";

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
              Uma aplicação full stack criada para centralizar clientes, equipe
              e ordens de serviço em uma operação clara, rastreável e segura.
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
      <div className="mx-auto site-container">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
            Visão geral
          </p>
          <h2 className="text-heading mt-4">
            O projeto começa pelo fluxo de trabalho, não pela tecnologia.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {topics.map((topic, index) => (
            <Card key={topic.title} className="p-7">
              <p className="text-primary text-sm font-bold">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="text-heading mt-5">{topic.title}</h3>
              <p className="text-foreground mt-3 leading-7">
                {topic.description}
              </p>
            </Card>
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
    <section className="bg-surface border-y border-border px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto site-container">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
            Produto em imagens
          </p>
          <h2 className="text-heading mt-4">
            Espaço preparado para apresentar a aplicação real.
          </h2>
          <p className="text-foreground mt-5 text-lg leading-8">
            As capturas serão adicionadas quando a base visual do produto
            estiver estável.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {screens.map((screen) => (
            <figure
              key={screen.title}
              className="border-border overflow-hidden rounded-2xl border bg-background"
            >
              <div
                data-theme="dark"
                className="portfolio-theme bg-background aspect-[4/3] p-5"
              >
                <div className="flex items-center gap-1.5 border-b border-border pb-4">
                  <span className="h-2 w-2 rounded-full bg-control-border" />
                  <span className="h-2 w-2 rounded-full bg-surface-raised" />
                  <span className="h-2 w-2 rounded-full bg-surface-soft" />
                </div>
                <div className="mt-6 space-y-3">
                  <span className="block h-3 w-2/5 rounded-full bg-surface-raised" />
                  <span className="block h-20 rounded-xl border border-border bg-surface" />
                  <div className="grid grid-cols-2 gap-3">
                    <span className="block h-14 rounded-lg border border-border bg-surface" />
                    <span className="block h-14 rounded-lg border border-border bg-surface" />
                  </div>
                </div>
              </div>
              <figcaption className="p-5">
                <p className="text-foreground font-semibold">{screen.title}</p>
                <p className="text-foreground mt-2 text-sm leading-6">
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
    <section className="bg-surface border-y border-border px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid site-container gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
            Escopo do produto
          </p>
          <h2 className="text-heading mt-4">
            Uma jornada conectada de ponta a ponta.
          </h2>
          <p className="text-foreground mt-5 leading-7">
            Cada área participa do mesmo fluxo operacional e compartilha regras
            consistentes de navegação, autorização e atualização de dados.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {capabilities.map((capability) => (
            <Card key={capability.title} className="p-6">
              <h3 className="text-heading">{capability.title}</h3>
              <p className="text-foreground mt-3 text-sm leading-6">
                {capability.description}
              </p>
            </Card>
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
      title: "Publicação",
      technologies: "Cloudflare Workers e Northflank",
      rationale:
        "A interface é publicada como assets estáticos, enquanto a API NestJS opera em um serviço separado.",
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
      <div className="mx-auto site-container">
        <div className="max-w-3xl">
          <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
            Decisões técnicas
          </p>
          <h2 className="text-heading mt-4">
            Tecnologias apresentadas no contexto das decisões que apoiam.
          </h2>
          <p className="text-foreground mt-5 text-lg leading-8">
            A stack não define o projeto sozinha. Cada ferramenta participa de
            uma responsabilidade concreta e pode evoluir conforme o produto
            exigir.
          </p>
        </div>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-surface">
          {groups.map((group) => (
            <article
              key={group.title}
              className="grid gap-4 p-6 sm:p-8 md:grid-cols-[0.55fr_1.45fr] md:gap-10"
            >
              <div>
                <h3 className="text-heading">{group.title}</h3>
                <p className="text-primary mt-2 text-sm font-semibold">
                  {group.technologies}
                </p>
              </div>
              <p className="text-foreground leading-7">{group.rationale}</p>
            </article>
          ))}
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
        <ActionLink href={osLoginUrl} variant="secondary" className="shrink-0">
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
        <ProjectGallery />
        <ProductScope />
        <TechnicalDecisions />
        <ProjectCallToAction />
      </article>
    </PublicLayout>
  );
}

export { ServiceOrderProjectPage };
