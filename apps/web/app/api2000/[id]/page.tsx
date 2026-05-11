"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  calcularRespiroNormal,
  calcularAreaMolhadaVertical,
  nm3hParaScfh,
  kPaParaMbar,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { useApi2000Projeto } from "@/lib/useApi2000Projeto";
import type { ClasseLiquidoAPI2000, TipoTanqueAPI2000 } from "@ntank/calc-core";
import type { FatoresNormativosAPI2000, ProjetoAPI2000 } from "@/lib/api2000-projeto";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Constantes de UI
// ---------------------------------------------------------------------------

const CLASSES_LIQUIDO: ReadonlyArray<{ value: ClasseLiquidoAPI2000; label: string }> = [
  { value: "IA",             label: "Classe IA — gasolina, nafta" },
  { value: "IB",             label: "Classe IB — acetona, éter" },
  { value: "IC",             label: "Classe IC — xileno, estireno" },
  { value: "II",             label: "Classe II — diesel, querosene" },
  { value: "IIIA",           label: "Classe IIIA — óleo combustível leve" },
  { value: "IIIB",           label: "Classe IIIB — asfalto, OC pesado" },
  { value: "nao-inflamavel", label: "Não inflamável" },
];

const TIPOS_TANQUE: ReadonlyArray<{ value: TipoTanqueAPI2000; label: string }> = [
  { value: "vertical-teto-fixo",              label: "Vertical — teto fixo" },
  { value: "vertical-teto-flutuante-interno", label: "Vertical — teto flutuante interno" },
  { value: "vertical-teto-flutuante-externo", label: "Vertical — teto flutuante externo" },
  { value: "horizontal",                      label: "Horizontal" },
];

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------

