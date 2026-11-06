import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  ActionLink,
  ArrowIcon,
  Button,
  Card,
} from "../../../components/ui/PortfolioUI";
import { PublicLayout } from "../../../components/layout/PublicLayout";
import { osLoginUrl } from "../../../shared/lib/osLinks";
import { HomeScrollBackground } from "../components/HomeScrollBackground";
import { ProcessDiagram } from "../components/ProcessDiagram";
import { RequirementsIcon } from "../components/RequirementsIcon";
import type { RequirementsIconKind } from "../components/RequirementsIcon";
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

type ProcessStep = {
  number: string;
  title: string;
};

function ProcessStepHeading({
  number,
  title,
  onOpen,
}: ProcessStep & { onOpen: (step: ProcessStep) => void }) {
  return (
    <h3 className="text-heading mt-4">
      <button
        type="button"
        className="home-process-trigger"
        aria-haspopup="dialog"
        aria-controls="home-process-dialog"
        onClick={() => onOpen({ number, title })}
      >
        {title}
      </button>
    </h3>
  );
}

function ProcessActivities({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="home-process-activities">
      <h3 className="home-process-caption">{title}</h3>
      <dl className="home-requirements-context">{children}</dl>
    </div>
  );
}

function ProcessExample({
  kind,
  icon,
  title,
  need,
  decision,
  evidence,
  benefit,
}: {
  kind: "discovery" | "architecture" | "development" | "validation";
  icon: RequirementsIconKind;
  title: string;
  need: string;
  decision: string;
  evidence?: string;
  benefit: string;
}) {
  return (
    <div className="home-process-example" data-kind={kind}>
      <p className="home-process-caption home-requirements-label">
        <RequirementsIcon kind={icon} />
        <span>
          Exemplo:{" "}
          <Link to="/projetos/sistema-os" className="home-process-project-link">
            Sistema OS
          </Link>
        </span>
      </p>
      <h3>{title}</h3>
      <dl className="home-process-example-content">
        <div>
          <dt>{kind === "discovery" ? "Pedido inicial" : "Necessidade"}</dt>
          <dd>{kind === "discovery" ? <blockquote>“{need}”</blockquote> : need}</dd>
        </div>
        <div>
          <dt>Decisão</dt>
          <dd>{decision}</dd>
        </div>
        {evidence && (
          <div className="home-process-example-evidence">
            <dt>Evidência</dt>
            <dd>{evidence}</dd>
          </div>
        )}
        <div className="home-process-example-benefit">
          <dt>O que isso permite</dt>
          <dd>{benefit}</dd>
        </div>
      </dl>
    </div>
  );
}

function ProcessOutcome({ children }: { children: ReactNode }) {
  return (
    <div className="home-process-outcome">
      <RequirementsIcon kind="check" />
      <div>
        <p className="home-process-caption">Resultado da etapa</p>
        <p>{children}</p>
      </div>
    </div>
  );
}

function ProcessActions({
  next,
  onContinue,
  onBack,
  backLabel,
}: {
  next?: ProcessStep;
  onContinue?: () => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="home-process-actions">
      {onBack && backLabel && (
        <Button
          variant="secondary"
          className="home-process-back"
          aria-controls="home-process-details"
          aria-label={backLabel}
          title={backLabel}
          onClick={onBack}
        >
          <ArrowIcon />
        </Button>
      )}
      {next && onContinue && (
        <Button
          variant="primary"
          aria-controls="home-process-details"
          aria-label={`Próxima etapa: ${next.title}`}
          onClick={onContinue}
        >
          <span>{next.title}</span>
          <ArrowIcon />
        </Button>
      )}
    </div>
  );
}

type ProcessNavigation = {
  onContinue: () => void;
  onBack: () => void;
};

