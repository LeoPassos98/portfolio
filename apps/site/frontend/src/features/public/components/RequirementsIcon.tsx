export type RequirementsIconKind =
  | "conversation"
  | "question"
  | "checklist"
  | "shield"
  | "document"
  | "check";

// Matches the thin, rounded SVG strokes used by the Levantamento illustrations.
export function RequirementsIcon({ kind }: { kind: RequirementsIconKind }) {
  return (
    <svg
      className="home-requirements-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {(kind === "conversation" || kind === "question") && (
        <>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
          {kind === "question" ? (
            <>
              <path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 1.5-2.5 1.5-2.5 3" />
              <circle cx="12" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
            </>
          ) : (
            <path d="M7 8h10M7 12h7" />
          )}
        </>
      )}
      {kind === "checklist" && (
        <>
          <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
          <rect x="9" y="2" width="6" height="4" rx="1" />
          <path d="m8 13 3 3 5-6" />
        </>
      )}
      {kind === "shield" && (
        <>
          <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
      {kind === "document" && (
        <>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
          <path d="M14 3v6h6M8 13h8M8 17h5" />
        </>
      )}
      {kind === "check" && <path d="m5 12 4 4L19 6" />}
    </svg>
  );
}
