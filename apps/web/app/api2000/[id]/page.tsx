"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  calcularRespiroNormal,
  calcularTermico,
  calcularEmergenciaFogo,
  calcularAreaMolhadaVertical,
  verificarDispositivo,
  nm3hParaScfh,
  kPaParaMbar,
  type DispositivoAlivioAPI2000,
  type ClasseLiquidoAPI2000,
  type TipoTanqueAPI2000,
  type ModoEntradaEmergencia,
  type TipoDispositivo,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { useApi2000Projeto } from "@/lib/useApi2000Projeto";
import {
  novoDispositivoId,
  EMERGENCIA_DEFAULT,
  TERMICO_DEFAULT,
  type ProjetoAPI2000,
  type FatoresNormativosAPI2000,
  type EmergenciaAPI2000,
  type TermicoAPI2000,
} from "@/lib/api2000-projeto";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Constantes de UI
// ---------------------------------------------------------------------------

const CLASSES: ReadonlyArray<{ value: ClasseLiquidoAPI2000; label: string }> = [
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

const TIPOS_DISPOSITIVO: ReadonlyArray<{ value: TipoDispositivo; label: string }> = [
  { value: "VPV",                label: "VPV — Válvula pressão/vácuo" },
  { value: "respiro-aberto",     label: "Respiro aberto (breather vent)" },
  { value: "valvula-emergencia", label: "Válvula de emergência" },
  { value: "hatch-emergencia",   label: "Hatch / tampa de emergência" },
  { value: "teto-fragil",        label: "Teto frágil (junta frágil)" },
  { value: "outro",              label: "Outro" },
];

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------
const n1 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Componente de alerta inline
// ---------------------------------------------------------------------------
function Alerta({ code, nivel, mensagem }: { code: string; nivel: string; mensagem: string }) {
  const cor =
    nivel === "BLOQUEANTE" || nivel === "CRITICO"
      ? "border-red-200 bg-red-50 text-red-800"
      : nivel === "ALERTA"
        ? "border-amarelo-200 bg-amarelo-50 text-amarelo-800"
        : "border-carbono-200 bg-creme text-carbono-700";
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${cor}`}>
      <span className="font-semibold">[{code}]</span> {mensagem}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function API2000Page({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useApi2000Projeto(id);

  // Cálculo reativo
  const calculo = useMemo(() => {
    if (estado.status !== "ok") return null;
    const { projeto } = estado;
    try {
      // Área molhada
      const areaRes = calcularAreaMolhadaVertical({
        D_m: projeto.geometria.D_m,
        H_liq_m: projeto.geometria.H_liq_max_m,
      });
      const A_wet = projeto.geometria.areaAutoCalculada
        ? areaRes.A_total_m2
        : (projeto.geometria.A_wet_manual_m2 ?? areaRes.A_total_m2);

      // Respiro normal
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

      // Efeito térmico
      const V_nominal = (Math.PI * projeto.geometria.D_m ** 2 * projeto.geometria.H_m) / 4;
      const termico = calcularTermico({
        V_nominal_m3: V_nominal,
        T_armazenamento_C: projeto.produto.T_armazenamento_C,
        classe: projeto.produto.classe,
        Q_termico_Nm3h: projeto.termico.Q_termico_Nm3h,
        blanketing: projeto.produto.blanketing,
      });

      // Emergência por fogo
      const emergencia = projeto.emergencia.calcular
        ? calcularEmergenciaFogo({
            modo: projeto.emergencia.modo,
            A_wet_m2: A_wet,
            Q_calor_kW: projeto.emergencia.Q_calor_kW,
            L_kJ_kg: projeto.produto.L_kJ_kg ?? null,
            M_kg_kmol: projeto.produto.M_kg_kmol ?? null,
            T_alivio_C: projeto.emergencia.T_alivio_C,
            Q_emergencia_Nm3h_direto: projeto.emergencia.Q_emergencia_direto_Nm3h,
            F_ambiental: projeto.emergencia.F_ambiental,
            P_max_emergencia_kPa: projeto.pressoes.P_max_emergencia_kPa ?? null,
            resfriamentoAgua: projeto.emergencia.resfriamentoAgua,
            isolamentoAprovado: projeto.emergencia.isolamentoAprovado,
          })
        : null;

      // Verificação de dispositivos
      const verificacoes = projeto.dispositivos.map((d) => {
        const Q_out = respiro.Q_out_requerido_Nm3h;
        const Q_in = respiro.Q_in_requerido_Nm3h;
        // Para VPV: verificar ambos os lados
        return {
          dispositivo: d,
          outbreathing: verificarDispositivo(d, "outbreathing", Q_out),
          inbreathing: verificarDispositivo(d, "inbreathing", Q_in),
          emergenciaResult: emergencia?.Q_emergencia_Nm3h
            ? verificarDispositivo(d, "emergencia", emergencia.Q_emergencia_Nm3h)
            : null,
        };
      });

      // VPV pressão requerido total = max(Q_out, Q_termico se considerar)
      const Q_out_total = projeto.termico.considerar && termico.Q_termico_Nm3h !== null
        ? Math.max(respiro.Q_out_requerido_Nm3h, termico.Q_termico_Nm3h)
        : respiro.Q_out_requerido_Nm3h;
      // VPV vácuo requerido total = max(Q_in, Q_termico se considerar)
      const Q_in_total = projeto.termico.considerar && termico.Q_termico_Nm3h !== null
        ? Math.max(respiro.Q_in_requerido_Nm3h, termico.Q_termico_Nm3h)
        : respiro.Q_in_requerido_Nm3h;

      return { areaRes, A_wet, respiro, termico, emergencia, verificacoes, V_nominal, Q_out_total, Q_in_total };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [estado]);

  // ----- Guards de estado -----
  if (estado.status === "carregando")
    return <p className="text-sm text-carbono-500">Carregando…</p>;
  if (estado.status === "ausente")
    return <Card><p className="text-sm">Cálculo não encontrado.</p><Link href="/"><Button variant="ghost" size="sm">← Início</Button></Link></Card>;
  if (estado.status === "erro")
    return <Card><p className="text-sm text-red-700">Erro: {estado.mensagem}</p></Card>;

  const { projeto } = estado;
  const [gerando, setGerando] = useState(false);

  // Função de download do PDF
  async function baixarPDF() {
    if (!calculo || "erro" in calculo) return;
    setGerando(true);
    try {
      const [{ pdf }, { MemoriaAPI2000PDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/MemoriaAPI2000PDF"),
      ]);
      const logoUrl = `${window.location.origin}/ntank-logo.png`;
      const blob = await pdf(
        <MemoriaAPI2000PDF projeto={projeto} calculo={calculo} logoUrl={logoUrl} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ntank-api2000-${projeto.tagTanque.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGerando(false);
    }
  }

  // Helpers de mutação
  const set = <K extends keyof ProjetoAPI2000>(k: K, v: ProjetoAPI2000[K]) =>
    atualizar((p) => ({ ...p, [k]: v }));

  const setFator = (k: keyof FatoresNormativosAPI2000, v: number | null) =>
    atualizar((p) => ({ ...p, fatoresNormativos: { ...p.fatoresNormativos, [k]: v } }));

  const setEmergencia = <K extends keyof EmergenciaAPI2000>(k: K, v: EmergenciaAPI2000[K]) =>
    atualizar((p) => ({ ...p, emergencia: { ...p.emergencia, [k]: v } }));

  const setTermico = <K extends keyof TermicoAPI2000>(k: K, v: TermicoAPI2000[K]) =>
    atualizar((p) => ({ ...p, termico: { ...p.termico, [k]: v } }));

  // Dispositivos
  function adicionarDispositivo() {
    const novo: DispositivoAlivioAPI2000 = {
      id: novoDispositivoId(),
      tag: `VPV-${String(projeto.dispositivos.length + 1).padStart(2, "0")}`,
      tipo: "VPV",
      cortaChamas: false,
      capacidade_pressao_Nm3h: null,
      capacidade_vacuo_Nm3h: null,
    };
    atualizar((p) => ({ ...p, dispositivos: [...p.dispositivos, novo] }));
  }

  function atualizarDispositivo(dispId: string, patch: Partial<DispositivoAlivioAPI2000>) {
    atualizar((p) => ({
      ...p,
      dispositivos: p.dispositivos.map((d) => d.id === dispId ? { ...d, ...patch } : d),
    }));
  }

  function removerDispositivo(dispId: string) {
    atualizar((p) => ({ ...p, dispositivos: p.dispositivos.filter((d) => d.id !== dispId) }));
  }

  const V_nom = calculo && !("erro" in calculo) ? calculo.V_nominal : 0;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-carbono-500">
            API Standard 2000, 7ª ed. (2014) — Ventilação Normal e Emergência
          </p>
          <h1 className="font-title text-2xl font-extrabold tracking-tight">{projeto.nome}</h1>
          <p className="mt-0.5 text-sm text-carbono-600">
            {projeto.tagTanque}
            {projeto.cliente ? ` · ${projeto.cliente}` : ""}
            {projeto.local ? ` · ${projeto.local}` : ""}
          </p>
        </div>
        <Link href="/"><Button variant="ghost" size="sm">← Calculadoras</Button></Link>
      </header>

      {/* ============================================================ */}
      {/* BLOCO 1 — Tanque e Produto                                   */}
      {/* ============================================================ */}
      <Card title="Bloco 1 — Tanque e produto">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="Tag" value={projeto.tagTanque}
            onChange={(v) => set("tagTanque", v)} />
          <SelectField label="Tipo de tanque" value={projeto.tipoTanque}
            onChange={(v) => set("tipoTanque", v as TipoTanqueAPI2000)}
            options={TIPOS_TANQUE} />
          <TextField label="Produto" value={projeto.produto.nome}
            onChange={(v) => atualizar((p) => ({ ...p, produto: { ...p.produto, nome: v } }))}
            placeholder="Ex.: Diesel S10" />
          <SelectField label="Classe (NBR 17505)" value={projeto.produto.classe}
            onChange={(v) => atualizar((p) => ({ ...p, produto: { ...p.produto, classe: v as ClasseLiquidoAPI2000 } }))}
            options={CLASSES} />
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

        {calculo && !("erro" in calculo) && (
          <dl className="mt-3 grid gap-3 rounded-md bg-creme p-3 text-sm md:grid-cols-4">
            <div><dt className="text-carbono-500">Volume nominal</dt><dd className="font-bold tabular">{n1(calculo.V_nominal)} m³</dd></div>
            <div><dt className="text-carbono-500">Área molhada</dt><dd className="font-bold tabular">{n1(calculo.A_wet)} m²</dd></div>
            <div><dt className="text-carbono-500">Área molhada</dt><dd className="font-bold tabular">{n1(calculo.areaRes.A_total_ft2)} ft²</dd></div>
            <div><dt className="text-carbono-500">Classe</dt><dd className="font-bold">{projeto.produto.classe}</dd></div>
          </dl>
        )}

        {(projeto.produto.classe === "IA" || projeto.produto.classe === "IB" || projeto.produto.classe === "IC") && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            ⚠ Classe {projeto.produto.classe} — VPV normalmente fechado obrigatório (API 2000).
          </p>
        )}
      </Card>

      {/* ============================================================ */}
      {/* BLOCO 2 — Operação e Pressões                                */}
      {/* ============================================================ */}
      <Card title="Bloco 2 — Operação e pressões">
        <div className="grid gap-3 md:grid-cols-4">
          <NumberField label="Q máx. enchimento" unit="m³/h"
            value={projeto.operacao.Q_enchimento_m3h} step={5} min={0}
            onChange={(v) => atualizar((p) => ({ ...p, operacao: { ...p.operacao, Q_enchimento_m3h: v } }))} />
          <NumberField label="Q máx. esvaziamento" unit="m³/h"
            value={projeto.operacao.Q_esvaziamento_m3h} step={5} min={0}
            onChange={(v) => atualizar((p) => ({ ...p, operacao: { ...p.operacao, Q_esvaziamento_m3h: v } }))} />
          <NumberField label="P projeto" unit="kPa(g)"
            value={projeto.pressoes.P_projeto_kPa} step={0.1} min={0} max={20}
            onChange={(v) => atualizar((p) => ({ ...p, pressoes: { ...p.pressoes, P_projeto_kPa: v } }))}
            hint={`= ${n1(kPaParaMbar(projeto.pressoes.P_projeto_kPa))} mbar`} />
          <NumberField label="Vácuo projeto" unit="kPa(g)"
            value={projeto.pressoes.V_projeto_kPa} step={0.05} min={0} max={5}
            onChange={(v) => atualizar((p) => ({ ...p, pressoes: { ...p.pressoes, V_projeto_kPa: v } }))}
            hint={`= ${n1(kPaParaMbar(projeto.pressoes.V_projeto_kPa))} mbar`} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={projeto.operacao.simultaneo}
              onChange={(e) => atualizar((p) => ({ ...p, operacao: { ...p.operacao, simultaneo: e.target.checked } }))}
              className="accent-verde" />
            Enchimento e esvaziamento simultâneos
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={projeto.operacao.recuperacaoVapor}
              onChange={(e) => atualizar((p) => ({ ...p, operacao: { ...p.operacao, recuperacaoVapor: e.target.checked } }))}
              className="accent-verde" />
            Sistema de recuperação de vapores
          </label>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* BLOCO 3 — Fatores Normativos (Tabela 1)                      */}
      {/* ============================================================ */}
      <Card title="Bloco 3 — Fatores normativos (API 2000 Tabela 1)"
        subtitle="Insira os fatores da API Standard 2000, 7ª ed. (2014), Tabela 1. Sem eles, o sistema usa o mínimo físico por deslocamento.">
        <div className="grid gap-4 md:grid-cols-2">
          {(["fator_outbreathing", "fator_inbreathing"] as const).map((chave) => {
            const label = chave === "fator_outbreathing"
              ? "Fator outbreathing (enchimento)"
              : "Fator inbreathing (esvaziamento)";
            const val = projeto.fatoresNormativos[chave];
            return (
              <div key={chave} className="space-y-1">
                <label className="block text-xs font-medium text-carbono-700">{label}</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" min="0"
                    value={val ?? ""}
                    placeholder="—  mínimo físico"
                    onChange={(e) => setFator(chave, e.target.value === "" ? null : Number(e.target.value))}
                    className="tabular w-full rounded border border-carbono-200 bg-white px-3 py-2 text-sm" />
                  {val !== null && (
                    <button onClick={() => setFator(chave, null)}
                      className="rounded border border-carbono-200 px-2 text-xs text-carbono-500 hover:bg-creme">✕</button>
                  )}
                </div>
                <p className="text-xs text-carbono-500">
                  API 2000, 7ª ed. · Tabela 1 · Classe {projeto.produto.classe} · {projeto.produto.T_armazenamento_C}°C
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 rounded-md border border-amarelo-200 bg-amarelo-50 px-3 py-2 text-xs text-amarelo-800">
          <strong>Copyright:</strong> Os fatores da Tabela 1 são protegidos. Consulte sua cópia da norma.
          O NTANK não reproduz tabelas normativas.
        </p>
      </Card>

      {/* ============================================================ */}
      {/* BLOCO 4 — Efeito Térmico                                     */}
      {/* ============================================================ */}
      <Card title="Bloco 4 — Efeito térmico normal (API 2000 Tabela 2)">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={projeto.termico.considerar}
            onChange={(e) => setTermico("considerar", e.target.checked)}
            className="accent-verde" />
          Considerar efeito térmico neste cálculo
        </label>

        {projeto.termico.considerar && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-carbono-700">
                Vazão de efeito térmico (API 2000 Tabela 2) [Nm³/h]
              </label>
              <div className="flex max-w-xs gap-2">
                <input type="number" step="0.1" min="0"
                  value={projeto.termico.Q_termico_Nm3h ?? ""}
                  placeholder="— preencher da Tabela 2"
                  onChange={(e) => setTermico("Q_termico_Nm3h", e.target.value === "" ? null : Number(e.target.value))}
                  className="tabular w-full rounded border border-carbono-200 bg-white px-3 py-2 text-sm" />
                {projeto.termico.Q_termico_Nm3h !== null && (
                  <button onClick={() => setTermico("Q_termico_Nm3h", null)}
                    className="rounded border border-carbono-200 px-2 text-xs text-carbono-500 hover:bg-creme">✕</button>
                )}
              </div>
              {calculo && !("erro" in calculo) && (
                <p className="text-xs text-carbono-500">
                  Tabela 2 da API 2000 · Volume: {n1(calculo.V_nominal)} m³
                  ({calculo.termico.V_bbl.toLocaleString("pt-BR")} bbl) · {projeto.produto.T_armazenamento_C}°C
                </p>
              )}
            </div>
            {calculo && !("erro" in calculo) && calculo.termico.alertas.map((a, i) => (
              <Alerta key={i} {...a} />
            ))}
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/* BLOCO 5 — Emergência por Fogo                                */}
      {/* ============================================================ */}
      <Card title="Bloco 5 — Ventilação de emergência por fogo (API 2000 Seção 6)">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={projeto.emergencia.calcular}
            onChange={(e) => setEmergencia("calcular", e.target.checked)}
            className="accent-verde" />
          Calcular ventilação de emergência por exposição ao fogo
        </label>

        {projeto.emergencia.calcular && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="Modo de entrada"
                value={projeto.emergencia.modo}
                onChange={(v) => setEmergencia("modo", v as ModoEntradaEmergencia)}
                options={[
                  { value: "calor_calculado", label: "Via Q_calor [kW] — converter em Nm³/h" },
                  { value: "vazao_direta",    label: "Vazão direta [Nm³/h] — já calculada" },
                ]} />
              <NumberField label="Fator ambiental F"
                unit=""
                value={projeto.emergencia.F_ambiental ?? 1.0}
                onChange={(v) => setEmergencia("F_ambiental", v)}
                step={0.05} min={0} max={2}
                hint="API 2000 Seção 6 — 1,0 sem reduções" />
            </div>

            {projeto.emergencia.modo === "calor_calculado" && (
              <>
                <div className="rounded-md border border-carbono-200 bg-creme p-3 text-xs text-carbono-700">
                  <strong>Instrução:</strong> Calcule Q_calor [kW] usando a fórmula da API 2000 Seção 6
                  com F = {projeto.emergencia.F_ambiental ?? "?"} e A_wet = {
                    calculo && !("erro" in calculo) ? n1(calculo.A_wet) : "—"
                  } m² ({calculo && !("erro" in calculo) ? n1(calculo.areaRes.A_total_ft2) : "—"} ft²).
                  Insira o resultado abaixo para conversão em Nm³/h.
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <NumberField label="Q calor absorvido" unit="kW"
                    value={projeto.emergencia.Q_calor_kW ?? 0}
                    onChange={(v) => setEmergencia("Q_calor_kW", v || null)}
                    step={10} min={0}
                    hint="Da fórmula da API 2000 Seção 6" />
                  <NumberField label="Calor latente L" unit="kJ/kg"
                    value={projeto.produto.L_kJ_kg ?? 0}
                    onChange={(v) => atualizar((p) => ({ ...p, produto: { ...p.produto, L_kJ_kg: v || null } }))}
                    step={10} min={0}
                    hint="Diesel ≈ 250 · Gasolina ≈ 300 · Etanol ≈ 841" />
                  <NumberField label="Massa molecular M" unit="kg/kmol"
                    value={projeto.produto.M_kg_kmol ?? 0}
                    onChange={(v) => atualizar((p) => ({ ...p, produto: { ...p.produto, M_kg_kmol: v || null } }))}
                    step={1} min={0}
                    hint="Diesel ≈ 198 · Gasolina ≈ 95 · Etanol = 46" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <NumberField label="Temperatura de alívio" unit="°C"
                    value={projeto.emergencia.T_alivio_C ?? 150}
                    onChange={(v) => setEmergencia("T_alivio_C", v)}
                    step={5} min={20} max={300}
                    hint="Ponto de ebulição à P de alívio (aprox.)" />
                  <NumberField label="P máx. em emergência" unit="kPa(g)"
                    value={projeto.pressoes.P_max_emergencia_kPa ?? projeto.pressoes.P_projeto_kPa}
                    onChange={(v) => atualizar((p) => ({ ...p, pressoes: { ...p.pressoes, P_max_emergencia_kPa: v } }))}
                    step={0.1} min={0}
                    hint="Geralmente = P_projeto ou superior" />
                </div>
              </>
            )}

            {projeto.emergencia.modo === "vazao_direta" && (
              <div className="max-w-xs">
                <NumberField label="Q emergência (direto)" unit="Nm³/h"
                  value={projeto.emergencia.Q_emergencia_direto_Nm3h ?? 0}
                  onChange={(v) => setEmergencia("Q_emergencia_direto_Nm3h", v || null)}
                  step={10} min={0}
                  hint="Calculado externamente com API 2000 Seção 6" />
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={projeto.emergencia.resfriamentoAgua}
                  onChange={(e) => setEmergencia("resfriamentoAgua", e.target.checked)}
                  className="accent-verde" />
                Sistema de resfriamento por água
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={projeto.emergencia.isolamentoAprovado}
                  onChange={(e) => setEmergencia("isolamentoAprovado", e.target.checked)}
                  className="accent-verde" />
                Isolamento térmico aprovado (API 2000)
              </label>
            </div>

            {calculo && !("erro" in calculo) && calculo.emergencia?.alertas.map((a, i) => (
              <Alerta key={i} {...a} />
            ))}
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/* BLOCO 6 — Dispositivos de Alívio                             */}
      {/* ============================================================ */}
      <Card
        title="Bloco 6 — Dispositivos de alívio"
        subtitle={projeto.dispositivos.length === 0
          ? "Cadastre os VPVs e dispositivos de emergência para verificar as margens."
          : `${projeto.dispositivos.length} dispositivo(s) cadastrado(s).`}
      >
        <Button size="sm" onClick={adicionarDispositivo}>+ Adicionar dispositivo</Button>

        {projeto.dispositivos.length > 0 && (
          <div className="mt-4 space-y-4">
            {projeto.dispositivos.map((d) => {
              const vrf = calculo && !("erro" in calculo)
                ? calculo.verificacoes.find((v) => v.dispositivo.id === d.id)
                : null;

              return (
                <div key={d.id} className="rounded-lg border border-carbono-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold">{d.tag} — {d.tipo}</h4>
                    <button onClick={() => removerDispositivo(d.id)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">✕ Remover</button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-carbono-700">TAG</label>
                      <input value={d.tag}
                        onChange={(e) => atualizarDispositivo(d.id, { tag: e.target.value })}
                        className="w-full rounded border border-carbono-200 bg-white px-2 py-1 text-sm" />
                    </div>
                    <div className="md:col-span-1">
                      <SelectField label="Tipo"
                        value={d.tipo}
                        onChange={(v) => atualizarDispositivo(d.id, { tipo: v as TipoDispositivo })}
                        options={TIPOS_DISPOSITIVO} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-carbono-700">Cap. pressão [Nm³/h]</label>
                      <input type="number" step="1" min="0"
                        value={d.capacidade_pressao_Nm3h ?? ""}
                        placeholder="—"
                        onChange={(e) => atualizarDispositivo(d.id, {
                          capacidade_pressao_Nm3h: e.target.value === "" ? null : Number(e.target.value)
                        })}
                        className="tabular w-full rounded border border-carbono-200 bg-white px-2 py-1 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-carbono-700">Cap. vácuo [Nm³/h]</label>
                      <input type="number" step="1" min="0"
                        value={d.capacidade_vacuo_Nm3h ?? ""}
                        placeholder="—"
                        onChange={(e) => atualizarDispositivo(d.id, {
                          capacidade_vacuo_Nm3h: e.target.value === "" ? null : Number(e.target.value)
                        })}
                        className="tabular w-full rounded border border-carbono-200 bg-white px-2 py-1 text-sm" />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={d.cortaChamas}
                        onChange={(e) => atualizarDispositivo(d.id, { cortaChamas: e.target.checked })}
                        className="accent-verde" />
                      Corta-chamas instalado
                    </label>
                    {d.cortaChamas && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-carbono-500">Redução:</span>
                        <input type="number" min="0" max="50" step="5"
                          value={d.reducaoCorta_pct ?? 25}
                          onChange={(e) => atualizarDispositivo(d.id, { reducaoCorta_pct: Number(e.target.value) })}
                          className="w-16 rounded border border-carbono-200 px-1 py-0.5 text-center" />
                        <span className="text-carbono-500">%</span>
                      </div>
                    )}
                  </div>

                  {/* Resultado de verificação */}
                  {vrf && calculo && !("erro" in calculo) && (
                    <div className="mt-3 grid gap-2 rounded-md bg-creme p-3 text-xs md:grid-cols-3">
                      {/* Outbreathing */}
                      <div>
                        <p className="font-semibold text-carbono-600">Pressão (outbreathing)</p>
                        <p>Requerido: <strong>{n1(calculo.Q_out_total)} Nm³/h</strong></p>
                        <p>Disponível: <strong>{vrf.outbreathing.Q_disponivel_Nm3h !== null ? n1(vrf.outbreathing.Q_disponivel_Nm3h) : "—"} Nm³/h</strong></p>
                        <Badge cor={vrf.outbreathing.status === "APROVADO" ? "verde" : vrf.outbreathing.status === "REPROVADO" ? "vermelho" : "carbono"}>
                          {vrf.outbreathing.status}
                          {vrf.outbreathing.margem !== null ? ` · ${n2(vrf.outbreathing.margem)}×` : ""}
                        </Badge>
                      </div>
                      {/* Inbreathing */}
                      <div>
                        <p className="font-semibold text-carbono-600">Vácuo (inbreathing)</p>
                        <p>Requerido: <strong>{n1(calculo.Q_in_total)} Nm³/h</strong></p>
                        <p>Disponível: <strong>{vrf.inbreathing.Q_disponivel_Nm3h !== null ? n1(vrf.inbreathing.Q_disponivel_Nm3h) : "—"} Nm³/h</strong></p>
                        <Badge cor={vrf.inbreathing.status === "APROVADO" ? "verde" : vrf.inbreathing.status === "REPROVADO" ? "vermelho" : "carbono"}>
                          {vrf.inbreathing.status}
                          {vrf.inbreathing.margem !== null ? ` · ${n2(vrf.inbreathing.margem)}×` : ""}
                        </Badge>
                      </div>
                      {/* Emergência */}
                      {vrf.emergenciaResult && (
                        <div>
                          <p className="font-semibold text-carbono-600">Emergência (fogo)</p>
                          <p>Requerido: <strong>{calculo.emergencia?.Q_emergencia_Nm3h !== null && calculo.emergencia?.Q_emergencia_Nm3h !== undefined ? n1(calculo.emergencia.Q_emergencia_Nm3h) : "—"} Nm³/h</strong></p>
                          <p>Disponível: <strong>{vrf.emergenciaResult.Q_disponivel_Nm3h !== null ? n1(vrf.emergenciaResult.Q_disponivel_Nm3h) : "—"} Nm³/h</strong></p>
                          <Badge cor={vrf.emergenciaResult.status === "APROVADO" ? "verde" : vrf.emergenciaResult.status === "REPROVADO" ? "vermelho" : "carbono"}>
                            {vrf.emergenciaResult.status}
                            {vrf.emergenciaResult.margem !== null ? ` · ${n2(vrf.emergenciaResult.margem)}×` : ""}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/* RESULTADOS CONSOLIDADOS                                       */}
      {/* ============================================================ */}
      {calculo && !("erro" in calculo) && (
        <Card title="Resumo — Vazões requeridas" destaque>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                <tr>
                  <th className="px-3 py-2">Cenário</th>
                  <th className="px-3 py-2">Norma</th>
                  <th className="px-3 py-2 text-right">Nm³/h</th>
                  <th className="px-3 py-2 text-right">SCFH</th>
                  <th className="px-3 py-2">Lado VPV</th>
                  <th className="px-3 py-2">Fonte</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-carbono-100 tabular hover:bg-creme">
                  <td className="px-3 py-2 font-semibold">Outbreathing (enchimento)</td>
                  <td className="px-3 py-2 text-carbono-500">API 2000, Seção 5</td>
                  <td className="px-3 py-2 text-right font-bold">{n1(calculo.respiro.Q_out_requerido_Nm3h)}</td>
                  <td className="px-3 py-2 text-right">{n1(calculo.respiro.Q_out_requerido_SCFH)}</td>
                  <td className="px-3 py-2"><Badge cor="carbono">Pressão</Badge></td>
                  <td className="px-3 py-2 text-xs text-carbono-500">
                    {calculo.respiro.usouMinimoFisico ? "Mínimo físico ⚠" : "Normativo ✓"}
                  </td>
                </tr>
                <tr className="border-b border-carbono-100 tabular hover:bg-creme">
                  <td className="px-3 py-2 font-semibold">Inbreathing (esvaziamento)</td>
                  <td className="px-3 py-2 text-carbono-500">API 2000, Seção 5</td>
                  <td className="px-3 py-2 text-right font-bold">{n1(calculo.respiro.Q_in_requerido_Nm3h)}</td>
                  <td className="px-3 py-2 text-right">{n1(calculo.respiro.Q_in_requerido_SCFH)}</td>
                  <td className="px-3 py-2"><Badge cor="carbono">Vácuo</Badge></td>
                  <td className="px-3 py-2 text-xs text-carbono-500">
                    {calculo.respiro.usouMinimoFisico ? "Mínimo físico ⚠" : "Normativo ✓"}
                  </td>
                </tr>
                {projeto.termico.considerar && (
                  <tr className="border-b border-carbono-100 tabular hover:bg-creme">
                    <td className="px-3 py-2 font-semibold">Efeito térmico</td>
                    <td className="px-3 py-2 text-carbono-500">API 2000, Tabela 2</td>
                    <td className="px-3 py-2 text-right font-bold">
                      {calculo.termico.Q_termico_Nm3h !== null ? n1(calculo.termico.Q_termico_Nm3h) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {calculo.termico.Q_termico_SCFH !== null ? n1(calculo.termico.Q_termico_SCFH) : "—"}
                    </td>
                    <td className="px-3 py-2"><Badge cor="info">P e V</Badge></td>
                    <td className="px-3 py-2 text-xs text-carbono-500">
                      {calculo.termico.informado ? "Tabela 2 ✓" : "Não preenchido ⚠"}
                    </td>
                  </tr>
                )}
                {projeto.emergencia.calcular && calculo.emergencia && (
                  <tr className="border-b border-carbono-100 tabular hover:bg-creme">
                    <td className="px-3 py-2 font-semibold">Emergência por fogo</td>
                    <td className="px-3 py-2 text-carbono-500">API 2000, Seção 6</td>
                    <td className="px-3 py-2 text-right font-bold">
                      {calculo.emergencia.Q_emergencia_Nm3h !== null ? n1(calculo.emergencia.Q_emergencia_Nm3h) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {calculo.emergencia.Q_emergencia_SCFH !== null ? n1(calculo.emergencia.Q_emergencia_SCFH) : "—"}
                    </td>
                    <td className="px-3 py-2"><Badge cor="amarelo">Emergência</Badge></td>
                    <td className="px-3 py-2 text-xs text-carbono-500">
                      {calculo.emergencia.Q_emergencia_Nm3h !== null ? "Calculado ✓" : "Dados incompletos ⚠"}
                    </td>
                  </tr>
                )}
                {/* Linha de total adotado */}
                <tr className="border-t-2 border-carbono-300 bg-verde-50 font-bold">
                  <td className="px-3 py-2" colSpan={2}>VPV pressão — dimensionar ≥</td>
                  <td className="px-3 py-2 text-right text-lg">{n1(calculo.Q_out_total)}</td>
                  <td className="px-3 py-2 text-right">{n1(nm3hParaScfh(calculo.Q_out_total))}</td>
                  <td className="px-3 py-2"><Badge cor="verde">Pressão</Badge></td>
                  <td className="px-3 py-2 text-xs">max(outbreathing, térmico)</td>
                </tr>
                <tr className="border-t border-carbono-200 bg-verde-50 font-bold">
                  <td className="px-3 py-2" colSpan={2}>VPV vácuo — dimensionar ≥</td>
                  <td className="px-3 py-2 text-right text-lg">{n1(calculo.Q_in_total)}</td>
                  <td className="px-3 py-2 text-right">{n1(nm3hParaScfh(calculo.Q_in_total))}</td>
                  <td className="px-3 py-2"><Badge cor="verde">Vácuo</Badge></td>
                  <td className="px-3 py-2 text-xs">max(inbreathing, térmico)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-carbono-500">
            Referência: API Standard 2000, 7ª edição (2014). Cálculo preliminar —
            não substitui seleção final de dispositivo com curva certificada do fabricante e ART/RRT.
          </p>
        </Card>
      )}

      {calculo && "erro" in calculo && (
        <Card><p className="text-sm text-red-700">Erro no cálculo: {calculo.erro}</p></Card>
      )}

      {/* Alertas consolidados */}
      {calculo && !("erro" in calculo) && (() => {
        const todosAlertas = [
          ...calculo.respiro.alertas,
          ...(projeto.termico.considerar ? calculo.termico.alertas : []),
          ...(projeto.emergencia.calcular && calculo.emergencia ? calculo.emergencia.alertas : []),
        ].filter((a, i, arr) => arr.findIndex((x) => x.code === a.code) === i); // deduplica por code
        return todosAlertas.length > 0 ? (
          <Card title="Alertas e verificações normativos">
            <div className="space-y-2">
              {todosAlertas.map((a, i) => <Alerta key={i} {...a} />)}
            </div>
          </Card>
        ) : null;
      })()}

      <div className="flex flex-wrap justify-between gap-3">
        <Link href="/"><Button variant="ghost">← Calculadoras</Button></Link>
        <div className="flex gap-2">
          {calculo && !("erro" in calculo) && (
            <Button
              variant="primary"
              onClick={baixarPDF}
              disabled={gerando}
            >
              {gerando ? "Gerando PDF…" : "⬇ Memória de cálculo PDF"}
            </Button>
          )}
          <Link href="/api2000/novo"><Button variant="secondary">+ Novo cálculo</Button></Link>
        </div>
      </div>
    </div>
  );
}
