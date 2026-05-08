"use client";

import { use } from "react";
import Link from "next/link";
import {
  listarDNsDisponiveis,
  sugerirBocaisMinimos,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import {
  novoBocalId,
  type BocalProjeto,
  type ClassePressaoUI,
  type FaceFlangeUI,
  type FuncaoBocalUI,
  type PosicaoBocalUI,
  type TipoFlangeUI,
} from "@/lib/projeto";
import { useProjeto } from "@/lib/useProjeto";

interface PageProps {
  params: Promise<{ id: string }>;
}

const FUNCOES: ReadonlyArray<{ value: FuncaoBocalUI; label: string }> = [
  { value: "entrada-produto", label: "Entrada de produto" },
  { value: "saida-produto", label: "Saída de produto" },
  { value: "dreno", label: "Dreno" },
  { value: "vent", label: "Vent / VPV" },
  { value: "manhole", label: "Boca de visita" },
  { value: "instrumentacao", label: "Instrumentação" },
  { value: "outro", label: "Outro" },
];

const POSICOES: ReadonlyArray<{ value: PosicaoBocalUI; label: string }> = [
  { value: "costado", label: "Costado" },
  { value: "teto", label: "Teto" },
];

const CLASSES: ReadonlyArray<ClassePressaoUI> = ["150#", "300#"];
const TIPOS: ReadonlyArray<TipoFlangeUI> = ["WN", "SO", "SW", "BL"];
const FACES: ReadonlyArray<FaceFlangeUI> = ["RF", "FF", "RTJ"];

const DNS = listarDNsDisponiveis();

export default function ProjetoBocaisPage({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useProjeto(id);

  if (estado.status === "carregando")
    return <p className="text-sm text-carbono-500">Carregando…</p>;
  if (estado.status !== "ok")
    return (
      <Card>
        <p className="text-sm text-red-700">
          {estado.status === "ausente" ? "Projeto não encontrado." : estado.mensagem}
        </p>
        <Link href="/" className="mt-2 inline-block">
          <Button variant="ghost">← Voltar</Button>
        </Link>
      </Card>
    );

  const { projeto } = estado;
  const { bocais } = projeto;

  function setBocais(novos: BocalProjeto[]) {
    atualizar((p) => ({ ...p, bocais: novos }));
  }

  function adicionarVazio() {
    setBocais([
      ...bocais,
      {
        id: novoBocalId(),
        tag: `N-${String(bocais.length + 1).padStart(3, "0")}`,
        funcao: "outro",
        posicao: "costado",
        DN_pol: 4,
        classe: "150#",
        tipoFlange: "WN",
        face: "RF",
        elevacao_m: 1,
      },
    ]);
  }

  function aplicarSugestoes() {
    const sugeridos = sugerirBocaisMinimos({
      D_m: projeto.geometria.D_m,
      H_m: projeto.geometria.H_m,
    });
    const tagsExistentes = new Set(bocais.map((b) => b.tag));
    const novos: BocalProjeto[] = sugeridos
      .filter((s) => !tagsExistentes.has(s.tag))
      .map((s) => ({
        id: novoBocalId(),
        tag: s.tag,
        funcao: s.funcao as FuncaoBocalUI,
        posicao: s.posicao as PosicaoBocalUI,
        DN_pol: s.DN_pol,
        classe: s.classe as ClassePressaoUI,
        tipoFlange: s.tipoFlange as TipoFlangeUI,
        face: s.face as FaceFlangeUI,
        elevacao_m: s.elevacao_m,
      }));
    setBocais([...bocais, ...novos]);
  }

  function remover(id: string) {
    setBocais(bocais.filter((b) => b.id !== id));
  }

  function atualizarBocal(id: string, patch: Partial<BocalProjeto>) {
    setBocais(bocais.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function limparTodos() {
    if (!confirm("Remover TODOS os bocais? Essa ação pode ser revertida re-adicionando manualmente.")) return;
    setBocais([]);
  }

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="bocais" />

      <Card
        title="Bloco 3 — Bocais e flanges"
        subtitle={
          bocais.length === 0
            ? "Você ainda não adicionou bocais. Use a sugestão automática NTN ou adicione manualmente."
            : `${bocais.length} bocais cadastrados. Reforço por API 650 5.7 + flange ASME B16.5 calculados automaticamente.`
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={adicionarVazio} size="sm">
            + Adicionar bocal
          </Button>
          <Button onClick={aplicarSugestoes} size="sm" variant="secondary">
            ⚡ Aplicar sugestões NTN
          </Button>
          {bocais.length > 0 && (
            <Button onClick={limparTodos} size="sm" variant="ghost">
              Limpar todos
            </Button>
          )}
        </div>

        <p className="mt-3 text-xs text-carbono-500">
          A sugestão automática inclui manholes (teto e costado), entradas/saídas
          de produto, dreno, vent (VPV), medidor de nível, escotilha de medição,
          sensor de temperatura e sensor de transbordo (ADR §7).
        </p>
      </Card>

      {bocais.length > 0 && (
        <Card title="Lista de bocais">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                <tr>
                  <th className="px-2 py-2">TAG</th>
                  <th className="px-2 py-2">Função</th>
                  <th className="px-2 py-2">Posição</th>
                  <th className="px-2 py-2">Elev. (m)</th>
                  <th className="px-2 py-2">DN</th>
                  <th className="px-2 py-2">Classe</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Face</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {bocais.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-carbono-100 align-middle"
                  >
                    <td className="px-2 py-1">
                      <input
                        value={b.tag}
                        onChange={(e) =>
                          atualizarBocal(b.id, { tag: e.target.value })
                        }
                        className="w-24 rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                        aria-label={`TAG do bocal ${b.tag}`}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={b.funcao}
                        onChange={(e) =>
                          atualizarBocal(b.id, {
                            funcao: e.target.value as FuncaoBocalUI,
                          })
                        }
                        className="rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      >
                        {FUNCOES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={b.posicao}
                        onChange={(e) =>
                          atualizarBocal(b.id, {
                            posicao: e.target.value as PosicaoBocalUI,
                            elevacao_m:
                              e.target.value === "teto" ? undefined : (b.elevacao_m ?? 1),
                          })
                        }
                        className="rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      >
                        {POSICOES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      {b.posicao === "costado" ? (
                        <input
                          type="number"
                          value={b.elevacao_m ?? ""}
                          onChange={(e) =>
                            atualizarBocal(b.id, {
                              elevacao_m:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                          step={0.1}
                          min={0}
                          className="tabular w-20 rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                          aria-label={`Elevação do bocal ${b.tag}`}
                        />
                      ) : (
                        <span className="text-carbono-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={b.DN_pol}
                        onChange={(e) =>
                          atualizarBocal(b.id, {
                            DN_pol: Number(e.target.value),
                          })
                        }
                        className="tabular rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      >
                        {DNS.map((dn) => (
                          <option key={dn} value={dn}>
                            {dn}"
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={b.classe}
                        onChange={(e) =>
                          atualizarBocal(b.id, {
                            classe: e.target.value as ClassePressaoUI,
                          })
                        }
                        className="rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      >
                        {CLASSES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={b.tipoFlange}
                        onChange={(e) =>
                          atualizarBocal(b.id, {
                            tipoFlange: e.target.value as TipoFlangeUI,
                          })
                        }
                        className="rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      >
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={b.face}
                        onChange={(e) =>
                          atualizarBocal(b.id, {
                            face: e.target.value as FaceFlangeUI,
                          })
                        }
                        className="rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      >
                        {FACES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => remover(b.id)}
                        className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        aria-label={`Remover bocal ${b.tag}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Badge cor="info">
              {bocais.filter((b) => b.posicao === "costado").length} no costado
            </Badge>
            <Badge cor="info">
              {bocais.filter((b) => b.posicao === "teto").length} no teto
            </Badge>
            <Badge cor="carbono">
              {bocais.filter((b) => b.funcao === "manhole").length} manholes
            </Badge>
            <Badge cor="carbono">
              {bocais.filter((b) => b.funcao === "vent").length} vents
            </Badge>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}/parametros`}>
          <Button variant="ghost">← Parâmetros</Button>
        </Link>
        <Link href={`/projeto/${projeto.id}/acessorios`}>
          <Button>Acessórios →</Button>
        </Link>
      </div>
    </div>
  );
}
