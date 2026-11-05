import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowIcon, Button } from "../../../components/ui/PortfolioUI";
import { RequirementsIcon } from "./RequirementsIcon";
import type { RequirementsIconKind } from "./RequirementsIcon";

// The needs follow Levantamento. Questions and analysis are explanatory synthesis;
// rules and limits come from the consolidated Notion RFs and conceptual model.
const analysisCases = [
  {
    id: "centralizacao",
    label: "Centralização",
    need: "Reunir informações dispersas.",
    title: "Organizar as informações em torno do atendimento.",
    concept: ["Cliente", "Ordens de serviço"],
    connection: "→",
    conceptLabel: "Um cliente pode ter várias ordens; cada ordem pertence a um único cliente.",
    question: "Quais informações pertencem ao cliente e quais pertencem a cada atendimento?",
    analysis:
      "Separar o cadastro do cliente dos dados do serviço e estabelecer o vínculo entre eles, evitando tratar cada atendimento como um novo cliente.",
    rules: [
      "Cada atendimento é registrado como uma OS, vinculada a um cliente e a um responsável por vez.",
      "Descrição, valor, observações e situação pertencem à ordem de serviço.",
    ],
    restriction:
      "O cliente é definido na criação da OS e não pode ser trocado depois.",
    references: "RF-11 · RF-11A · RF-12 · RF-13 · Modelo conceitual",
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
    need: "Conhecer o andamento dos serviços.",
    title: "Definir o que cada situação permite fazer.",
    concept: ["Situação da ordem", "Ações permitidas"],
    connection: "→",
    conceptLabel: "A situação da ordem condiciona as ações permitidas ao usuário.",
    question: "Quais são os estados do atendimento e quem pode alterá-los?",
    analysis:
      "Distinguir serviços aguardando, em andamento, concluídos e cancelados, examinando as permissões de alteração em cada situação.",
    rules: [
      "Toda nova OS começa como Aguardando.",
      "O funcionário responsável pode atualizar suas ordens enquanto estão Aguardando ou Em andamento, conforme os campos permitidos.",
    ],
    restriction:
      "Ordens Concluídas ou Canceladas são somente leitura para o funcionário.",
    references: "RF-14 · RF-14A · RF-16",
  },
  {
    id: "responsabilidades",
    label: "Responsabilidades",
    need: "Identificar quem cuida de cada serviço.",
    title: "Separar atribuição do serviço e acesso ao sistema.",
    concept: ["Ordem de serviço", "Um responsável atual"],
    connection: "→",
    conceptLabel: "Cada ordem tem exatamente um funcionário responsável por vez.",
    question: "Quem pode receber uma ordem e quem pode transferi-la para outra pessoa?",
    analysis:
      "Definir o responsável atual por cada atendimento e distinguir o funcionário que executa serviços da conta usada para acessar o sistema.",
    rules: [
      "Cada OS possui um único funcionário responsável por vez.",
      "Um funcionário pode existir sem conta de usuário; conceder acesso é uma ação administrativa separada.",
    ],
    restriction:
      "Somente o administrador pode trocar o responsável, por um funcionário ativo. Ordens concluídas ou canceladas precisam ser reabertas antes dessa troca.",
    references: "RF-04 · RF-04F · RF-13 · RF-17",
  },
  {
    id: "controle-acesso",
    label: "Controle de acesso",
    need: "Diferenciar quem pode consultar ou alterar.",
    title: "Consultar uma ordem não significa poder editá-la.",
    concept: ["Permissão de consulta", "Permissão de edição"],
    connection: "≠",
    conceptLabel: "A permissão de consulta é diferente da permissão de edição.",
    question: "Quais perfis existem e quais informações e operações cada um pode acessar?",
    analysis:
      "Examinar as ações dos perfis Administrador e Funcionário, considerando também a responsabilidade pela OS, sua visibilidade e seu status.",
    rules: [
      "O funcionário consulta as ordens atribuídas a ele e as marcadas como públicas.",
      "A edição das próprias ordens depende do status e dos campos autorizados.",
    ],
    restriction:
      "Uma OS pública de outro responsável é somente para consulta. Ordens privadas não atribuídas ao funcionário não devem ser exibidas.",
    references: "RF-02 · RF-03 · RF-16 · RF-16A · RF-16B",
  },
  {
    id: "rastreabilidade",
    label: "Rastreabilidade",
    need: "Consultar mudanças anteriores.",
    title: "Preservar o contexto de cada alteração.",
    concept: ["Estado anterior", "Versão preservada"],
    connection: "→",
    conceptLabel: "O estado anterior da ordem é preservado antes de uma alteração persistida.",
    question: "O que mudou, quando mudou e quem realizou a alteração?",
    analysis:
      "Definir quais dados precisam ser preservados para consultar o passado da ordem, sem depender apenas de seu estado atual.",
    rules: [
      "Antes de uma alteração persistida nos dados de negócio da OS, o estado anterior é preservado como uma versão histórica.",
      "O registro identifica a versão, a data, o autor e os dados anteriores da ordem.",
    ],
    restriction:
      "Consultar o histórico também exige permissão: o funcionário acessa apenas o de suas ordens ou das atualmente públicas.",
    references: "RF-21 · RF-22 · RF-23 · RF-24",
  },
  {
    id: "visao-geral",
    label: "Visão geral",
    need: "Compreender a situação da operação.",
    title: "Distinguir a situação atual do desempenho no período.",
    concept: ["Estado atual", "Desempenho no período"],
    connection: "≠",
    conceptLabel: "Indicadores do estado atual são distintos das métricas de desempenho no período.",
    question: "Quais indicadores ajudam cada perfil a compreender seu trabalho e a operação?",
    analysis:
      "Separar indicadores do momento, como ordens em aberto, de métricas temporais, como ordens concluídas, respeitando o alcance de cada perfil.",
    rules: [
      "O administrador acompanha a operação global; o funcionário consulta indicadores do próprio trabalho.",
      "O seletor de período afeta as métricas de desempenho, sem alterar os indicadores de estado atual.",
    ],
    restriction:
      "Valor das ordens concluídas não representa recebimentos: o MVP não controla pagamentos nem notas fiscais.",
    references: "Revisão aprovada — Dashboard por perfil e métricas temporais",
  },
  {
    id: "facilidade-consulta",
    label: "Facilidade de consulta",
    need: "Encontrar informações de forma simples.",
    title: "Transformar a procura em critérios de consulta.",
    concept: ["Busca e filtros", "Resultados autorizados"],
    connection: "→",
    conceptLabel: "Busca e filtros retornam apenas as ordens que o usuário tem permissão para consultar.",
    question: "Como as pessoas procuram um atendimento e quais critérios ajudam a encontrá-lo?",
    analysis:
      "Identificar os termos de busca e os filtros úteis à rotina, permitindo combiná-los para localizar os serviços relevantes.",
    rules: [
      "A busca rápida aceita número da OS ou nome do cliente.",
      "Os filtros por status, responsável e período podem ser combinados com a busca.",
    ],
    restriction:
      "Buscar ou filtrar não amplia o acesso: os resultados sempre respeitam o escopo de visualização do usuário.",
    references: "RF-25",
  },
] as const;