function ProblemUnderstandingDetails({ onContinue }: Pick<ProcessNavigation, "onContinue">) {
  return (
    <>
      <p id="requirements-details-summary" className="home-process-intro">
        Antes de definir telas ou tecnologias, procuro entender a rotina, quem vai
        usar a solução e o que precisa mudar.
      </p>
      <div className="home-process-overview">
        <ProcessDiagram kind="discovery" />
        <ProcessActivities title="O que preciso entender">
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="question" />
              <span>Problema e contexto</span>
            </dt>
            <dd>Como o trabalho acontece hoje e onde estão as dificuldades.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="checklist" />
              <span>Objetivos e prioridades</span>
            </dt>
            <dd>O que precisa ser resolvido e o que é essencial na primeira versão.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="shield" />
              <span>Regras e limites</span>
            </dt>
            <dd>Quem pode fazer o quê e quais restrições a solução deve respeitar.</dd>
          </div>
        </ProcessActivities>
      </div>
      <ProcessExample
        kind="discovery"
        icon="conversation"
        title="De um pedido às regras de acesso."
        need="Quero que cada funcionário tenha seu próprio acesso e que nem todo mundo consiga alterar tudo."
        decision="Separei consulta e edição: uma ordem pública de outro responsável é somente leitura para o funcionário."
        benefit="A equipe pode acompanhar serviços compartilhados sem receber permissão para alterar ordens de terceiros."
      />
      <div className="home-process-footer">
        <ProcessOutcome>Entendimento inicial do problema, das necessidades e das prioridades.</ProcessOutcome>
        <ProcessActions
          next={{ number: "02", title: "Planejamento e arquitetura" }}
          onContinue={onContinue}
        />
      </div>
    </>
  );
}

function PlanningArchitectureDetails({ onContinue, onBack }: ProcessNavigation) {
  return (
    <>
      <p id="planning-details-summary" className="home-process-intro">
        Transformo os requisitos em fluxos de uso, modelos de dados e decisões
        técnicas. Registro como as partes da solução se relacionam para orientar
        a implementação.
      </p>
      <div className="home-process-overview">
        <ProcessDiagram kind="architecture" />
        <ProcessActivities title="O que organizo antes de implementar">
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="checklist" />
              <span>Fluxos e interfaces</span>
            </dt>
            <dd>Organizo os caminhos do usuário e as telas necessárias para cada tarefa.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="shield" />
              <span>Modelos e responsabilidades</span>
            </dt>
            <dd>Relaciono os dados e defino onde ficam a interface, as regras e o armazenamento.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="document" />
              <span>Decisões documentadas</span>
            </dt>
            <dd>Registro escolhas e motivos para apoiar a implementação e futuras mudanças.</dd>
          </div>
        </ProcessActivities>
      </div>
      <ProcessExample
        kind="architecture"
        icon="document"
        title="Cada parte com uma responsabilidade."
        need="A operação precisava de telas de uso diário, regras de negócio e dados que permanecessem salvos."
        decision="Separei a interface, as regras de negócio e o armazenamento dos dados, definindo a responsabilidade de cada parte."
        benefit="Essa divisão facilita localizar mudanças na interface, nas regras ou nos dados, mantendo clientes, funcionários e ordens relacionados."
      />
      <div className="home-process-footer">
        <ProcessOutcome>Fluxos organizados, responsabilidades definidas e decisões documentadas.</ProcessOutcome>
        <ProcessActions
          next={{ number: "03", title: "Desenvolvimento com apoio de IA" }}
          onContinue={onContinue}
          onBack={onBack}
          backLabel="Voltar para Entendimento do problema"
        />
      </div>
    </>
  );
}

function AIAssistedDevelopmentDetails({ onContinue, onBack }: ProcessNavigation) {
  return (
    <>
      <p id="development-details-summary" className="home-process-intro">
        Utilizo IA como ferramenta de apoio ao desenvolvimento. Defino os
        requisitos e os critérios que orientam cada tarefa, avalio as soluções
        propostas e conduzo a revisão e a validação das alterações.
      </p>
      <div className="home-process-overview">
        <ProcessDiagram kind="development" />
        <ProcessActivities title="Como conduzo a implementação">
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="document" />
              <span>Contexto e critérios</span>
            </dt>
            <dd>Defino o objetivo, as regras e o comportamento esperado antes de solicitar código.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="checklist" />
              <span>IA como apoio</span>
            </dt>
            <dd>Solicito mudanças por etapas e comparo as propostas com os requisitos e a arquitetura.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="shield" />
              <span>Revisão e validação</span>
            </dt>
            <dd>Avalio as alterações de código e uso as verificações aplicáveis para conferir o comportamento.</dd>
          </div>
        </ProcessActivities>
      </div>
      <ProcessExample
        kind="development"
        icon="document"
        title="O contexto orienta o código."
        need="A implementação precisava seguir as regras definidas e preservar os fluxos existentes."
        decision="Usei os requisitos, o plano de implementação e as instruções do repositório como contexto para tarefas com apoio de IA."
        benefit="Essas referências permitem comparar as propostas e o código com o pedido, identificar ajustes e orientar as verificações."
      />
      <div className="home-process-footer">
        <ProcessOutcome>Desenvolvimento orientado por contexto, critérios e avaliação dos resultados.</ProcessOutcome>
        <ProcessActions
          next={{ number: "04", title: "Validação e evolução" }}
          onContinue={onContinue}
          onBack={onBack}
          backLabel="Voltar para Planejamento e arquitetura"
        />
      </div>
    </>
  );
}

