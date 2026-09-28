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

function ProjectPreview() {
  return (
    <div
      aria-hidden="true"
      className="bg-foreground relative min-h-80 overflow-hidden rounded-2xl p-5 shadow-2xl shadow-slate-950/20 sm:p-7"
    >
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
          <span className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
            Sistema OS
          </span>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          Aplicação full stack
        </span>
      </div>

      <div className="relative mt-7 grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/50">Visão operacional</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="h-7 flex-1 rounded-sm bg-indigo-300/30" />
            <span className="h-11 flex-1 rounded-sm bg-indigo-300/40" />
            <span className="h-16 flex-1 rounded-sm bg-indigo-300/60" />
            <span className="h-10 flex-1 rounded-sm bg-cyan-300/50" />
            <span className="h-20 flex-1 rounded-sm bg-cyan-300/80" />
            <span className="h-14 flex-1 rounded-sm bg-indigo-300/50" />
          </div>
        </div>

        {["Clientes", "Equipe", "Ordens", "Dashboard"].map((label, index) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={
                  index % 2 === 0
                    ? "h-8 w-8 rounded-lg bg-indigo-300/20"
                    : "h-8 w-8 rounded-lg bg-cyan-300/20"
                }
              />
              <div className="flex-1">
                <p className="text-xs font-medium text-white/80">{label}</p>
                <span className="mt-2 block h-1.5 rounded-full bg-white/10" />
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
    <section className="relative overflow-hidden bg-surface">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto grid max-w-[1180px] gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-32">
        <div>
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Leonardo Passos · Desenvolvedor full stack
          </p>
          <h1 className="text-foreground mt-5 max-w-3xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl sm:leading-[1.08] lg:text-6xl">
            Construo aplicações web completas, do frontend ao banco de dados.
          </h1>
          <p className="text-neutral mt-6 max-w-2xl text-lg leading-8 sm:text-xl">
            Transformo processos complexos em sistemas claros, confiáveis e
            fáceis de manter.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#projetos"
              className="bg-primary hover:bg-primary-hover rounded-ui inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Conhecer projetos
              <ArrowIcon />
            </a>
            <a
              href="#contato"
              className="border-neutral-bg text-foreground hover:border-primary hover:text-primary rounded-ui inline-flex items-center justify-center border bg-surface px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Entrar em contato
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
          <div className="bg-info-bg absolute -inset-5 -rotate-2 rounded-[2rem]" />
          <div className="border-neutral-bg relative overflow-hidden rounded-2xl border bg-surface p-6 shadow-xl shadow-slate-900/8 sm:p-8">
            <div className="bg-foreground flex aspect-[4/3] items-center justify-center rounded-xl">
              <div className="text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/10 text-2xl font-bold text-white">
                  LP
                </span>
                <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
                  Foto profissional
                </p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-primary text-sm font-semibold">
                Leonardo Passos
              </p>
              <h2 className="text-foreground mt-2 text-xl font-bold">
                Frontend, API e dados em uma solução completa.
              </h2>
              <p className="text-neutral mt-3 text-sm leading-6">
                Frontend · Backend · APIs · Banco de dados
              </p>
            </div>
          </div>
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
      className="border-y border-neutral-bg px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Projetos selecionados
          </p>
          <h2
            id="projetos-title"
            className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Trabalho que transforma complexidade em experiência útil.
          </h2>
          <p className="text-neutral mt-4 text-lg leading-8">
            No projeto em destaque, React, NestJS e PostgreSQL aparecem junto
            das decisões de arquitetura, publicação e segurança que sustentam
            o sistema.
          </p>
        </div>

        <article className="mt-12 grid overflow-hidden rounded-2xl border border-neutral-bg bg-surface shadow-sm lg:grid-cols-2">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <p className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">
              Projeto em destaque
            </p>
            <h3 className="text-foreground mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
              Sistema de Gestão de Ordens de Serviço
            </h3>
            <p className="text-neutral mt-4 leading-7">
              Aplicação full stack para centralizar clientes, equipe e ordens de
              serviço, com fluxos administrativos e operacionais protegidos por
              autenticação e regras de negócio reais.
            </p>
            <p className="text-neutral mt-4 text-sm font-medium">
              React · TypeScript · NestJS · PostgreSQL
            </p>

            <p className="text-neutral mt-7 text-xs font-semibold tracking-[0.16em] uppercase">
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
              <Link
                to="/projetos/sistema-os"
                className="bg-primary hover:bg-primary-hover rounded-ui inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Conhecer o projeto
                <ArrowIcon />
              </Link>
              <Link
                to="/login"
                className="border-neutral-bg text-foreground hover:border-primary hover:text-primary rounded-ui inline-flex items-center justify-center border px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Testar aplicação
              </Link>
            </div>
          </div>

          <div className="bg-info-bg flex items-center p-6 sm:p-10 lg:p-12">
            <ProjectPreview />
          </div>
        </article>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {["Projeto 02", "Projeto 03"].map((title) => (
            <article
              key={title}
              className="border-neutral-bg rounded-2xl border bg-surface p-6 sm:p-8"
            >
              <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
                Em preparação
              </p>
              <h3 className="text-foreground mt-4 text-xl font-bold">
                {title}
              </h3>
              <p className="text-neutral mt-3 text-sm leading-6">
                Espaço reservado para um próximo projeto, com contexto,
                decisões técnicas e resultado apresentado.
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkingPrinciplesSection() {
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              Como construo
            </p>
            <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Do problema à entrega, em todas as camadas.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <article className="border-neutral-bg rounded-xl border p-6">
              <p className="text-primary text-sm font-bold">01</p>
              <h3 className="text-foreground mt-5 font-semibold">
                Entender o problema
              </h3>
              <p className="text-neutral mt-3 text-sm leading-6">
                Mapeio usuários, regras de negócio, restrições e casos de uso.
              </p>
            </article>
            <article className="border-neutral-bg rounded-xl border p-6">
              <p className="text-primary text-sm font-bold">02</p>
              <h3 className="text-foreground mt-5 font-semibold">
                Projetar a solução
              </h3>
              <p className="text-neutral mt-3 text-sm leading-6">
                Conecto interface, API e banco de dados em fluxos coerentes.
              </p>
            </article>
            <article className="border-neutral-bg rounded-xl border p-6">
              <p className="text-primary text-sm font-bold">03</p>
              <h3 className="text-foreground mt-5 font-semibold">
                Garantir qualidade
              </h3>
              <p className="text-neutral mt-3 text-sm leading-6">
                Testes, validações e controle de acesso protegem os fluxos.
              </p>
            </article>
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
      className="border-y border-neutral-bg px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Sobre
          </p>
          <h2
            id="sobre-title"
            className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Do detalhe técnico à visão do produto.
          </h2>
        </div>
        <div className="text-neutral space-y-5 text-lg leading-8">
          <p>
            Sou Leonardo Passos, desenvolvedor full stack. Desenvolvo
            aplicações web de ponta a ponta, conectando interface, regras de
            negócio, APIs e dados.
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
  const pendingContacts = [
    { label: "E-mail", value: "Endereço profissional" },
    { label: "LinkedIn", value: "Perfil profissional" },
    { label: "WhatsApp", value: "Número profissional" },
  ];

  return (
    <section
      id="contato"
      aria-labelledby="contato-title"
      className="bg-foreground px-4 py-20 text-white sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-indigo-200 uppercase">
            Contato
          </p>
          <h2
            id="contato-title"
            className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Quer conversar sobre produto, engenharia ou uma oportunidade?
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Escolha o canal mais conveniente para conversar sobre projetos,
            produto ou oportunidades profissionais.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pendingContacts.map((contact) => (
            <div
              key={contact.label}
              className="rounded-xl border border-white/15 bg-white/5 p-5"
            >
              <p className="text-sm font-semibold text-white">
                {contact.label}
              </p>
              <p className="mt-2 text-sm text-slate-400">{contact.value}</p>
              <p className="mt-5 text-xs font-medium text-indigo-200">
                Link a adicionar
              </p>
            </div>
          ))}

          <a
            href="https://github.com/LeoPassos98"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 bg-white/5 p-5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <p className="text-sm font-semibold text-white">GitHub</p>
            <p className="mt-2 text-sm text-slate-400">@LeoPassos98</p>
            <p className="mt-5 text-xs font-medium text-indigo-200">
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
      <div className="w-full">
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