const guidedCase = analysisCases.find((item) => item.id === "controle-acesso") ?? analysisCases[0];
const additionalCases = analysisCases.filter((item) => item.id !== guidedCase.id);

function AnalysisExplanation({ item }: { item: (typeof analysisCases)[number] }) {
  return (
    <>
      <div className="home-analysis-interpretation">
        <p className="home-analysis-stage-label home-requirements-label">
          <RequirementsIcon kind="question" />
          <span>Análise da necessidade</span>
        </p>
        <p>{item.analysis}</p>
      </div>
      <div className="home-analysis-definition">
        <p className="home-analysis-stage-label home-requirements-label">
          <RequirementsIcon kind="checklist" />
          <span>Regras documentadas no projeto</span>
        </p>
        <ul className="home-requirements-checklist mt-2" role="list">
          {item.rules.map((rule) => (
            <li key={rule}>
              <RequirementsIcon kind="check" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        <p className="home-analysis-references">Referências: {item.references}</p>
      </div>
      <div className="home-analysis-constraint">
        <p className="home-analysis-stage-label home-requirements-label">
          <RequirementsIcon kind="shield" />
          <span>Limite a respeitar</span>
        </p>
        <p>{item.restriction}</p>
      </div>
    </>
  );
}

function AnalysisDisclosure({
  summary,
  icon = "document",
  children,
}: {
  summary: string;
  icon?: RequirementsIconKind;
  children: ReactNode;
}) {
  return (
    <details
      className="home-analysis-evidence"
      name="requirements-analysis-depth"
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.open = false;
        }
      }}
    >
      <summary>
        <span className="home-requirements-label">
          <RequirementsIcon kind={icon} />
          <span>{summary}</span>
        </span>
        <svg className="home-analysis-evidence-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      {children}
    </details>
  );
}

