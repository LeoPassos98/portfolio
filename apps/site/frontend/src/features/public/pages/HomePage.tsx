import { useEffect } from "react";
import {
  ActionLink,
  ArrowIcon,
  Badge,
  Card,
} from "../../../components/ui/PortfolioUI";
import { PublicLayout } from "../../../components/layout/PublicLayout";
import { osLoginUrl } from "../../../shared/lib/osLinks";
import { HomeScrollBackground } from "../components/HomeScrollBackground";

function ProjectPreview() {
  return (
    <div
      aria-hidden="true"
      data-theme="dark"
      className="portfolio-theme bg-background relative min-h-80 overflow-hidden rounded-2xl p-5 site-shadow-raised sm:p-7"
    >
      <div className="relative flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-xs font-semibold site-eyebrow text-neutral uppercase">
            Sistema OS
          </span>
        </div>
        <span className="rounded-full bg-surface-soft px-3 py-1 text-xs text-neutral">
          Aplicação full stack
        </span>
      </div>

      <div className="relative mt-7 grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-neutral">Visão operacional</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="h-7 flex-1 rounded-sm bg-primary" />
            <span className="h-11 flex-1 rounded-sm bg-primary" />
            <span className="h-16 flex-1 rounded-sm bg-primary" />
            <span className="h-10 flex-1 rounded-sm bg-primary" />
            <span className="h-20 flex-1 rounded-sm bg-primary" />
            <span className="h-14 flex-1 rounded-sm bg-primary" />
          </div>
        </div>

        {["Clientes", "Equipe", "Ordens", "Dashboard"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg bg-surface-raised" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{label}</p>
                <span className="mt-2 block h-1.5 rounded-full bg-surface-soft" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="site-hero home-hero" aria-labelledby="home-hero-title">
      <div className="site-container home-hero-content">
        <p className="home-hero-identity site-eyebrow">
          LEONARDO PASSOS · DESENVOLVEDOR DE SOFTWARE
        </p>
        <h1 id="home-hero-title">
          Soluções de software pensadas do problema à implementação.
        </h1>
        <p className="home-hero-description">
          Transformo necessidades em aplicações funcionais, com atenção à
          arquitetura, à experiência do usuário e à qualidade técnica.
        </p>
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

function ProjectsSection() {
  return (
    <section
      id="projetos"
      aria-labelledby="projetos-title"
      className="border-y border-border px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto site-container">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
            Projetos selecionados
          </p>
          <h2 id="projetos-title" className="text-heading mt-4">
            Trabalho que transforma complexidade em experiência útil.
          </h2>
          <p className="text-foreground mt-4 text-lg leading-8">
            No projeto em destaque, React, NestJS e PostgreSQL aparecem junto
            das decisões de arquitetura, publicação e segurança que sustentam o
            sistema.
          </p>
        </div>

        <Card className="mt-12 grid overflow-hidden lg:grid-cols-2">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
              Projeto em destaque
            </p>
            <h3 className="text-heading mt-6">
              Sistema de Gestão de Ordens de Serviço
            </h3>
            <p className="text-foreground mt-4 leading-7">
              Aplicação full stack para centralizar clientes, equipe e ordens de
              serviço, com fluxos administrativos e operacionais protegidos por
              autenticação e regras de negócio reais.
            </p>
            <div
              className="technology-list mt-4"
              aria-label="Tecnologias do projeto"
            >
              {["React", "TypeScript", "NestJS", "PostgreSQL"].map(
                (technology) => (
                  <Badge key={technology}>{technology}</Badge>
                ),
              )}
            </div>

            <p className="text-neutral mt-7 text-xs font-semibold site-eyebrow uppercase">
              O que este projeto demonstra
            </p>
            <ul className="text-foreground mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-primary font-bold">
                  ✓
                </span>
                Jornada completa entre dashboard, clientes, equipe e ordens.
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-primary font-bold">
                  ✓
                </span>
                Sessões seguras, autorização por perfil e isolamento de
                ambientes.
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-primary font-bold">
                  ✓
                </span>
                Histórico, concorrência otimista e validações automatizadas.
              </li>
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink to="/projetos/sistema-os" variant="primary">
                Conhecer o projeto
                <ArrowIcon />
              </ActionLink>
              <ActionLink href={osLoginUrl} variant="secondary">
                Testar aplicação
              </ActionLink>
            </div>
          </div>

          <div className="bg-info-bg flex items-center p-6 sm:p-10 lg:p-12">
            <ProjectPreview />
          </div>
        </Card>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {["Projeto 02", "Projeto 03"].map((title) => (
            <Card key={title} className="p-6 sm:p-8">
              <p className="text-primary text-xs font-semibold site-eyebrow uppercase">
                Em preparação
              </p>
              <h3 className="text-heading mt-4">{title}</h3>
              <p className="text-foreground mt-3 text-sm leading-6">
                Espaço reservado para um próximo projeto, com contexto, decisões
                técnicas e resultado apresentado.
              </p>
            </Card>
          ))}
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
