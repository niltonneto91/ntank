"use client";

import { use } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, SelectField } from "@/components/Field";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { useProjeto } from "@/lib/useProjeto";
import {
  novaPlataformaId,
  type EscadaProjeto,
  type PlataformaProjeto,
  type TipoEscadaUI,
} from "@/lib/projeto";
import { num } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Campos da escada helicoidal — 3 variáveis interligadas:
 *   ângulo θ ↔ passo do pé (tread) ↔ altura entre degraus (riser)
 * Relação:  riser = tread × tan θ.
 *
 * O usuário edita (θ, tread) OU (tread, riser) OU (θ, riser); o terceiro
 * é recalculado e exibido em destaque.
 */
function EscadaHelicoidalCampos({
  angulo,
  passoPe_mm,
  onChangeAngulo,
  onChangePassoPe,
}: {
  angulo: number;
  passoPe_mm: number;
  onChangeAngulo: (v: number) => void;
  onChangePassoPe: (v: number) => void;
}) {
  const tan = Math.tan((angulo * Math.PI) / 180);
  const altura_mm = passoPe_mm * tan;
  // Permite editar a altura → recalcula o ângulo (mantém passoPe).
  function setAlturaDegrau(novaAltura_mm: number) {
    if (passoPe_mm <= 0 || novaAltura_mm <= 0) return;
    const novoAngulo_rad = Math.atan(novaAltura_mm / passoPe_mm);
    const novoAngulo_graus = (novoAngulo_rad * 180) / Math.PI;
    onChangeAngulo(Number(novoAngulo_graus.toFixed(1)));
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      <NumberField
        label="Ângulo da hélice"
        unit="graus"
        value={angulo}
        onChange={onChangeAngulo}
        step={1}
        min={5}
        max={50}
        hint="Default NTN: 20°. Máximo prático: 50°."
      />
      <NumberField
        label="Passo do pé (tread)"
        unit="mm"
        value={passoPe_mm}
        onChange={onChangePassoPe}
        step={10}
        min={150}
        max={400}
        hint="Profundidade onde o pé apoia. Default NTN: 250 mm."
      />
      <NumberField
        label="Altura entre degraus (riser)"
        unit="mm"
        value={Number(altura_mm.toFixed(0))}
        onChange={setAlturaDegrau}
        step={5}
        min={50}
        max={350}
        hint={`Calculado: ${num(passoPe_mm, 0)} × tan(${num(angulo, 1)}°) = ${num(altura_mm, 1)} mm. Editar recalcula o ângulo.`}
      />
    </div>
  );
}

