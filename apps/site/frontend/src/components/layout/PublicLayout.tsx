import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import colorLogo from "../../assets/brand/logo_name.svg";
import whiteLogo from "../../assets/brand/logo_name_all_white.svg";
import colorSymbol from "../../assets/brand/logo_symbol.svg";
import whiteSymbol from "../../assets/brand/logo_symbol_all_white.svg";
import { ActionLink, Button } from "../ui/PortfolioUI";

type Theme = "light" | "dark";
const themeKey = "portfolio-theme";
const sections = [
  { id: "projetos", label: "Projetos" },
  { id: "sobre", label: "Sobre" },
  { id: "contato", label: "Contato" },
];

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg
      className="site-theme-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      {dark ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      ) : (
        <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z" />
      )}
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} />
    </svg>
  );
}

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(themeKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Theme still works when browser storage is unavailable. */
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function PublicLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const minimalHeader = pathname === "/";
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const sectionHref = (section: string) =>
    pathname === "/" ? `#${section}` : `/#${section}`;

  useEffect(() => {
    try {
      localStorage.setItem(themeKey, theme);
    } catch {
      /* Optional preference. */
    }
  }, [theme]);

  useEffect(() => {
    if (pathname !== "/") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActiveSection(
          sections.find((section) => visible.has(section.id))?.id ?? "",
        );
      },
      { rootMargin: "-15% 0px -50% 0px" },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menu.current?.contains(event.target) &&
        !menuButton.current?.contains(event.target)
      )
        setMenuOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    const media = matchMedia("(min-width: 48rem)");
    const onResize = () => {
      if (media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      media.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  function navLinks() {
    return sections.map((section) => (
      <a
        key={section.id}
        href={sectionHref(section.id)}
        className="site-nav-link"
        aria-current={
          pathname !== "/" && section.id === "projetos"
            ? "page"
            : pathname === "/" && activeSection === section.id
              ? "location"
              : undefined
        }
        onClick={() => {
          if (menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        {section.label}
      </a>
    ));
  }

  return (
    <div
      className={`portfolio-theme public-site${minimalHeader ? " public-site--home" : ""}`}
      data-theme={theme}
      id="portfolio-top"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <a href="#conteudo" className="site-skip">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div
          className={`site-container site-header-frame${minimalHeader ? " site-header-frame--minimal" : ""}`}
        >
          <div className="site-header-brand-group">
            <Link
              to="/"
              aria-label="Leonardo Passos · início"
              className="site-brand"
            >
              {minimalHeader ? (
                <picture>
                  <source
                    media="(width < 48rem)"
                    srcSet={theme === "dark" ? whiteSymbol : colorSymbol}
                  />
                  <img src={theme === "dark" ? whiteLogo : colorLogo} alt="" />
                </picture>
              ) : (
                <img src={colorLogo} alt="" />
              )}
            </Link>
            {!minimalHeader && (
              <Button
                ref={menuButton}
                className="site-menu-button"
                variant="tertiary"
                aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={menuOpen}
                aria-controls="site-mobile-nav"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MenuIcon open={menuOpen} />
              </Button>
            )}
          </div>
          {minimalHeader && (
            <ActionLink
              href="#contato"
              variant="tertiary"
              className="site-header-contact"
              aria-label="Entrar em contato"
              title="Entrar em contato"
              onClick={(event) => {
                if (event.detail > 0 && matchMedia("(width < 48rem)").matches) {
                  event.currentTarget.blur();
                }
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                <path d="M7 8h10M7 12h7" />
              </svg>
              <span className="site-header-contact-label">Entrar em contato</span>
            </ActionLink>
          )}
          {!minimalHeader && (
            <nav className="site-desktop-nav" aria-label="Navegação principal">
              {navLinks()}
            </nav>
          )}
          <div className="site-header-actions">
            <Button
              className="site-theme-button"
              variant="tertiary"
              title={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
              aria-label={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
              aria-pressed={theme === "dark"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <ThemeIcon dark={theme === "dark"} />
            </Button>
          </div>
          {!minimalHeader && (
            <nav
              ref={menu}
              id="site-mobile-nav"
              className="site-mobile-nav"
              hidden={!menuOpen}
              aria-label="Navegação mobile"
            >
              {navLinks()}
            </nav>
          )}
        </div>
      </header>
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <footer className="portfolio-theme site-footer" data-theme="dark">
        <div className="site-container">
          <div className="site-footer-grid">
            <div className="site-footer-brand">
              <Link
                to="/"
                aria-label="Leonardo Passos · início"
                className="site-brand"
              >
                <img src={whiteLogo} alt="" />
              </Link>
              <p>Desenvolvedor de Software · Produtos web completos</p>
            </div>
            <nav aria-label="Navegação do rodapé">{navLinks()}</nav>
            <a
              className="site-text-link"
              href="https://github.com/LeoPassos98"
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
          </div>
          <div className="site-footer-bottom">
            <p>© {new Date().getFullYear()} Leonardo Passos</p>
            <a href="#portfolio-top" className="site-text-link">
              Voltar ao topo ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { PublicLayout };
