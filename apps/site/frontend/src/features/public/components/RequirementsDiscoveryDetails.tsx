import { Link } from "react-router";
import { ArrowIcon, Button } from "../../../components/ui/PortfolioUI";

const discoveryQuestions = [
  {
    question: "Qual é o principal problema que precisa ser resolvido?",
    answer:
      "A dificuldade de organizar e acompanhar os atendimentos, pois as informações estão dispersas entre planilhas, WhatsApp e anotações, prejudicando a visão geral dos serviços.",
  },
  {
    question: "Quem utilizará o sistema?",
    answer:
      "O proprietário da empresa, responsável pela administração, e os funcionários envolvidos na execução e no acompanhamento dos serviços.",
  },
  {
    question: "Como funciona o atendimento atualmente?",
    answer:
      "As informações são registradas em planilhas, mensagens e anotações. O acompanhamento dos serviços e de seus responsáveis exige consultas a diferentes fontes.",
  },
  {
    question: "Quais informações precisam ser registradas?",
    answer:
      "Dados dos clientes, descrição dos serviços, valores, observações, responsáveis, situação de cada atendimento e histórico das alterações.",
  },
  {
    question: "O que é essencial na primeira versão?",
    answer:
      "Cadastrar clientes, registrar e acompanhar ordens de serviço, atribuir responsáveis, consultar o andamento dos atendimentos e controlar o acesso às informações.",
  },
];

const identifiedNeeds = [
  {
    title: "Centralização",
    description: "Reunir informações dispersas.",
  },
  {
    title: "Acompanhamento",
    description: "Conhecer o andamento dos serviços.",
  },
  {
    title: "Responsabilidades",
    description: "Identificar quem cuida de cada serviço.",
  },
  {
    title: "Controle de acesso",
    description: "Diferenciar quem pode consultar ou alterar.",
  },
  {
    title: "Rastreabilidade",
    description: "Consultar mudanças anteriores.",
  },
  {
    title: "Visão geral",
    description: "Compreender a situação da operação.",
  },
  {
    title: "Facilidade de consulta",
    description: "Encontrar informações de forma simples.",
  },
];

function ConversationIcon({ question = false }: { question?: boolean }) {
  return (
    <svg
      className="home-conversation-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      {question ? (
        <>
          <path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 1.5-2.5 1.5-2.5 3" />
          <circle cx="12" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
        </>
      ) : (
        <path d="M7 8h10M7 12h7" />
      )}
    </svg>
  );
}

function DiscoveryQuestion({
  question,
  answer,
}: (typeof discoveryQuestions)[number]) {
  return (
    <details
      className="home-discovery-question"
      name="requirements-discovery-questions"
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.open = false;
        }
      }}
    >
      <summary>
        <ConversationIcon question />
        <span>{question}</span>
      </summary>
      <div className="home-discovery-answer">
        <p>{answer}</p>
      </div>
    </details>
  );
}

export function RequirementsDiscoveryDetails({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <>
      <p id="home-process-detail-summary" className="text-neutral text-sm leading-6">
        Exemplo:{" "}
        <Link to="/projetos/sistema-os" className="site-text-link site-text-link--plain">
          Sistema de Gestão de Ordens de Serviço
        </Link>
      </p>
      <div className="home-discovery-request mt-2">
        <p className="text-foreground flex items-center gap-3 text-sm font-medium">
          <ConversationIcon />
          Pedido inicial · Cliente simulado
        </p>
        <blockquote className="text-foreground mt-3 leading-6">
          “Hoje controlo praticamente tudo por planilhas, WhatsApp e anotações.
          Está começando a ficar difícil acompanhar quais serviços estão abertos,
          quem está responsável por cada um e o que já foi concluído.”
        </blockquote>
      </div>
      <h3 className="text-heading mt-6">O que precisamos descobrir?</h3>
      <ul className="mt-2" role="list">
        {discoveryQuestions.map((item) => (
          <li key={item.question}>
            <DiscoveryQuestion {...item} />
          </li>
        ))}
      </ul>
      <div
        className="home-discovery-needs mt-6"
        role="region"
        aria-labelledby="discovery-needs-title"
      >
        <h3 id="discovery-needs-title" className="text-heading flex items-center gap-2">
          <svg
            className="home-discovery-need-icon"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <path d="m8 13 3 3 5-6" />
          </svg>
          Necessidades identificadas
        </h3>
        <p className="text-neutral mt-2 text-sm leading-6">
          A partir do pedido inicial e das respostas do cliente simulado:
        </p>
        <ul className="mt-3 space-y-1" role="list">
          {identifiedNeeds.map((need) => (
            <li key={need.title} className="home-discovery-need">
              <svg
                className="home-discovery-need-icon"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
              <p className="text-neutral text-xs leading-5">
                <strong className="home-discovery-need-title">{need.title}</strong>
                {" — "}
                {need.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 text-center">
        <Button
          variant="primary"
          aria-controls="home-process-details"
          onClick={onContinue}
        >
          <ArrowIcon />
          <span>Próxima etapa: análise dos requisitos</span>
        </Button>
      </div>
    </>
  );
}