export default function ProjetoAcessoriosPage({ params }: PageProps) {
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
      </Card>
    );

  const { projeto } = estado;
  const { acessorios } = projeto;
  const { escada, plataformas } = acessorios;

  function setEscada<K extends keyof EscadaProjeto>(
    chave: K,
    valor: EscadaProjeto[K],
  ) {
    atualizar((p) => ({
      ...p,
      acessorios: {
        ...p.acessorios,
        escada: { ...p.acessorios.escada, [chave]: valor },
      },
    }));
  }

  function setGuardaCorpoEscada(valor: boolean) {
    atualizar((p) => ({
      ...p,
      acessorios: { ...p.acessorios, guardaCorpoEscada: valor },
    }));
  }

  function setPlataformas(novas: PlataformaProjeto[]) {
    atualizar((p) => ({
      ...p,
      acessorios: { ...p.acessorios, plataformas: novas },
    }));
  }

  function adicionarPlataforma() {
    setPlataformas([
      ...plataformas,
      {
        id: novaPlataformaId(),
        nome: plataformas.length === 0 ? "PLT-TOPO" : `PLT-INT-${plataformas.length}`,
        cota_m:
          plataformas.length === 0
            ? Number(projeto.geometria.H_m.toFixed(2))
            : Number((projeto.geometria.H_m / 2).toFixed(2)),
        largura_m: 1.0,
        comprimento_m: undefined, // = perímetro
        comGuardaCorpo: true,
      },
    ]);
  }

  /**
   * Gera plataformas automáticas para escada helicoidal:
   *   1 por cada 3 m de altura + 1 no topo.
   * Regra NTN: a cada 3 m o operador encontra um patamar (descemos ~5
   * degraus para cada nível antes de chegar à plataforma).
   */
  function gerarPlataformasAutomaticas() {
    const H = projeto.geometria.H_m;
    const novas: PlataformaProjeto[] = [];
    // Patamares intermediários a cada 3 m (exceto o último abaixo de 1 m do topo)
    let cota = 3;
    while (cota < H - 1.0) {
      novas.push({
        id: novaPlataformaId(),
        nome: `PLT-${cota.toFixed(0)}m`,
        cota_m: Number(cota.toFixed(2)),
        largura_m: 1.0,
        comprimento_m: undefined,
        comGuardaCorpo: true,
      });
      cota += 3;
    }
    // Plataforma do topo (obrigatória)
    novas.push({
      id: novaPlataformaId(),
      nome: "PLT-TOPO",
      cota_m: Number(H.toFixed(2)),
      largura_m: 1.0,
      comprimento_m: undefined,
      comGuardaCorpo: true,
    });
    setPlataformas(novas);
  }

  function removerPlataforma(id: string) {
    setPlataformas(plataformas.filter((p) => p.id !== id));
  }

  function atualizarPlataforma(id: string, patch: Partial<PlataformaProjeto>) {
    setPlataformas(
      plataformas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  const perimetroMetros = Math.PI * projeto.geometria.D_m;

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="acessorios" />

      <Card
        title="Bloco 4 — Escada"
        subtitle="Defina o tipo de escada de acesso ao topo do tanque."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="Tipo de escada"
            value={escada.tipo}
            onChange={(v) => setEscada("tipo", v as TipoEscadaUI)}
            options={[
              { value: "helicoidal-externa", label: "Helicoidal externa" },
              { value: "marinheiro-vertical", label: "Marinheiro vertical" },
              { value: "nenhuma", label: "Nenhuma" },
            ]}
            norma="NR-12 / NR-35"
          />
          {escada.tipo !== "nenhuma" && (
            <NumberField
              label="Largura"
              unit="mm"
              value={escada.largura_mm ?? 750}
              onChange={(v) => setEscada("largura_mm", v)}
              step={50}
              min={500}
              max={1500}
              hint="NR-12 mínimo: 600 mm. Default NTN: 750 mm."
            />
          )}
        </div>

        {escada.tipo === "helicoidal-externa" && (
          <EscadaHelicoidalCampos
            angulo={escada.anguloHelicoidal_graus ?? 20}
            passoPe_mm={escada.passoPe_mm ?? 250}
            onChangeAngulo={(v) => setEscada("anguloHelicoidal_graus", v)}
            onChangePassoPe={(v) => setEscada("passoPe_mm", v)}
          />
        )}

        {escada.tipo === "marinheiro-vertical" && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <NumberField
              label="Espaçamento entre travessões"
              unit="mm"
              value={escada.passoPe_mm ?? 250}
              onChange={(v) => setEscada("passoPe_mm", v)}
              step={10}
              min={200}
              max={350}
              hint="Faixa ergonômica vertical: 200–300 mm."
            />
          </div>
        )}

        {escada.tipo === "marinheiro-vertical" && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={
                escada.comGaiola ??
                projeto.geometria.H_m >= 6
              }
              onChange={(e) => setEscada("comGaiola", e.target.checked)}
              className="h-4 w-4 accent-verde"
              id="gaiola"
            />
            <label htmlFor="gaiola">
              Com gaiola de proteção{" "}
              <span className="text-carbono-500">
                (NR-35 obriga para H ≥ 6 m — atual{" "}
                {num(projeto.geometria.H_m, 2)} m)
              </span>
            </label>
          </div>
        )}

        {escada.tipo !== "nenhuma" && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={acessorios.guardaCorpoEscada}
              onChange={(e) => setGuardaCorpoEscada(e.target.checked)}
              className="h-4 w-4 accent-verde"
              id="gc-escada"
            />
            <label htmlFor="gc-escada">
              Adicionar guarda-corpo ao longo da escada (tubo Sch 40 1.1/4″, 3
              barras — NR-12)
            </label>
          </div>
        )}
      </Card>

      <Card
        title="Bloco 4 — Plataformas"
        subtitle={`Plataformas perimetrais. Perímetro do tanque: ${num(perimetroMetros, 2)} m. Largura padrão: 1,0 m, piso chapa xadrez 3/16″.`}
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={adicionarPlataforma} size="sm">
            + Adicionar plataforma
          </Button>
          {escada.tipo === "helicoidal-externa" && (
            <Button
              onClick={gerarPlataformasAutomaticas}
              size="sm"
              variant="secondary"
              title="Gera 1 plataforma a cada 3 m de altura + 1 no topo (regra NTN para escada helicoidal)"
            >
              ↺ Sugerir para escada helicoidal
            </Button>
          )}
        </div>

        {plataformas.length === 0 ? (
          <p className="mt-3 text-sm text-carbono-500">
            Sem plataformas cadastradas.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                <tr>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Cota (m)</th>
                  <th className="px-2 py-2">Larg. (m)</th>
                  <th className="px-2 py-2">Comp. (m)</th>
                  <th className="px-2 py-2">Guarda-corpo</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {plataformas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-carbono-100 align-middle"
                  >
                    <td className="px-2 py-1">
                      <input
                        value={p.nome}
                        onChange={(e) =>
                          atualizarPlataforma(p.id, { nome: e.target.value })
                        }
                        className="w-32 rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={p.cota_m}
                        onChange={(e) =>
                          atualizarPlataforma(p.id, {
                            cota_m: Number(e.target.value),
                          })
                        }
                        step={0.1}
                        min={0}
                        className="tabular w-20 rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={p.largura_m}
                        onChange={(e) =>
                          atualizarPlataforma(p.id, {
                            largura_m: Number(e.target.value),
                          })
                        }
                        step={0.1}
                        min={0.5}
                        max={3}
                        className="tabular w-20 rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={p.comprimento_m ?? ""}
                        placeholder={`= perímetro (${num(perimetroMetros, 2)})`}
                        onChange={(e) =>
                          atualizarPlataforma(p.id, {
                            comprimento_m:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                        step={0.5}
                        min={1}
                        className="tabular w-32 rounded border border-carbono-200 bg-white px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={p.comGuardaCorpo}
                        onChange={(e) =>
                          atualizarPlataforma(p.id, {
                            comGuardaCorpo: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-verde"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => removerPlataforma(p.id)}
                        className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge cor="info">{plataformas.length} plataformas</Badge>
              <Badge cor="carbono">
                {plataformas.filter((p) => p.comGuardaCorpo).length} c/ guarda-corpo
              </Badge>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}/bocais`}>
          <Button variant="ghost">← Bocais</Button>
        </Link>
        <Link href={`/projeto/${projeto.id}/comparativo`}>
          <Button>Calcular variantes →</Button>
        </Link>
      </div>
    </div>
  );
}