function ValidationEvolutionDetails({ onBack }: { onBack: () => void }) {
  return (
    <>
      <p id="validation-details-summary" className="home-process-intro">
        Verifico funcionalidades, segurança e experiência de uso com testes e
        revisões. Comparo o comportamento com os requisitos e ajusto a solução
        conforme os resultados.
      </p>
      <div className="home-process-overview">
        <ProcessDiagram kind="validation" />
        <ProcessActivities title="O que verifico e refino">
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="checklist" />
              <span>Funcionalidades e regras</span>
            </dt>
            <dd>Confiro os fluxos principais, as validações e os comportamentos esperados.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="shield" />
              <span>Segurança e experiência de uso</span>
            </dt>
            <dd>Verifico permissões, navegação por teclado e uso em computador e celular.</dd>
          </div>
          <div>
            <dt className="home-requirements-label">
              <RequirementsIcon kind="document" />
              <span>Ajustes e evolução</span>
            </dt>
            <dd>Registro o que foi verificado e corrijo os problemas encontrados antes de avançar.</dd>
          </div>
        </ProcessActivities>
      </div>
      <ProcessExample
        kind="validation"
        icon="checklist"
        title="Uma edição não pode apagar a outra."
        need="Duas pessoas podem tentar atualizar a mesma ordem a partir de versões diferentes."
        decision="Rejeitar atualizações feitas sobre versões desatualizadas, preservando os dados mais recentes."
        evidence="Teste automatizado que verifica a rejeição da alteração e a integridade do histórico."
        benefit="Impedir que uma edição sobrescreva alterações já salvas por outra pessoa."
      />
      <div className="home-process-footer">
        <ProcessOutcome>Evidências para avaliar a solução e orientar os próximos ajustes.</ProcessOutcome>
        <ProcessActions onBack={onBack} backLabel="Voltar para Desenvolvimento com apoio de IA" />
      </div>
    </>
  );
}

