import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import horizontalColorLogo from "../../assets/brand/logo_name.svg";
import horizontalLightLogo from "../../assets/brand/logo_name_all_white.svg";
import { osLoginUrl } from "../../shared/lib/osLinks";

type PublicLayoutProps = {
  children: ReactNode;
};

function PublicLayout({ children }: PublicLayoutProps) {
  const { pathname } = useLocation();
  const sectionHref = (section: string) =>
    pathname === "/" ? `#${section}` : `/#${section}`;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-surface border-b border-neutral-bg">
        <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between gap-6 px-4 sm:px-6">
          <Link
            to="/"
            aria-label="Ir para a página inicial"
            className="rounded-ui shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <img
              src={horizontalColorLogo}
              alt=""
              className="h-9 w-auto sm:h-11"
            />
          </Link>

          <nav
            aria-label="Navegação principal"
            className="ml-auto hidden items-center gap-7 md:flex"
          >
            <a
              href={sectionHref("projetos")}
              className="text-neutral hover:text-foreground rounded-ui text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Projetos
            </a>
            <a
              href={sectionHref("sobre")}
              className="text-neutral hover:text-foreground rounded-ui text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Sobre
            </a>
            <a
              href={sectionHref("contato")}
              className="text-neutral hover:text-foreground rounded-ui text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Contato
            </a>
          </nav>

          <a
            href={osLoginUrl}
            aria-label="Acessar o Sistema OS"
            className="border-neutral-bg text-foreground hover:border-primary hover:text-primary rounded-ui border bg-surface px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-4"
          >
            <span className="sm:hidden">Sistema</span>
            <span className="hidden sm:inline">Acessar sistema</span>
          </a>
        </div>
      </header>

      <main id="conteudo" className="flex flex-1">
        {children}
      </main>

      <footer className="border-primary/40 border-t-2 bg-slate-950 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-start gap-3">
            <Link
              to="/"
              aria-label="Ir para a página inicial"
              className="rounded-ui w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <img src={horizontalLightLogo} alt="" className="h-9 w-auto" />
            </Link>
            <p className="text-slate-400">
              Desenvolvedor full stack · Produtos web completos
            </p>
          </div>
          <a
            href="https://github.com/LeoPassos98"
            target="_blank"
            rel="noreferrer"
            className="rounded-ui w-fit font-medium text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

export { PublicLayout };