export function RequirementsAnalysisDetails({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const [selectedId, setSelectedId] = useState<(typeof additionalCases)[number]["id"]>(
    additionalCases[0].id,
  );
  const currentCase = additionalCases.find((item) => item.id === selectedId) ?? additionalCases[0];

  return (
    <>
      <p id="home-process-detail-summary" className="text-neutral text-sm leading-6">
        Exemplo:{" "}
        <Link to="/projetos/sistema-os" className="site-text-link site-text-link--plain">
          Sistema de Gestão de Ordens de Serviço
        </Link>
      </p>
      <p className="text-foreground mt-3 text-sm leading-6">
        No levantamento, apareceu uma necessidade: diferenciar quem pode consultar
        ou alterar informações. Veja como esse pedido do cliente simulado se
        transforma em uma regra clara para o sistema.
      </p>

      <div className="home-analysis-decision mt-5" role="region" aria-labelledby="analysis-guided-title">
        <p className="home-analysis-stage-label home-requirements-label text-sm">
          <RequirementsIcon kind="shield" />
          <span>Exemplo guiado · Controle de acesso</span>
        </p>
        <h3 id="analysis-guided-title" className="text-heading">De um pedido a uma decisão.</h3>
        <ol className="home-requirements-journey mt-4">
          <li className="home-requirements-request">
            <span className="home-requirements-journey-number" aria-hidden="true">
              <RequirementsIcon kind="conversation" />
              <span>01</span>
            </span>
            <div>
              <h4>Levantamento · o que o cliente precisa</h4>
              <p>O cliente pede acessos individuais e que nem todos possam alterar tudo.</p>
            </div>
          </li>
          <li aria-current="step">
            <span className="home-requirements-journey-number" aria-hidden="true">
              <RequirementsIcon kind="question" />
              <span>02</span>
            </span>
            <div>
              <h4>Análise · o que preciso esclarecer</h4>
              <p>Quais informações cada perfil pode consultar ou modificar? A responsabilidade pelo serviço e a situação da ordem também precisam ser consideradas.</p>
            </div>
          </li>
          <li className="home-requirements-journey-response">
            <span className="home-requirements-journey-number" aria-hidden="true">
              <RequirementsIcon kind="checklist" />
              <span>03</span>
            </span>
            <div className="home-requirements-bubble">
              <h4>Especificação · como a regra fica definida</h4>
              <p>O funcionário pode consultar uma ordem pública de outro responsável, mas não pode editá-la.</p>
            </div>
          </li>
        </ol>
        <div className="home-analysis-concept" role="img" aria-label={guidedCase.conceptLabel}>
          <span className="home-analysis-concept-node" aria-hidden="true">Permissão de consulta</span>
          <span className="home-analysis-concept-connection" aria-hidden="true">≠</span>
          <span className="home-analysis-concept-node" aria-hidden="true">Permissão de edição</span>
        </div>
        <AnalysisDisclosure summary="Aprofundar esta decisão e ver referências">
          <AnalysisExplanation item={guidedCase} />
        </AnalysisDisclosure>
      </div>

      <div className="mt-5">
        <AnalysisDisclosure summary="Explorar as outras 6 necessidades" icon="checklist">
          <p className="text-neutral mt-3 text-sm leading-6">
            O mesmo raciocínio se aplica às demais necessidades do levantamento.
            Selecione uma para consultar sua análise.
          </p>
          <div className="home-analysis-topics mt-3" role="group" aria-label="Escolher outra necessidade identificada">
            {additionalCases.map((item) => (
              <Button
                key={item.id}
                variant={currentCase.id === item.id ? "primary" : "secondary"}
                size="sm"
                aria-pressed={currentCase.id === item.id}
                aria-controls="analysis-current-decision"
                onClick={() => setSelectedId(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div
            id="analysis-current-decision"
            className="home-analysis-decision mt-4"
            role="region"
            aria-labelledby="analysis-current-title"
          >
            <p className="home-analysis-stage-label text-sm">{currentCase.label} — {currentCase.need}</p>
            <h3 id="analysis-current-title" className="text-heading">{currentCase.title}</h3>
            <div className="home-analysis-concept" role="img" aria-label={currentCase.conceptLabel}>
              <span className="home-analysis-concept-node" aria-hidden="true">{currentCase.concept[0]}</span>
              <span className="home-analysis-concept-connection" aria-hidden="true">{currentCase.connection}</span>
              <span className="home-analysis-concept-node" aria-hidden="true">{currentCase.concept[1]}</span>
            </div>
            <div className="home-analysis-question">
              <RequirementsIcon kind="question" />
              <div>
                <p className="home-analysis-stage-label">O que analisar?</p>
                <p>{currentCase.question}</p>
              </div>
            </div>
            <AnalysisExplanation item={currentCase} />
          </div>
        </AnalysisDisclosure>
      </div>

      <div className="mt-5 text-center">
        <Button variant="primary" aria-controls="home-process-details" aria-label="Continuar o exemplo em Especificação dos requisitos" onClick={onContinue}>
          <ArrowIcon />
          <span>Continuar o exemplo</span>
        </Button>
      </div>
    </>
  );
}
