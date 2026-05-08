import Link from "next/link";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="border-b border-carbono-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center" aria-label="Início NTANK">
          <Logo size={36} />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-carbono-700 hover:text-carbono"
          >
            Projetos
          </Link>
          <Link
            href="/novo"
            className="rounded bg-carbono px-3 py-2 font-semibold text-verde transition hover:bg-carbono-700"
          >
            Novo projeto
          </Link>
        </nav>
      </div>
    </header>
  );
}
