'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

// ---------------------------------------------------------------------------
// Configuração das calculadoras
// ---------------------------------------------------------------------------

type Contexto = "tanques" | "bacias" | "api653" | "api2000" | "api2350";

const CALCULADORAS: { label: string; href: string; prefixos: string[] }[] = [
  { label: "Tanques",  href: "/projetos",         prefixos: ["/projetos", "/projeto", "/novo"] },
  { label: "Bacias",   href: "/bacia/projetos",   prefixos: ["/bacia"] },
  { label: "API 653",  href: "/api653/projetos",  prefixos: ["/api653"] },
  { label: "API 2000", href: "/api2000/projetos", prefixos: ["/api2000"] },
  { label: "API 2350", href: "/api2350/projetos", prefixos: ["/api2350"] },
];

const NOVO: Record<Contexto, { label: string; href: string }> = {
  tanques: { label: "Novo tanque",   href: "/novo"          },
  bacias:  { label: "Nova bacia",    href: "/bacia/novo"    },
  api653:  { label: "Nova inspeção", href: "/api653/novo"   },
  api2000: { label: "Novo projeto",  href: "/api2000/novo"  },
  api2350: { label: "Novo projeto",  href: "/api2350/novo"  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectarContexto(pathname: string): Contexto {
  if (pathname.startsWith("/bacia"))   return "bacias";
  if (pathname.startsWith("/api653"))  return "api653";
  if (pathname.startsWith("/api2000")) return "api2000";
  if (pathname.startsWith("/api2350")) return "api2350";
  return "tanques"; // default (inclui home e rotas de tanque)
}

function isAtivo(prefixos: string[], pathname: string): boolean {
  return prefixos.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function Header() {
  const pathname = usePathname();
  const contexto = detectarContexto(pathname);
  const novo = NOVO[contexto];

  return (
    <header className="border-b border-carbono-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        {/* Logo → home */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="NTANK — Início">
          <Logo size={36} />
        </Link>

        {/* Nav calculadoras — alinhada à direita, scrollável no mobile */}
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto text-sm">
          {CALCULADORAS.map((calc) => {
            const ativo = isAtivo(calc.prefixos, pathname);
            return (
              <Link
                key={calc.label}
                href={calc.href}
                className={[
                  "whitespace-nowrap rounded px-2 py-1 transition",
                  ativo
                    ? "border-b-2 border-verde font-semibold text-carbono"
                    : "text-carbono-500 hover:bg-creme hover:text-carbono",
                ].join(" ")}
              >
                {calc.label}
              </Link>
            );
          })}

          {/* Botão Novo — só aparece fora da home */}
          {pathname !== "/" && (
            <Link
              href={novo.href}
              className="ml-2 shrink-0 rounded bg-carbono px-3 py-2 text-sm font-semibold text-verde transition hover:bg-carbono-700"
            >
              {novo.label}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