const num1 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const num2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function API2000Page({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useApi2000Projeto(id);

  // Cálculo reativo a cada atualização
  const calculo = useMemo(() => {
    if (estado.status !== "ok") return null;
    const { projeto } = estado;
    try {
      const areaResult = calcularAreaMolhadaVertical({
        D_m: projeto.geometria.D_m,
        H_liq_m: projeto.geometria.H_liq_max_m,
      });
      const A_wet = projeto.geometria.areaAutoCalculada
        ? areaResult.A_total_m2
        : (projeto.geometria.A_wet_manual_m2 ?? areaResult.A_total_m2);

      const respiro = calcularRespiroNormal({
        Q_enchimento_m3h: projeto.operacao.Q_enchimento_m3h,
        Q_esvaziamento_m3h: projeto.operacao.Q_esvaziamento_m3h,
        T_armazenamento_C: projeto.produto.T_armazenamento_C,
        classe: projeto.produto.classe,
        fator_outbreathing: projeto.fatoresNormativos.fator_outbreathing,
        fator_inbreathing: projeto.fatoresNormativos.fator_inbreathing,
        simultaneo: projeto.operacao.simultaneo,
        blanketing: projeto.produto.blanketing,
      });

      return { respiro, areaResult, A_wet };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [estado]);

  // --- Estados de carregamento/erro ---
  if (estado.status === "carregando")
    return <p className="text-sm text-carbono-500">Carregando…</p>;

  if (estado.status === "ausente")
    return (
      <Card>
        <p className="text-sm">Cálculo não encontrado.</p>
        <div className="mt-2">
          <Link href="/"><Button variant="ghost">← Início</Button></Link>
        </div>
      </Card>
    );

  if (estado.status === "erro")
    return (
      <Card>
        <p className="text-sm text-red-700">Erro: {estado.mensagem}</p>
      </Card>
    );

  const { projeto } = estado;

  // Helpers de atualização
  function setProjeto<K extends keyof ProjetoAPI2000>(chave: K, valor: ProjetoAPI2000[K]) {
    atualizar((p) => ({ ...p, [chave]: valor }));
  }

  function setFator(chave: keyof FatoresNormativosAPI2000, valor: number | null) {
    atualizar((p) => ({
      ...p,
      fatoresNormativos: { ...p.fatoresNormativos, [chave]: valor },
    }));
  }

  const V_nom = (Math.PI * projeto.geometria.D_m ** 2 * projeto.geometria.H_m) / 4;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-carbono-500">
            API Standard 2000 — Ventilação Normal
          </p>
          <h1 className="font-title text-2xl font-extrabold tracking-tight">
            {projeto.nome}
          </h1>
          <p className="mt-0.5 text-sm text-carbono-600">
            {projeto.tagTanque}
            {projeto.cliente ? ` · ${projeto.cliente}` : ""}
            {projeto.local ? ` · ${projeto.local}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">← Início</Button>
          </Link>
        </div>
      </header>

      {/* Dados do tanque */}
      <Card title="Tanque e produto">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="Tag" value={projeto.tagTanque}
            onChange={(v) => setProjeto("tagTanque", v)} />
          <SelectField label="Tipo de tanque" value={projeto.tipoTanque}
            onChange={(v) => atualizar((p) => ({ ...p, tipoTanque: v as TipoTanqueAPI2000 }))}
            options={TIPOS_TANQUE} />
          <TextField label="Produto" value={projeto.produto.nome}
            onChange={(v) => atualizar((p) => ({ ...p, produto: { ...p.produto, nome: v } }))}
            placeholder="Ex.: Diesel S10" />
          <SelectField label="Classe (NBR 17505)" value={projeto.produto.classe}
            onChange={(v) => atualizar((p) => ({ ...p, produto: { ...p.produto, classe: v as ClasseLiquidoAPI2000 } }))}
            options={CLASSES_LIQUIDO} />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <NumberField label="Diâmetro D" unit="m" value={projeto.geometria.D_m} step={0.01} min={0.1}
            onChange={(v) => atualizar((p) => ({ ...p, geometria: { ...p.geometria, D_m: v } }))} />
          <NumberField label="Altura H" unit="m" value={projeto.geometria.H_m} step={0.5} min={0.5}
            onChange={(v) => atualizar((p) => ({ ...p, geometria: { ...p.geometria, H_m: v } }))} />
          <NumberField label="Nível máx. líquido" unit="m" value={projeto.geometria.H_liq_max_m} step={0.1} min={0.1}
            onChange={(v) => atualizar((p) => ({ ...p, geometria: { ...p.geometria, H_liq_max_m: v } }))} />
          <NumberField label="Temperatura arm." unit="°C" value={projeto.produto.T_armazenamento_C} step={1} min={-40} max={95}
            onChange={(v) => atualizar((p) => ({ ...p, produto: { ...p.produto, T_armazenamento_C: v } }))} />
        </div>

        <dl className="mt-3 grid gap-3 rounded-md bg-creme p-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Volume nominal</dt>
            <dd className="font-bold tabular">{num1(V_nom)} m³</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Área molhada (auto)</dt>
            <dd className="font-bold tabular">
              {calculo && !("erro" in calculo)
                ? `${num1(calculo.areaResult.A_total_m2)} m²`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Área molhada (ft²)</dt>
            <dd className="font-bold tabular">
              {calculo && !("erro" in calculo)
                ? `${num1(calculo.areaResult.A_total_ft2)} ft²`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Classe do produto</dt>
            <dd className="font-bold">{projeto.produto.classe}</dd>
          </div>
        </dl>
      </Card>

      {/* Operação */}
      <Card title="Parâmetros de operação">
        <div className="grid gap-3 md:grid-cols-3">
          <NumberField label="Vazão máx. enchimento" unit="m³/h"
            value={projeto.operacao.Q_enchimento_m3h} step={5} min={0}
            onChange={(v) => atualizar((p) => ({ ...p, operacao: { ...p.operacao, Q_enchimento_m3h: v } }))} />
          <NumberField label="Vazão máx. esvaziamento" unit="m³/h"
            value={projeto.operacao.Q_esvaziamento_m3h} step={5} min={0}
            onChange={(v) => atualizar((p) => ({ ...p, operacao: { ...p.operacao, Q_esvaziamento_m3h: v } }))} />
          <NumberField label="Pressão de projeto" unit="kPa(g)"
            value={projeto.pressoes.P_projeto_kPa} step={0.1} min={0} max={20}
            onChange={(v) => atualizar((p) => ({ ...p, pressoes: { ...p.pressoes, P_projeto_kPa: v } }))}
            hint={`= ${num1(kPaParaMbar(projeto.pressoes.P_projeto_kPa))} mbar`} />
        </div>
      </Card>

      {/* Fatores normativos */}
      <Card
        title="Fatores normativos — API 2000 Tabela 1"
        subtitle="Insira os fatores da API 2000, 7ª edição (2014), Tabela 1, para cálculo normativo completo. Se não preenchido, o sistema usa o mínimo físico por deslocamento."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-carbono-700">
              Fator de outbreathing (enchimento)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={projeto.fatoresNormativos.fator_outbreathing ?? ""}
                placeholder="null — mínimo físico"
                onChange={(e) =>
                  setFator("fator_outbreathing", e.target.value === "" ? null : Number(e.target.value))
                }
                className="tabular w-full rounded border border-carbono-200 bg-white px-3 py-2 text-sm"
              />
              {projeto.fatoresNormativos.fator_outbreathing !== null && (
                <button
                  onClick={() => setFator("fator_outbreathing", null)}
                  className="rounded border border-carbono-200 px-2 text-xs text-carbono-500 hover:bg-creme"
                  title="Limpar — usar mínimo físico"
                >✕</button>
              )}
            </div>
            <p className="text-xs text-carbono-500">
              API 2000, 7ª ed. (2014), Tabela 1 — classe {projeto.produto.classe},{" "}
              T = {projeto.produto.T_armazenamento_C}°C
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-carbono-700">
              Fator de inbreathing (esvaziamento)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={projeto.fatoresNormativos.fator_inbreathing ?? ""}
                placeholder="null — mínimo físico"
                onChange={(e) =>
                  setFator("fator_inbreathing", e.target.value === "" ? null : Number(e.target.value))
                }
                className="tabular w-full rounded border border-carbono-200 bg-white px-3 py-2 text-sm"
              />
              {projeto.fatoresNormativos.fator_inbreathing !== null && (
                <button
                  onClick={() => setFator("fator_inbreathing", null)}
                  className="rounded border border-carbono-200 px-2 text-xs text-carbono-500 hover:bg-creme"
                  title="Limpar — usar mínimo físico"
                >✕</button>
              )}
            </div>
            <p className="text-xs text-carbono-500">
              API 2000, 7ª ed. (2014), Tabela 1
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-amarelo-200 bg-amarelo-50 px-3 py-2 text-xs text-amarelo-800">
          <strong>Aviso de copyright:</strong> Os fatores da Tabela 1 da API 2000 são protegidos.
          Consulte sua cópia da norma para obter os valores corretos para a classe e temperatura do produto.
          O NTANK não reproduz tabelas normativas.
        </div>
      </Card>

      {/* Resultados */}
      {calculo && !("erro" in calculo) && (
        <>
          <Card title="Resultados — Respiro Normal" destaque>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                  <tr>
                    <th className="px-3 py-2">Cenário</th>
                    <th className="px-3 py-2">Mínimo físico</th>
                    <th className="px-3 py-2">Normativo (Tabela 1)</th>
                    <th className="px-3 py-2 font-bold">Adotado</th>
                    <th className="px-3 py-2">SCFH ar</th>
                    <th className="px-3 py-2">Tipo VPV</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Outbreathing */}
                  <tr className="border-b border-carbono-100 tabular hover:bg-creme">
                    <td className="px-3 py-2 font-semibold">
                      Saída de vapor/ar<br />
                      <span className="text-xs font-normal text-carbono-500">Enchimento — outbreathing</span>
                    </td>
                    <td className="px-3 py-2">{num1(calculo.respiro.Q_out_fisico_Nm3h)} Nm³/h</td>
                    <td className="px-3 py-2">
                      {calculo.respiro.Q_out_normativo_Nm3h !== null
                        ? `${num1(calculo.respiro.Q_out_normativo_Nm3h)} Nm³/h`
                        : <span className="text-carbono-400">— (preencher Tabela 1)</span>}
                    </td>
                    <td className="px-3 py-2 text-lg font-bold text-verde">
                      {num1(calculo.respiro.Q_out_requerido_Nm3h)} Nm³/h
                    </td>
                    <td className="px-3 py-2">{num1(calculo.respiro.Q_out_requerido_SCFH)}</td>
                    <td className="px-3 py-2">
                      <Badge cor="carbono">Pressão</Badge>
                    </td>
                  </tr>
                  {/* Inbreathing */}
                  <tr className="border-b border-carbono-100 tabular hover:bg-creme">
                    <td className="px-3 py-2 font-semibold">
                      Entrada de ar<br />
                      <span className="text-xs font-normal text-carbono-500">Esvaziamento — inbreathing</span>
                    </td>
                    <td className="px-3 py-2">{num1(calculo.respiro.Q_in_fisico_Nm3h)} Nm³/h</td>
                    <td className="px-3 py-2">
                      {calculo.respiro.Q_in_normativo_Nm3h !== null
                        ? `${num1(calculo.respiro.Q_in_normativo_Nm3h)} Nm³/h`
                        : <span className="text-carbono-400">— (preencher Tabela 1)</span>}
                    </td>
                    <td className="px-3 py-2 text-lg font-bold text-verde">
                      {num1(calculo.respiro.Q_in_requerido_Nm3h)} Nm³/h
                    </td>
                    <td className="px-3 py-2">{num1(calculo.respiro.Q_in_requerido_SCFH)}</td>
                    <td className="px-3 py-2">
                      <Badge cor="carbono">Vácuo</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-md border border-verde-200 bg-verde-50 p-3">
                <dt className="text-xs text-carbono-500">VPV pressão — requerido</dt>
                <dd className="font-title text-2xl font-bold tabular">
                  {num1(calculo.respiro.Q_out_requerido_Nm3h)} Nm³/h
                </dd>
                <dd className="text-xs text-carbono-500">
                  {num1(nm3hParaScfh(calculo.respiro.Q_out_requerido_Nm3h))} SCFH ar equivalente
                </dd>
              </div>
              <div className="rounded-md border border-verde-200 bg-verde-50 p-3">
                <dt className="text-xs text-carbono-500">VPV vácuo — requerido</dt>
                <dd className="font-title text-2xl font-bold tabular">
                  {num1(calculo.respiro.Q_in_requerido_Nm3h)} Nm³/h
                </dd>
                <dd className="text-xs text-carbono-500">
                  {num1(nm3hParaScfh(calculo.respiro.Q_in_requerido_Nm3h))} SCFH ar equivalente
                </dd>
              </div>
              <div className="rounded-md bg-creme p-3">
                <dt className="text-xs text-carbono-500">Norma</dt>
                <dd className="text-sm font-medium">{calculo.respiro.referenciaNormativa}</dd>
                <dd className="mt-1 text-xs text-carbono-500">{calculo.respiro.parametros.classe} · {calculo.respiro.parametros.T_armazenamento_C}°C</dd>
              </div>
            </dl>
          </Card>

          {/* Memória de cálculo */}
          <Card title="Memória de cálculo">
            <div className="space-y-3 rounded-md bg-creme p-3 font-mono text-xs">
              <div>
                <p className="font-bold not-italic">Outbreathing (enchimento):</p>
                <p>{calculo.respiro.formula_out}</p>
              </div>
              <div>
                <p className="font-bold not-italic">Inbreathing (esvaziamento):</p>
                <p>{calculo.respiro.formula_in}</p>
              </div>
              <div>
                <p className="font-bold not-italic">Fator de temperatura:</p>
                <p>
                  f_T = 273,15 / ({projeto.produto.T_armazenamento_C} + 273,15) = {num2(calculo.respiro.parametros.fator_T)}
                </p>
              </div>
              {calculo.respiro.usouMinimoFisico && (
                <p className="rounded border border-amarelo-300 bg-amarelo-50 px-2 py-1 text-xs not-italic text-amarelo-800">
                  ⚠ Mínimo físico usado — fatores normativos da API 2000 Tabela 1 não preenchidos.
                  Para cálculo normativo completo, consulte a API Standard 2000, 7ª ed. (2014).
                </p>
              )}
            </div>
          </Card>

          {/* Alertas */}
          {calculo.respiro.alertas.length > 0 && (
            <Card title="Alertas e verificações">
              <div className="space-y-2">
                {calculo.respiro.alertas.map((a, i) => (
                  <div
                    key={i}
                    className={[
                      "rounded-md border px-3 py-2 text-sm",
                      a.nivel === "BLOQUEANTE" || a.nivel === "CRITICO"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : a.nivel === "ALERTA"
                          ? "border-amarelo-200 bg-amarelo-50 text-amarelo-800"
                          : "border-carbono-200 bg-creme text-carbono-700",
                    ].join(" ")}
                  >
                    <span className="font-semibold">[{a.code}] </span>
                    {a.mensagem}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {calculo && "erro" in calculo && (
        <Card>
          <p className="text-sm text-red-700">Erro no cálculo: {calculo.erro}</p>
        </Card>
      )}

      <div className="flex justify-between">
        <Link href="/"><Button variant="ghost">← Calculadoras</Button></Link>
        <Link href="/api2000/novo"><Button variant="secondary">+ Novo cálculo</Button></Link>
      </div>
    </div>
  );
}