function WorkingPrinciplesSection() {
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const isRequirementsStep = selectedStep?.number === "01";
  const isPlanningStep = selectedStep?.number === "02";
  const isDevelopmentStep = selectedStep?.number === "03";
  const isValidationStep = selectedStep?.number === "04";

  useEffect(() => {
    if (!selectedStep) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [selectedStep]);

  useEffect(() => {
    if (!selectedStep) return;
    const scrollContainer = dialogRef.current?.querySelector<HTMLElement>(
      ".home-process-details",
    );
    if (scrollContainer) scrollContainer.scrollTop = 0;
    dialogTitleRef.current?.focus({ preventScroll: true });
  }, [selectedStep]);

  function openDetails(step: ProcessStep) {
    setSelectedStep(step);
    dialogRef.current?.showModal();
  }

  return (
    <section
      aria-labelledby="working-principles-title"
      className="bg-surface px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto site-container">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold site-eyebrow uppercase">
            Como construo
          </p>
          <h2 id="working-principles-title" className="text-heading mt-4">
            Como transformo ideias em soluções
          </h2>
          <p className="text-foreground mt-4 leading-7">
            Do planejamento à validação, combino organização, decisões técnicas e
            inteligência artificial para desenvolver soluções alinhadas às
            necessidades de cada projeto.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="home-process-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-neutral text-xs font-medium">01</p>
              <svg
                className="home-process-icon"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
            </div>
            <ProcessStepHeading
              number="01"
              title="Entendimento do problema"
              onOpen={openDetails}
            />
            <p className="text-foreground mt-3 text-sm leading-6">
              Analiso necessidades, objetivos e regras de negócio para definir o
              problema e o escopo da solução.
            </p>
          </Card>
          <Card className="home-process-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-neutral text-xs font-medium">02</p>
              <svg
                className="home-process-icon"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M9 3v18M9 9h11M9 15h11" />
              </svg>
            </div>
            <ProcessStepHeading
              number="02"
              title="Planejamento e arquitetura"
              onOpen={openDetails}
            />
            <p className="text-foreground mt-3 text-sm leading-6">
              Organizo requisitos, planejo fluxos e defino a arquitetura,
              documentando as decisões que orientam o desenvolvimento.
            </p>
          </Card>
          <Card className="home-process-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-neutral text-xs font-medium">03</p>
              <svg
                className="home-process-icon"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" />
              </svg>
            </div>
            <ProcessStepHeading
              number="03"
              title="Desenvolvimento com apoio de IA"
              onOpen={openDetails}
            />
            <p className="text-foreground mt-3 text-sm leading-6">
              Utilizo IA como ferramenta de apoio à implementação, com contexto
              estruturado, instruções claras e revisão crítica dos resultados.
            </p>
          </Card>
          <Card className="home-process-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-neutral text-xs font-medium">04</p>
              <svg
                className="home-process-icon"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </svg>
            </div>
            <ProcessStepHeading
              number="04"
              title="Validação e evolução"
              onOpen={openDetails}
            />
            <p className="text-foreground mt-3 text-sm leading-6">
              Verifico funcionalidades, segurança e experiência de uso por meio de
              testes e revisões, ajustando a solução conforme necessário.
            </p>
          </Card>
        </div>
        <dialog
          ref={dialogRef}
          id="home-process-dialog"
          className="home-process-dialog"
          aria-labelledby="home-process-dialog-title"
          aria-describedby={
            isRequirementsStep
              ? "requirements-details-summary"
              : isPlanningStep
                ? "planning-details-summary"
                : isDevelopmentStep
                  ? "development-details-summary"
                  : isValidationStep
                    ? "validation-details-summary"
                    : undefined
          }
          onClose={() => setSelectedStep(null)}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            ) {
              event.currentTarget.close();
            }
          }}
        >
          <div className="home-process-dialog-header">
            <p className="site-eyebrow text-primary flex items-center gap-2 text-xs leading-none uppercase">
              <span className="text-neutral shrink-0 tracking-normal tabular-nums">
                {selectedStep?.number}
              </span>
              <span
                className="bg-border h-3 w-px shrink-0"
                aria-hidden="true"
              />
              <span>
                {selectedStep?.title}
              </span>
            </p>
            <Button
              variant="tertiary"
              className="home-process-close"
              aria-label="Fechar detalhes"
              title="Fechar detalhes"
              onClick={() => dialogRef.current?.close()}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Button>
          </div>
          <div id="home-process-details" className="home-process-details">
            <h2
              ref={dialogTitleRef}
              id="home-process-dialog-title"
              className="text-heading mb-4"
              tabIndex={-1}
            >
              {isRequirementsStep
                ? "Entender antes de desenvolver."
                : isPlanningStep
                  ? "Planejar para construir com clareza."
                  : isDevelopmentStep
                    ? "Implementar com contexto e revisão."
                    : isValidationStep
                      ? "Verificar antes de evoluir."
                      : selectedStep?.title}
            </h2>
            {isRequirementsStep && (
              <ProblemUnderstandingDetails
                onContinue={() =>
                  setSelectedStep({ number: "02", title: "Planejamento e arquitetura" })
                }
              />
            )}
            {isPlanningStep && (
              <PlanningArchitectureDetails
                onBack={() =>
                  setSelectedStep({ number: "01", title: "Entendimento do problema" })
                }
                onContinue={() =>
                  setSelectedStep({ number: "03", title: "Desenvolvimento com apoio de IA" })
                }
              />
            )}
            {isDevelopmentStep && (
              <AIAssistedDevelopmentDetails
                onBack={() =>
                  setSelectedStep({ number: "02", title: "Planejamento e arquitetura" })
                }
                onContinue={() =>
                  setSelectedStep({ number: "04", title: "Validação e evolução" })
                }
              />
            )}
            {isValidationStep && (
              <ValidationEvolutionDetails
                onBack={() =>
                  setSelectedStep({ number: "03", title: "Desenvolvimento com apoio de IA" })
                }
              />
            )}
          </div>
        </dialog>
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
