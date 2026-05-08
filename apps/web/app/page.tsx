"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { listarProjetos, excluirProjeto } from "@/lib/db";
import { dataHora, m, m3 } from "@/lib/format";
import type { ProjetoNTANK } from "@/lib/projeto";

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
          <p className="text-sm text-red-700">
            Falha ao carregar IndexedDB: {erro}
          </p>
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

      {projetos && projetos.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {projetos.map((p) => {
            const vol =
              (Math.PI * Math.pow(p.geometria.D_m, 2) * p.geometria.H_m) / 4;
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-title text-lg font-bold">{p.nome}</h3>
                    <p className="text-xs text-carbono-500">
                      {p.cliente && <>Cliente: {p.cliente} · </>}
                      {p.local && <>{p.local} · </>}
                      Atualizado {dataHora(p.atualizadoEm)}
                    </p>
                  </div>
                  <Badge cor="verde">{p.geometria.modo === "A" ? "D+H" : p.geometria.modo === "B" ? "Volume" : "Volume+restr"}</Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-carbono-500">D</dt>
                    <dd className="font-semibold tabular">
                      {m(p.geometria.D_m)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-carbono-500">H</dt>
                    <dd className="font-semibold tabular">
                      {m(p.geometria.H_m)}
                    </dd>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExcluir(p.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
