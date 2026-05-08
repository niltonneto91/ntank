"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { listarProjetos, excluirProjeto } from "@/lib/db";
import { dataHora, m, m3 } from "@/lib/format";
import type { ProjetoNTANK } from "@/lib/projeto";

function ProjetoCard({
  p,
  onExcluir,
}: {
  p: ProjetoNTANK;
  onExcluir: (id: string) => void;
}) {
  const vol = (Math.PI * Math.pow(p.geometria.D_m, 2) * p.geometria.H_m) / 4;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-title text-lg font-bold">{p.nome}</h3>
          <p className="text-xs text-carbono-500">
            {p.cliente && <>Cliente: {p.cliente} · </>}
            {p.local && <>{p.local} · </>}
            Atualizado {dataHora(p.atualizadoEm)}
          </p>
        </div>
        <Badge cor="verde">
          {p.geometria.modo === "A"
            ? "D+H"
            : p.geometria.modo === "B"
              ? "Volume"
              : "Volume+restr"}
        </Badge>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-carbono-500">D</dt>
          <dd className="font-semibold tabular">{m(p.geometria.D_m)}</dd>
        </div>
        <div>
          <dt className="text-carbono-500">H</dt>
          <dd className="font-semibold tabular">{m(p.geometria.H_m)}</dd>
        </div>
        <div>
          <dt className="text-carbono-500">V nominal</dt>
          <dd className="font-semibold tabular">{m3(vol)}</dd>
        </div>
      </dl>
      <div className="flex justify-between gap-2">
        <Link href={`/projeto/${p.id}`}>
          <Button size="sm">Abrir</Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={() => onExcluir(p.id)}>
          Excluir
        </Button>
      </div>
    </Card>
  );
}

/** Agrupa projetos por pasta e ordena: pastas nomeadas (A-Z) antes das sem pasta. */
function agruparPorPasta(
  projetos: ProjetoNTANK[],
): Array<{ pasta: string; lista: ProjetoNTANK[] }> {
  const map = new Map<string, ProjetoNTANK[]>();
  for (const p of projetos) {
    const chave = p.pasta?.trim() || "";
    if (!map.has(chave)) map.set(chave, []);
    map.get(chave)!.push(p);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "" && b !== "") return 1;
      if (a !== "" && b === "") return -1;
      return a.localeCompare(b, "pt-BR");
    })
    .map(([pasta, lista]) => ({ pasta, lista }));
}

export default function HomePage() {
  const [projetos, setProjetos] = useState<ProjetoNTANK[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarProjetos()
      .then(setProjetos)
      .catch((e: Error) => setErro(e.message));
  }, []);

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este projeto? Essa ação não pode ser desfeita.")) return;
    await excluirProjeto(id);
    setProjetos((p) => (p ?? []).filter((x) => x.id !== id));
  }

  const grupos = projetos && projetos.length > 0 ? agruparPorPasta(projetos) : [];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-title text-3xl font-extrabold tracking-tight">
            Projetos
          </h1>
          <p className="mt-1 text-sm text-carbono-600">
            Calculadora de tanques verticais cilíndricos —{" "}
            <span className="font-semibold">API 650</span> e{" "}
            <span className="font-semibold">NBR 7821</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/novo">
            <Button>+ Novo projeto</Button>
          </Link>
        </div>
      </section>

      {erro && (
        <Card>
          <p className="text-sm text-red-700">Falha ao carregar IndexedDB: {erro}</p>
        </Card>
      )}

      {projetos === null && !erro && (
        <Card>
          <p className="text-sm text-carbono-500">Carregando…</p>
        </Card>
      )}

      {projetos && projetos.length === 0 && (
        <Card title="Comece pelo primeiro tanque">
          <p className="text-sm text-carbono-600">
            Você ainda não tem projetos salvos. Crie um novo para dimensionar o
            costado segundo as três variantes (NBR 7821, API 650 1-Foot e VDP).
          </p>
          <div className="mt-4">
            <Link href="/novo">
              <Button>Criar primeiro projeto</Button>
            </Link>
          </div>
        </Card>
      )}

      {grupos.length > 0 && (
        <div className="space-y-6">
          {grupos.map(({ pasta, lista }) => (
            <section key={pasta || "__sem_pasta__"}>
              {pasta && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base font-bold">📁 {pasta}</span>
                  <span className="text-xs text-carbono-400">
                    ({lista.length} projeto{lista.length !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {lista.map((p) => (
                  <ProjetoCard key={p.id} p={p} onExcluir={handleExcluir} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
