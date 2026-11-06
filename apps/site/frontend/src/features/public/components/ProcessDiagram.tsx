type DiagramKind = "discovery" | "architecture" | "development" | "validation";
type DiagramIconKind =
  | "conversation"
  | "list"
  | "target"
  | "interface"
  | "server"
  | "database"
  | "ai"
  | "code"
  | "person"
  | "check"
  | "search"
  | "adjust";

const iconPaths: Record<DiagramIconKind, string> = {
  conversation: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4ZM7 8h10M7 12h7",
  list: "M9 6h11M9 12h11M9 18h11m-17-12 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2",
  target: "M21 12a9 9 0 1 1-9-9m5 0v4h4m-4 0-5 5m4 0a4 4 0 1 1-4-4",
  interface: "M3 4h18v16H3ZM3 9h18M6 6.5h.01M9 6.5h.01M7 13h4M7 16h8",
  server: "M4 3h16v7H4Zm0 11h16v7H4ZM7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6M12 10v4",
  database: "M20 6c0 2-3.6 3-8 3S4 8 4 6s3.6-3 8-3 8 1 8 3ZM4 6v12c0 2 3.6 3 8 3s8-1 8-3V6M4 12c0 2 3.6 3 8 3s8-1 8-3",
  ai: "M7 7h10v10H7ZM10 10h4v4h-4ZM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16",
  person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-3a6 6 0 0 1 12 0m0 1 2 2 4-5",
  check: "M9 4H5v17h14V4h-4M9 2h6v4H9Zm-1 11 3 3 5-6",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6M10 7v4m0 2v.01",
  adjust: "M4 7h4m4 0h8M4 17h8m4 0h4M8 4v6M16 14v6",
};

function DiagramIcon({ kind }: { kind: DiagramIconKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[kind]} />
    </svg>
  );
}

type DiagramStep = { label: string; icon: DiagramIconKind; detail?: string };

const diagrams: Record<DiagramKind, {
  caption: string;
  note: string;
  steps: DiagramStep[];
}> = {
  discovery: {
    caption: "Da necessidade ao escopo",
    note: "Entender o pedido orienta o que vem primeiro.",
    steps: [
      { label: "Pedido inicial", icon: "conversation" },
      { label: "Necessidades identificadas", icon: "list" },
      { label: "Prioridades e escopo", icon: "target" },
    ],
  },
  architecture: {
    caption: "Responsabilidades técnicas",
    note: "Recorte das responsabilidades; não representa toda a arquitetura.",
    steps: [
      { label: "Interface", detail: "React", icon: "interface" },
      { label: "API", detail: "NestJS", icon: "server" },
      { label: "Banco de dados", detail: "PostgreSQL", icon: "database" },
    ],
  },
  development: {
    caption: "Implementação com supervisão",
    note: "Decisões e avaliação sob responsabilidade do desenvolvedor.",
    steps: [
      { label: "Requisitos e contexto", icon: "list" },
      { label: "Apoio da IA", icon: "ai" },
      { label: "Implementação", icon: "code" },
      { label: "Revisão humana", icon: "person" },
    ],
  },
  validation: {
    caption: "Ciclo de verificação",
    note: "A nova validação orienta a continuidade do ciclo.",
    steps: [
      { label: "Testes", icon: "check" },
      { label: "Identificação de problemas", icon: "search" },
      { label: "Ajustes", icon: "adjust" },
      { label: "Nova validação", icon: "check" },
    ],
  },
};

export function ProcessDiagram({ kind }: { kind: DiagramKind }) {
  const { caption, note, steps } = diagrams[kind];

  return (
    <figure className="home-process-diagram" data-kind={kind}>
      <figcaption className="home-process-caption">{caption}</figcaption>
      <ol className="home-process-diagram-flow" aria-label={caption}>
        {steps.map(({ label, detail, icon }, index) => (
          <li key={label}>
            <div className="home-process-diagram-node">
              <DiagramIcon kind={icon} />
              <span>{label}{detail && <small>{detail}</small>}</span>
            </div>
            {(index < steps.length - 1 || kind === "validation") && (
              <svg className="home-process-diagram-arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12h17m-5-5 5 5-5 5" />
              </svg>
            )}
          </li>
        ))}
      </ol>
      <p className="home-process-diagram-note">{note}</p>
    </figure>
  );
}
