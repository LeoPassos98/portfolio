import type {
  AnchorHTMLAttributes,
  ComponentPropsWithRef,
  HTMLAttributes,
} from "react";
import { Link } from "react-router";

type ActionStyle = {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
};

type ActionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  ActionStyle &
  ({ to: string; href?: never } | { href: string; to?: never });

export function ActionLink({
  variant = "secondary",
  size = "md",
  className = "",
  to,
  href,
  ...props
}: ActionLinkProps) {
  const shared = {
    ...props,
    className: `ui-button ${className}`.trim(),
    "data-variant": variant,
    "data-size": size,
  };
  return to !== undefined ? (
    <Link {...shared} to={to} />
  ) : (
    <a {...shared} href={href} />
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  loading = false,
  disabled,
  children,
  ...props
}: ComponentPropsWithRef<"button"> & ActionStyle & { loading?: boolean }) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={`ui-button ${className}`.trim()}
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <article {...props} className={`ui-card ${className}`.trim()} />;
}

export function Badge({
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={`ui-badge ${className}`.trim()} />;
}

export function ArrowIcon() {
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
