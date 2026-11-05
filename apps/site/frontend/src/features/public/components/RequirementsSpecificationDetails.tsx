import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";
import { ArrowIcon, Button } from "../../../components/ui/PortfolioUI";
import { RequirementsIcon } from "./RequirementsIcon";
import type { RequirementsIconKind } from "./RequirementsIcon";

// This selection follows the seven needs examined in Análise. RF/RNF identifiers
// belong to the official Notion specification; the wording here is a summary.
const specificationCases = [
  {
    id: "centralizacao",
    label: "Centralização",
    need: "Reunir informações dispersas.",
    decision: "Separar os dados do cliente dos dados de cada atendimento e relacioná-los.",
    title: "Cadastrar clientes e registrar seus atendimentos.",
    concept: ["Cliente e atendimento", "OS vinculada"],
    conceptLabel: "A separação entre cliente e atendimento se traduz em uma ordem vinculada ao cliente.",
    requirements: [
      {
        title: "Gerenciar clientes",
        references: "RF-08 · RF-09",
        description: "Permitir que administradores e funcionários autenticados cadastrem, consultem e atualizem os dados dos clientes.",
        acceptance: [
          "Ao cadastrar dados válidos, o cliente deve ser salvo e aparecer na consulta de clientes ativos.",
          "Ao consultar um cliente, seus dados cadastrais devem ser exibidos.",
          "Ao salvar uma atualização válida, a nova informação deve aparecer na consulta seguinte.",
        ],
      },
      {
        title: "Registrar uma ordem vinculada ao cliente",
        references: "RF-11 · RF-11A · RF-11C · RF-12 · RF-13",
        description: "Registrar cada OS com um cliente ativo, um responsável e os dados do serviço, mantendo o cliente associado após a criação.",
        acceptance: [
          "Ao criar uma OS válida, a consulta deve exibir o cliente, o responsável e os dados do serviço informados.",
          "Se o cliente estiver inativo no momento da gravação, a criação deve ser recusada.",
          "Uma tentativa de trocar o cliente de uma OS existente deve ser recusada, preservando o vínculo original.",
        ],
      },
    ],
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
    need: "Conhecer o andamento dos serviços.",
    decision: "Definir os estados do atendimento e quais alterações são permitidas em cada situação.",
    title: "Registrar a situação e controlar suas alterações.",
    concept: ["Situação da ordem", "Atualização autorizada"],
    conceptLabel: "A situação da ordem determina quais atualizações o funcionário responsável pode realizar.",
    requirements: [
      {
        title: "Identificar a situação do atendimento",
        references: "RF-14 · RF-14A",
        description: "Utilizar os estados Aguardando, Em andamento, Concluído e Cancelado, iniciando toda nova OS como Aguardando.",
        acceptance: [
          "Uma OS recém-criada deve apresentar o status Aguardando, sem escolha de outro status no cadastro.",
          "Uma tentativa de gravar um status fora dos quatro estados definidos deve ser recusada.",
        ],
      },
      {
        title: "Atualizar conforme o status e a responsabilidade",
        references: "RF-16",
        description: "Permitir ao funcionário responsável editar os campos autorizados de suas OS Aguardando ou Em andamento; ordens encerradas ficam somente para consulta.",
        acceptance: [
          "Ao alterar a descrição de sua OS Aguardando ou Em andamento, o funcionário deve conseguir salvar e consultar a nova descrição.",
          "Ao tentar editar uma OS Concluída, o funcionário deve receber uma recusa, sem alteração dos dados.",
          "Ao tentar editar uma OS Cancelada, o funcionário deve receber uma recusa, sem alteração dos dados.",
        ],
      },
    ],
  },
  {
    id: "responsabilidades",
    label: "Responsabilidades",
    need: "Identificar quem cuida de cada serviço.",
    decision: "Manter um responsável atual por OS e reservar a redistribuição ao administrador.",
    title: "Atribuir e transferir serviços com regras explícitas.",
    concept: ["Um responsável atual", "Atribuição controlada"],
    conceptLabel: "A responsabilidade única pela ordem exige regras para sua atribuição e transferência.",
    requirements: [
      {
        title: "Definir o responsável na criação",
        references: "RF-13 · RF-13B",
        description: "Exigir um responsável ativo: o administrador o seleciona; para o funcionário, o próprio usuário autenticado é atribuído automaticamente.",
        acceptance: [
          "Ao criar uma OS como administrador com um funcionário ativo selecionado, a ordem deve ser atribuída a essa pessoa.",
          "Ao criar uma OS como funcionário, ele próprio deve ser o responsável, sem possibilidade de escolher outra pessoa.",
          "A criação com um responsável inativo deve ser recusada.",
        ],
      },
      {
        title: "Controlar a troca de responsável",
        references: "RF-17",
        description: "Permitir a troca somente ao administrador, por um funcionário ativo, em ordens Aguardando ou Em andamento.",
        acceptance: [
          "Ao transferir uma OS Aguardando ou Em andamento para um funcionário ativo, o administrador deve conseguir salvar e consultar o novo responsável.",
          "Uma tentativa de transferência feita por funcionário deve ser recusada, mantendo o responsável anterior.",
          "A troca deve ser recusada se o novo responsável estiver inativo.",
          "Uma OS Concluída ou Cancelada deve impedir a troca direta até ser reaberta.",
        ],
      },
    ],
  },
  {
    id: "controle-acesso",
    label: "Controle de acesso",
    need: "Diferenciar quem pode consultar ou alterar.",
    decision: "Distinguir perfil, visibilidade, responsabilidade e permissão de edição.",
    title: "Aplicar permissões a cada consulta e alteração.",
    concept: ["Perfil e contexto da OS", "Operação permitida"],
    conceptLabel: "O perfil e o contexto da ordem determinam se uma operação é permitida.",
    requirements: [
      {
        title: "Restringir a consulta das ordens",
        references: "RF-01 · RF-03 · RF-16A",
        description: "Exigir autenticação e permitir ao funcionário consultar suas ordens e as públicas, sem expor ordens privadas de outros responsáveis.",
        acceptance: [
          "Uma solicitação de consulta protegida sem sessão válida deve ser recusada.",
          "O funcionário deve conseguir consultar uma OS atribuída a ele e uma OS pública de outro responsável.",
          "A consulta de uma OS privada de outro responsável deve ser recusada, inclusive por solicitação direta ao sistema.",
        ],
      },
      {
        title: "Separar consulta de edição",
        references: "RF-03 · RF-16 · RF-16B",
        description: "Manter uma OS pública de outro responsável somente para leitura; permitir a edição das próprias ordens apenas nos campos e estados autorizados.",
        acceptance: [
          "Ao tentar alterar uma OS pública de outro responsável, o funcionário deve receber uma recusa, preservando os dados.",
          "Na própria OS Em andamento, o funcionário deve conseguir alterar um campo permitido, como a descrição.",
          "Uma tentativa do funcionário de trocar o número da própria OS deve ser recusada.",
        ],
      },
    ],
  },
  {
    id: "rastreabilidade",
    label: "Rastreabilidade",
    need: "Consultar mudanças anteriores.",
    decision: "Preservar versões anteriores com os dados, a data e o autor de cada alteração.",
    title: "Registrar versões e permitir consultar o histórico.",
    concept: ["Alteração da OS", "Versão anterior preservada"],
    conceptLabel: "Cada alteração persistida deve preservar a versão anterior da ordem no histórico.",
    requirements: [
      {
        title: "Preservar o estado anterior",
        references: "RF-21 · RF-22 · RF-23 · RF-23A",
        description: "Antes de uma alteração persistida, registrar a versão anterior e seu autor; salvar o histórico e a atualização em uma única operação.",
        acceptance: [
          "Após uma alteração salva, o histórico deve preservar descrição, valor, observações, status, visibilidade e responsável anteriores.",
          "A versão preservada deve identificar o número da versão, a data e hora da alteração e o usuário que a realizou.",
          "Se a gravação do histórico ou da atualização falhar, nenhuma das duas alterações deve persistir.",
        ],
      },
      {
        title: "Consultar versões com permissão",
        references: "RF-24",
        description: "Exibir o histórico em ordem cronológica, respeitando as permissões de consulta da OS.",
        acceptance: [
          "Para uma OS com mais de uma alteração, o usuário autorizado deve conseguir consultar as versões em ordem cronológica.",
          "O administrador deve conseguir consultar o histórico de qualquer OS.",
          "O funcionário deve conseguir consultar o histórico de suas OS e das atualmente públicas; o histórico de uma OS privada de outro responsável deve ser recusado.",
        ],
      },
    ],
  },
  {
    id: "visao-geral",
    label: "Visão geral",
    need: "Compreender a situação da operação.",
    decision: "Separar indicadores atuais de métricas temporais e ajustar o alcance ao perfil.",
    title: "Exibir indicadores com escopo e período definidos.",
    concept: ["Perfil e período", "Indicadores correspondentes"],
    conceptLabel: "Os indicadores devem respeitar o perfil e aplicar o período somente às métricas temporais.",
    requirements: [
      {
        title: "Respeitar o escopo de cada perfil",
        references: "Revisão aprovada — Dashboard por perfil e métricas temporais",
        description: "Apresentar a visão global ao administrador e os indicadores do próprio trabalho ao funcionário.",
        acceptance: [
          "Com OS atribuídas a funcionários diferentes, as ordens em aberto do funcionário devem contar apenas as atribuídas a ele.",
          "Para o administrador, as ordens em aberto devem considerar toda a operação.",
          "O valor das ordens concluídas deve ser identificado por esse nome, sem ser apresentado como valor recebido ou faturamento contábil.",
        ],
      },
      {
        title: "Aplicar o período às métricas corretas",
        references: "Revisão aprovada — Dashboard por perfil e métricas temporais",
        description: "Usar as datas de conclusão ou cancelamento nas métricas temporais, sem aplicar o seletor aos indicadores de estado atual.",
        acceptance: [
          "Ao selecionar um período, o total de ordens concluídas deve considerar suas datas de conclusão dentro desse intervalo.",
          "Ao selecionar um período, o total de ordens canceladas deve considerar suas datas de cancelamento dentro desse intervalo.",
          "Sem alterações nos dados, trocar o período não deve mudar a quantidade atual de ordens em aberto.",
        ],
      },
    ],
  },
  {
    id: "facilidade-consulta",
    label: "Facilidade de consulta",
    need: "Encontrar informações de forma simples.",
    decision: "Combinar termos de busca e filtros sem ampliar as permissões de consulta.",
    title: "Localizar ordens por critérios da rotina.",
    concept: ["Busca e filtros combinados", "Ordens correspondentes"],
    conceptLabel: "A consulta deve retornar ordens que correspondam à busca e aos filtros, dentro das permissões do usuário.",
    requirements: [
      {
        title: "Buscar e filtrar ordens",
        references: "RF-25",
        description: "Permitir busca por número da OS ou nome do cliente e filtros combináveis por status, responsável e período.",
        acceptance: [
          "Ao buscar pelo número de uma OS acessível ao usuário, a ordem correspondente deve ser retornada.",
          "Ao buscar pelo nome do cliente, devem ser retornadas as OS correspondentes que o usuário pode consultar.",
          "Ao combinar busca e filtros, cada resultado deve atender a todos os critérios selecionados.",
          "Uma OS privada de outro responsável não deve aparecer nos resultados do funcionário, mesmo que corresponda à busca e aos filtros.",
        ],
      },
    ],
  },
] as const;

