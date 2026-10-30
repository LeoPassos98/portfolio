import { useEffect } from "react";
import {
  ActionLink,
  ArrowIcon,
  Card,
} from "../../../components/ui/PortfolioUI";
import { PublicLayout } from "../../../components/layout/PublicLayout";
import { osLoginUrl } from "../../../shared/lib/osLinks";
import { HomeScrollBackground } from "../components/HomeScrollBackground";
import dashboardScreenshot from "../../../assets/projects/sistema-os/dashboard-desktop.webp";

function HeroSection() {
  return (
    <section className="site-hero home-hero" aria-labelledby="home-hero-title">
      <div className="site-container home-hero-content">
        <p className="home-hero-identity site-eyebrow">
          LEONARDO PASSOS · DESENVOLVEDOR DE SOFTWARE
        </p>
        <div className="home-hero-copy">
          <h1 id="home-hero-title">
            Soluções em forma
            <span className="home-hero-title-ending"> de software.</span>
          </h1>
          <p className="home-hero-description">
            Projetos que combinam planejamento, arquitetura e experiência de uso.
            Funcionais, intuitivos e bem estruturados.
          </p>
        </div>
        <div className="home-hero-actions">
          <ActionLink href="#projetos" variant="primary" size="lg">
            Explorar projetos
            <ArrowIcon />
          </ActionLink>
          <ActionLink href="#contato" variant="secondary" size="lg">
            Entrar em contato
          </ActionLink>
        </div>
      </div>
    </section>
  );
}

function ProjectScreenshot() {
  return (
    <div className="home-featured-screenshot w-full overflow-hidden rounded-2xl border border-border site-shadow-raised">
      <img
        src={dashboardScreenshot}
        alt="Dashboard do Sistema OS com indicadores e ordens de serviço em um ambiente demonstrativo."
        width={1440}
        height={900}
        loading="lazy"
        decoding="async"
        className="block h-auto"
      />
    </div>
  );
}

