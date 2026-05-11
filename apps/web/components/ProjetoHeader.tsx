import Link from "next/link";
import { Badge } from "./Badge";
import { dataHora, m, m3 } from "@/lib/format";
import type { ProjetoNTANK } from "@/lib/projeto";

export function ProjetoHeader({ projeto }: { projeto: ProjetoNTANK }) {
  const vol =
    (Math.PI * Math.pow(projeto.geometria.D_m, 2) * projeto.geometria.H_m) / 4;
  return (
    <header className="space-y-2">
      <Link
        href="/projetos"
        className="text-xs text-carbono-500 hover:text-carbono-700"
      >
        ← Projetos
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl font-extrabold tracking-tight sm:text-3xl">
            {projeto.nome}
          </h1>
          <p className="mt-1 text-xs text-carbono-500">
            {projeto.cliente && <>Cliente: {projeto.cliente} · </>}
            {projeto.local && <>{projeto.local} · </>}
            Atualizado {dataHora(projeto.atualizadoEm)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge cor="carbono">D {m(projeto.geometria.D_m)}</Badge>
          <Badge cor="carbono">H {m(projeto.geometria.H_m)}</Badge>
          <Badge cor="verde">V {m3(vol)}</Badge>
        </div>
      </div>
    </header>
  );
}