const qualityRequirements = [
  {
    title: "Responsividade",
    references: "RNF-02",
    description: "A interface deve ser utilizável em computador e celular.",
    acceptance: [
      "Nas duas apresentações, deve ser possível preencher e concluir os cadastros, com os campos e ações acessíveis.",
      "Nas duas apresentações, deve ser possível consultar registros e ler seus dados.",
    ],
  },
  {
    title: "Usabilidade",
    references: "RNF-03",
    description: "As tarefas devem ser claras, previsíveis e informar o resultado das ações.",
    acceptance: [
      "Ao falhar uma validação, o formulário deve indicar o campo a corrigir e o motivo.",
      "Após uma criação ou alteração, a interface deve informar se a operação foi concluída ou se ocorreu erro.",
    ],
  },
  {
    title: "Acessibilidade",
    references: "RNF-04",
    description: "Os fluxos principais devem ser operáveis por teclado e os controles devem ter identificação acessível.",
    acceptance: [
      "As funcionalidades principais devem poder ser acionadas por teclado, sem bloqueio de foco.",
      "Cada controle acessado por teclado deve apresentar foco visível.",
      "Campos devem ter rótulos associados e controles apenas com ícone devem ter nome acessível.",
    ],
  },
  {
    title: "Integridade das alterações",
    references: "RF-23B",
    description: "Uma edição desatualizada não deve sobrescrever uma versão mais recente da OS.",
    acceptance: [
      "Ao salvar uma versão desatualizada, a tentativa deve ser recusada sem sobrescrever dados recentes nem criar histórico da tentativa rejeitada.",
      "A interface deve preservar os valores em edição, informar o conflito e oferecer a ação Recarregar dados.",
    ],
  },
] as const;