function ProjectsSection() {
  return (
    <section
      id="projetos"
      aria-labelledby="projetos-title"
      className="home-projects border-y border-border"
    >
      <div className="site-container home-projects-content">
        <div className="home-projects-showcase">
          <div className="home-projects-heading">
            <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
              Projetos
            </p>
            <h2 id="projetos-title" className="text-heading mt-4">
              Soluções que saíram do papel.
            </h2>
          </div>

          <Card className="home-featured-project grid lg:grid-cols-2">
            <div className="flex flex-col p-4 sm:p-6 lg:p-8">
              <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
                Projeto em destaque
              </p>
              <div className="flex flex-1 flex-col justify-center pt-4 sm:pt-5">
                <h3 className="text-heading">
                  Sistema de Gestão de Ordens de Serviço
                </h3>
                <div className="mt-4 lg:hidden">
                  <ProjectScreenshot />
                </div>
                <p className="text-foreground mt-3 text-sm leading-6 sm:text-base">
                  Aplicação full stack para centralizar clientes, equipe e ordens de
                  serviço, com fluxos administrativos e operacionais protegidos por
                  autenticação e regras de negócio reais.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <ActionLink to="/projetos/sistema-os" variant="primary">
                    Conhecer o projeto
                    <ArrowIcon />
                  </ActionLink>
                  <ActionLink href={osLoginUrl} variant="secondary">
                    Testar aplicação
                  </ActionLink>
                </div>
              </div>
              <ul
                className="text-neutral mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs"
                aria-label="Tecnologias do projeto"
              >
                {["React", "TypeScript", "NestJS", "PostgreSQL"].map(
                  (technology) => <li key={technology}>{technology}</li>,
                )}
              </ul>
            </div>

            <div className="home-featured-preview hidden items-center p-8 lg:flex">
              <ProjectScreenshot />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function WorkingPrinciplesSection() {
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto site-container">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
              Como construo
            </p>
            <h2 className="text-heading mt-4">
              Do problema à entrega, em todas as camadas.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Card className="p-6">
              <p className="text-primary text-sm font-bold">01</p>
              <h3 className="text-heading mt-5">Entender o problema</h3>
              <p className="text-foreground mt-3 text-sm leading-6">
                Mapeio usuários, regras de negócio, restrições e casos de uso.
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-primary text-sm font-bold">02</p>
              <h3 className="text-heading mt-5">Projetar a solução</h3>
              <p className="text-foreground mt-3 text-sm leading-6">
                Conecto interface, API e banco de dados em fluxos coerentes.
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-primary text-sm font-bold">03</p>
              <h3 className="text-heading mt-5">Garantir qualidade</h3>
              <p className="text-foreground mt-3 text-sm leading-6">
                Testes, validações e controle de acesso protegem os fluxos.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section
      id="sobre"
      aria-labelledby="sobre-title"
      className="border-y border-border px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto grid site-container gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
            Sobre
          </p>
          <h2 id="sobre-title" className="text-heading mt-4">
            Do detalhe técnico à visão do produto.
          </h2>
        </div>
        <div className="text-foreground space-y-5 text-lg leading-8">
          <p>
            Sou Leonardo Passos, desenvolvedor de software. Desenvolvo aplicações
            web de ponta a ponta, conectando interface, regras de negócio, APIs
            e dados.
          </p>
          <p>
            No Sistema de Gestão de Ordens de Serviço, trabalhei nos fluxos de
            clientes, equipe e ordens, além de autenticação, histórico e
            validações. Apresento o projeto junto das decisões que orientaram
            essas entregas.
          </p>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const contacts = [
    {
      label: "E-mail",
      value: "contato@leonardopassos.com",
      href: "mailto:contato@leonardopassos.com",
      action: "Enviar e-mail",
      external: false,
    },
    {
      label: "LinkedIn",
      value: "in/devLeonardoPassos",
      href: "https://www.linkedin.com/in/devLeonardoPassos",
      action: "Abrir perfil",
      external: true,
    },
    {
      label: "WhatsApp",
      value: "+55 31 99591-7334",
      href: "https://wa.me/5531995917334",
      action: "Conversar no WhatsApp",
      external: true,
    },
  ];

  return (
    <section
      id="contato"
      aria-labelledby="contato-title"
      data-theme="dark"
      className="portfolio-theme bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24"
    >
      <div className="mx-auto site-container">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold site-eyebrow text-primary uppercase">
            Contato
          </p>
          <h2 id="contato-title" className="mt-4">
            Quer conversar sobre produto, engenharia ou uma oportunidade?
          </h2>
          <p className="mt-5 text-lg leading-8 text-foreground">
            Escolha o canal mais conveniente para conversar sobre projetos,
            produto ou oportunidades profissionais.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contacts.map((contact) => (
            <a
              key={contact.label}
              href={contact.href}
              target={contact.external ? "_blank" : undefined}
              rel={contact.external ? "noreferrer" : undefined}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <p className="text-sm font-semibold text-foreground">
                {contact.label}
              </p>
              <p className="mt-2 text-sm text-neutral">{contact.value}</p>
              <p className="mt-5 text-xs font-medium text-primary">
                {contact.action}
                {contact.external && <span aria-hidden="true"> ↗</span>}
              </p>
            </a>
          ))}

          <a
            href="https://github.com/LeoPassos98"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <p className="text-sm font-semibold text-foreground">GitHub</p>
            <p className="mt-2 text-sm text-neutral">@LeoPassos98</p>
            <p className="mt-5 text-xs font-medium text-primary">
              Abrir perfil <span aria-hidden="true">↗</span>
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  useEffect(() => {
    const sectionId = window.location.hash.slice(1);

    if (!sectionId) return;

    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView();
    });
  }, []);

  return (
    <PublicLayout>
      <div className="home-page w-full">
        <HomeScrollBackground />
        <HeroSection />
        <ProjectsSection />
        <WorkingPrinciplesSection />
        <AboutSection />
        <ContactSection />
      </div>
    </PublicLayout>
  );
}

export { HomePage };
