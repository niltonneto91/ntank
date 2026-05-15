"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import {
  listarProjetosBacia,
  excluirProjetoBacia,
  salvarProjetoBacia,
} from "@/lib/db";
import { dataHora } from "@/lib/format";
import type { ProjetoBacia } from "@/lib/bacia-projeto";

// ---------------------------------------------------------------------------
// Card de projeto
// ---------------------------------------------------------------------------

function ProjetoCard({
  p,
  pastasDisponiveis,
  onExcluir,
  onMover,
}: {
  p: ProjetoBacia;
  pastasDisponiveis: string[];
  onExcluir: (id: string) => void;
  onMover: (id: string, pasta: string) => void;
}) {
  const [movendoPara, setMovendoPara] = useState<string | null>(null);
  const [novaPastaInput, setNovaPastaInput] = useState("");

  function confirmarMover(pasta: string) {
    onMover(p.id, pasta);
    setMovendoPara(null);
    setNovaPastaInput("");
  }

  const labelModo = p.modo === "verificar" ? "Verificação" : "Dimensionamento";
  const maiorVolume =
    p.tanques.length > 0
      ? Math.max(...p.tanques.map((t) => t.volume_m3)).toFixed(0)
      : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-title text-lg font-bold leading-tight">{p.nome}</h3>
          <p className="text-xs text-carbono-500">
            {p.cliente && <>Cliente: {p.cliente} · </>}
            {p.local && <>{p.local} · </>}
            Atualizado {dataHora(p.atualizadoEm)}
          </p>
        </div>
        <Badge cor="verde">{labelModo}</Badge>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-carbono-500">Tanques</dt>
          <dd className="font-semibold tabular">{p.tanques.length || "—"}</dd>
        </div>
        <div>
          <dt className="text-carbono-500">Maior volume</dt>
          <dd className="font-semibold tabular">
            {maiorVolume ? `${maiorVolume} m³` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-carbono-500">Muro máx.</dt>
          <dd className="font-semibold tabular">{p.alturaMaxMuro_m.toFixed(1)} m</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2">
        <Link href={`/bacia/${p.id}`}>
          <Button size="sm">Abrir</Button>
        </Link>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMovendoPara(movendoPara === p.id ? null : p.id)}
          >
            Mover
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onExcluir(p.id)}>
            Excluir
          </Button>
        </div>
      </div>

      {/* Painel inline de mover para pasta */}
      {movendoPara === p.id && (
        <div className="rounded-md border border-carbono-200 bg-creme p-3 space-y-2">
          <p className="text-xs font-bold text-carbono-500 uppercase tracking-wider">
            Mover para pasta
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => confirmarMover("")}
              className={`rounded px-3 py-1 text-sm border transition ${
                !p.pasta
                  ? "bg-carbono text-white border-carbono"
                  : "bg-white border-carbono-300 hover:bg-creme"
              }`}
            >
              Sem pasta
            </button>
            {pastasDisponiveis.map((pasta) => (
              <button
                key={pasta}
                onClick={() => confirmarMover(pasta)}
                className={`rounded px-3 py-1 text-sm border transition ${
                  p.pasta === pasta
                    ? "bg-carbono text-white border-carbono"
                    : "bg-white border-carbono-300 hover:bg-creme"
                }`}
              >
                📁 {pasta}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Nova pasta…"
              value={novaPastaInput}
              onChange={(e) => setNovaPastaInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                novaPastaInput.trim() &&
                confirmarMover(novaPastaInput.trim())
              }
              className="flex-1 rounded border border-carbono-300 bg-white px-2 py-1 text-sm outline-none focus:border-verde"
            />
            <Button
              size="sm"
              onClick={() =>
                novaPastaInput.trim() && confirmarMover(novaPastaInput.trim())
              }
            >
              ✓
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Agrupamento por pasta
// ---------------------------------------------------------------------------

function agruparPorPasta(
  projetos: ProjetoBacia[],
): Array<{ pasta: string; lista: ProjetoBacia[] }> {
  const map = new Map<string, ProjetoBacia[]>();
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

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function ProjetosBaciaPage() {
  const [projetos, setProjetos] = useState<ProjetoBacia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pastasExtras, setPastasExtras] = useState<string[]>([]);
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const [novaPastaInputVisivel, setNovaPastaInputVisivel] = useState(false);
  const [novaPastaTexto, setNovaPastaTexto] = useState("");

  useEffect(() => {
    listarProjetosBacia()
      .then(setProjetos)
      .catch((e: Error) => setErro(e.message));
  }, []);

  const pastasDisponiveis = useMemo(() => {
    const dosProjetos = (projetos ?? [])
      .map((p) => p.pasta?.trim() ?? "")
      .filter(Boolean);
    return [...new Set([...dosProjetos, ...pastasExtras])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [projetos, pastasExtras]);

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este projeto de bacia? Essa ação não pode ser desfeita.")) return;
    await excluirProjetoBacia(id);
    setProjetos((prev) => (prev ?? []).filter((x) => x.id !== id));
  }

  async function handleMover(id: string, pasta: string) {
    const proj = (projetos ?? []).find((p) => p.id === id);
    if (!proj) return;
    const atualizado: ProjetoBacia = { ...proj, pasta };
    await salvarProjetoBacia(atualizado);
    setProjetos((prev) =>
      (prev ?? []).map((p) => (p.id === id ? atualizado : p)),
    );
  }

  function toggleRecolhida(pasta: string) {
    setRecolhidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(pasta)) novo.delete(pasta);
      else novo.add(pasta);
      return novo;
    });
  }

  function criarNovaPasta() {
    const nome = novaPastaTexto.trim();
    if (!nome) return;
    if (!pastasDisponiveis.includes(nome)) {
      setPastasExtras((prev) => [...prev, nome]);
    }
    setNovaPastaTexto("");
    setNovaPastaInputVisivel(false);
  }

  const grupos = projetos && projetos.length > 0 ? agruparPorPasta(projetos) : [];

  const gruposComExtras = useMemo(() => {
    const existentes = new Set(grupos.map((g) => g.pasta));
    const extras = pastasExtras
      .filter((nome) => !existentes.has(nome))
      .map((nome) => ({ pasta: nome, lista: [] as ProjetoBacia[] }));
    return [...extras, ...grupos].sort((a, b) => {
      if (a.pasta === "" && b.pasta !== "") return 1;
      if (a.pasta !== "" && b.pasta === "") return -1;
      return a.pasta.localeCompare(b.pasta, "pt-BR");
    });
  }, [grupos, pastasExtras]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/" className="text-xs text-carbono-500 hover:text-carbono-700">
            ← Calculadoras
          </Link>
          <h1 className="mt-1 font-title text-3xl font-extrabold tracking-tight">
            Bacia de Contenção
          </h1>
          <p className="mt-1 text-sm text-carbono-600">
            Dimensionamento e verificação · <span className="font-semibold">NBR 17505-2 §5.9.2</span>
          </p>
        </div>
        <div className="flex gap-2">
          {novaPastaInputVisivel ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                autoFocus
                placeholder="Nome da pasta…"
                value={novaPastaTexto}
                onChange={(e) => setNovaPastaTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") criarNovaPasta();
                  if (e.key === "Escape") setNovaPastaInputVisivel(false);
                }}
                className="rounded border border-carbono-300 bg-white px-3 py-2 text-sm outline-none focus:border-verde"
              />
              <Button size="sm" onClick={criarNovaPasta}>✓</Button>
              <Button size="sm" variant="ghost" onClick={() => setNovaPastaInputVisivel(false)}>✕</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setNovaPastaInputVisivel(true)}>
              📁 Nova pasta
            </Button>
          )}
          <Link href="/bacia/novo">
            <Button>+ Nova bacia</Button>
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

      {projetos && projetos.length === 0 && pastasExtras.length === 0 && (
        <Card title="Comece pelo primeiro projeto">
          <p className="text-sm text-carbono-600">
            Você ainda não tem projetos de bacia de contenção salvos. Crie um novo para
            verificar uma bacia existente ou dimensionar uma nova conforme NBR 17505-2.
          </p>
          <div className="mt-4">
            <Link href="/bacia/novo">
              <Button>Criar primeiro projeto</Button>
            </Link>
          </div>
        </Card>
      )}

      {gruposComExtras.length > 0 && (
        <div className="space-y-4">
          {gruposComExtras.map(({ pasta, lista }) => {
            const estaRecolhida = pasta ? recolhidas.has(pasta) : false;
            return (
              <section key={pasta || "__sem_pasta__"}>
                {pasta && (
                  <button
                    onClick={() => toggleRecolhida(pasta)}
                    className="mb-2 flex w-full items-center gap-2 rounded px-1 py-1 text-left transition hover:bg-creme"
                  >
                    <span className="text-xs text-carbono-400 w-4">
                      {estaRecolhida ? "▶" : "▼"}
                    </span>
                    <span className="text-base font-bold">📁 {pasta}</span>
                    <span className="text-xs text-carbono-400">
                      ({lista.length} projeto{lista.length !== 1 ? "s" : ""})
                    </span>
                  </button>
                )}
                {!estaRecolhida && (
                  <div className={`grid gap-3 md:grid-cols-2 ${pasta ? "pl-6" : ""}`}>
                    {lista.map((p) => (
                      <ProjetoCard
                        key={p.id}
                        p={p}
                        pastasDisponiveis={pastasDisponiveis}
                        onExcluir={handleExcluir}
                        onMover={handleMover}
                      />
                    ))}
                    {lista.length === 0 && (
                      <p className="text-sm text-carbono-400 italic col-span-2">
                        Pasta vazia — mova um projeto para cá.
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