type SpecifiedRequirement = {
  title: string;
  references: string;
  description: string;
  acceptance: readonly string[];
};

function RequirementEntry({
  requirement,
  headingAs: Heading = "h4",
}: {
  requirement: SpecifiedRequirement;
  headingAs?: "h3" | "h4";
}) {
  return (
    <div className="home-specification-entry" role="group" aria-label={requirement.title}>
      <Heading className="home-analysis-stage-label home-requirements-label">
        <RequirementsIcon kind="document" />
        <span>{requirement.title}</span>
      </Heading>
      <p className="home-analysis-references">Referências: {requirement.references}</p>
      <p className="mt-2">{requirement.description}</p>
      <p className="home-analysis-stage-label home-requirements-label mt-3">
        <RequirementsIcon kind="checklist" />
        <span>Critérios de aceitação</span>
      </p>
      <ul className="home-requirements-checklist" role="list">
        {requirement.acceptance.map((criterion) => (
          <li key={criterion}>
            <RequirementsIcon kind="check" />
            <span>{criterion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpecificationDisclosure({
  summary,
  icon = "document",
  children,
}: {
  summary: string;
  icon?: RequirementsIconKind;
  children: ReactNode;
}) {
  function closeOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key === "Escape" && event.currentTarget.open) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.open = false;
    }
  }

  return (
    <details
      className="home-analysis-evidence"
      name="requirements-specification-details"
      onKeyDown={closeOnEscape}
    >
      <summary>
        <span className="home-requirements-label">
          <RequirementsIcon kind={icon} />
          <span>{summary}</span>
        </span>
        <svg
          className="home-analysis-evidence-chevron"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      {children}
    </details>
  );
}

const guidedCase = specificationCases.find((item) => item.id === "controle-acesso") ?? specificationCases[0];
const additionalCases = specificationCases.filter((item) => item.id !== guidedCase.id);

export function RequirementsSpecificationDetails({
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
        Depois de distinguir consulta e edição, descrevo o comportamento esperado
        e como verificar se a regra foi atendida. O exemplo de controle de acesso
        continua aqui.
      </p>

      <div className="home-analysis-decision mt-5" role="region" aria-labelledby="specification-guided-title">
        <p className="home-analysis-stage-label home-requirements-label text-sm">
          <RequirementsIcon kind="shield" />
          <span>Exemplo guiado · Controle de acesso</span>
        </p>
        <h3 id="specification-guided-title" className="text-heading">Da decisão a um comportamento verificável.</h3>
        <dl className="home-requirements-context mt-4">
          <div className="home-requirements-request">
            <dt className="home-requirements-label">
              <RequirementsIcon kind="conversation" />
              <span>Necessidade identificada</span>
            </dt>
            <dd>Diferenciar quem pode consultar ou alterar informações.</dd>
          </div>
          <div className="home-requirements-bubble">
            <dt className="home-requirements-label">
              <RequirementsIcon kind="question" />
              <span>Decisão da análise</span>
            </dt>
            <dd>A permissão de consulta não concede permissão de edição.</dd>
          </div>
        </dl>
        <div className="home-analysis-definition">
          <h4 className="home-analysis-stage-label home-requirements-label">
            <RequirementsIcon kind="shield" />
            <span>O que o sistema deve fazer</span>
          </h4>
          <p>Permitir que o funcionário consulte uma ordem pública de outro responsável, sem autorizar alterações.</p>
        </div>
        <div className="home-requirements-verification mt-4">
          <h4 className="home-analysis-stage-label home-requirements-label">
            <RequirementsIcon kind="checklist" />
            <span>Como verificar essa regra</span>
          </h4>
          <p>Com um funcionário autenticado e uma ordem pública atribuída a outra pessoa:</p>
          <ul className="home-requirements-checklist mt-2" role="list">
            <li>
              <RequirementsIcon kind="check" />
              <span>A consulta deve exibir a ordem.</span>
            </li>
            <li>
              <RequirementsIcon kind="check" />
              <span>Uma tentativa de alteração deve ser recusada, inclusive por uma solicitação direta ao sistema.</span>
            </li>
            <li>
              <RequirementsIcon kind="check" />
              <span>Após a tentativa recusada, os dados da ordem devem permanecer iguais.</span>
            </li>
          </ul>
        </div>
        <p className="text-neutral mt-3 text-sm leading-6">
          Esses são os critérios de aceitação: condições que orientam a validação da regra.
        </p>
        <SpecificationDisclosure summary="Ver requisitos e referências deste exemplo">
          {guidedCase.requirements.map((requirement) => (
            <RequirementEntry key={requirement.title} requirement={requirement} headingAs="h4" />
          ))}
        </SpecificationDisclosure>
      </div>

      <div className="mt-5">
        <SpecificationDisclosure summary="Explorar as outras 6 necessidades" icon="checklist">
          <p className="text-neutral mt-3 text-sm leading-6">
            Consulte outros recortes da especificação do projeto. As referências
            mantêm os identificadores oficiais; os critérios descrevem o que deve
            ser verificado na validação.
          </p>
          <div className="home-analysis-topics mt-3" role="group" aria-label="Escolher outra necessidade para consultar os requisitos">
            {additionalCases.map((item) => (
              <Button
                key={item.id}
                variant={currentCase.id === item.id ? "primary" : "secondary"}
                size="sm"
                aria-pressed={currentCase.id === item.id}
                aria-controls="specification-current-requirements"
                onClick={() => setSelectedId(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div
            id="specification-current-requirements"
            className="home-analysis-decision mt-4"
            role="region"
            aria-labelledby="specification-current-title"
          >
            <p className="home-analysis-stage-label text-sm">{currentCase.label} — {currentCase.need}</p>
            <h3 id="specification-current-title" className="text-heading">{currentCase.title}</h3>
            <div className="home-analysis-concept" role="img" aria-label={currentCase.conceptLabel}>
              <span className="home-analysis-concept-node" aria-hidden="true">{currentCase.concept[0]}</span>
              <span className="home-analysis-concept-connection" aria-hidden="true">→</span>
              <span className="home-analysis-concept-node" aria-hidden="true">{currentCase.concept[1]}</span>
            </div>
            <div className="home-analysis-interpretation">
              <p className="home-analysis-stage-label">Definição da análise</p>
              <p>{currentCase.decision}</p>
            </div>
            {currentCase.requirements.map((requirement) => (
              <RequirementEntry key={requirement.title} requirement={requirement} headingAs="h4" />
            ))}
          </div>
        </SpecificationDisclosure>
        <SpecificationDisclosure summary="Aprofundar qualidade e integridade dos fluxos" icon="shield">
          <p className="text-neutral mt-3 text-sm leading-6">Condições que também orientam a implementação e a validação do projeto.</p>
          {qualityRequirements.map((requirement) => (
            <RequirementEntry key={requirement.title} requirement={requirement} headingAs="h3" />
          ))}
        </SpecificationDisclosure>
      </div>

      <div className="mt-5 text-center">
        <Button variant="primary" aria-controls="home-process-details" aria-label="Próxima etapa: validação dos requisitos" onClick={onContinue}>
          <ArrowIcon />
          <span>Seguir para validação</span>
        </Button>
      </div>
    </>
  );
}
