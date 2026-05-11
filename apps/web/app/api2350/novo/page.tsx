"use client";

/**
 * Página de criação de novo cálculo API 2350.
 *
 * Coleta as informações básicas de identificação, geometria, produto
 * e operação — suficientes para criar o projeto e navegar à página de cálculo.
 *
 * Campos avançados (OPS, monitoramento, tempo de resposta, níveis) são
 * preenchidos diretamente na página /api2350/[id].
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { criarProjetoAPI2350 } from "@/lib/api2350-projeto";
import { salvarProjetoAPI2350 } from "@/lib/db";
import type {
  ClasseNFPA,
  NormaContrucao,
  TipoInstalacao,
  TipoTanqueAPI2350,
} from "@/lib/api2350-projeto";

// ---------------------------------------------------------------------------
// Opções
// ---------------------------------------------------------------------------

const TIPOS_TANQUE: ReadonlyArray<{ value: TipoTanqueAPI2350; label: string }> = [
  { value: "vertical-teto-fixo",               label: "Vertical — Teto Fixo (Cone / Dome)" },
  { value: "vertical-teto-flutuante-interno",  label: "Vertical — Teto Flutuante Interno (IFR)" },
  { value: "vertical-teto-flutuante-externo",  label: "Vertical — Teto Flutuante Externo (EFR)" },
  { value: "horizontal",                       label: "Horizontal" },
  { value: "outro",                            label: "Outro" },
];

const CLASSES_NFPA: ReadonlyArray<{ value: ClasseNFPA; label: string }> = [
  { value: "I",             label: "Classe I — PF < 37,8°C (ex.: gasolina)" },
  { value: "II",            label: "Classe II — 37,8°C ≤ PF < 60°C (ex.: diesel)" },
  { value: "IIIA",          label: "Classe IIIA — 60°C ≤ PF < 93°C (ex.: óleo combustível)" },
  { value: "IIIB",          label: "Classe IIIB — PF ≥ 93°C (ex.: asfalto, óleo lubrificante)" },
  { value: "nao-inflamavel", label: "Não inflamável" },
];

const NORMAS_CONSTRUCAO: ReadonlyArray<{ value: NormaContrucao; label: string }> = [
  { value: "API650",  label: "API 650 — Tanques de Aço Soldados" },
  { value: "API620",  label: "API 620 — Tanques de Baixa Pressão" },
  { value: "NBR7821", label: "ABNT NBR 7821 — Tanques Soldados (nacional)" },
  { value: "UL142",   label: "UL 142 — Tanques de Aço para Líquidos Inflamáveis" },
  { value: "outro",   label: "Outra / Especificar em observações" },
];

const TIPOS_INSTALACAO: ReadonlyArray<{ value: TipoInstalacao; label: string }> = [
  { value: "refinaria",          label: "Refinaria" },
  { value: "terminal",           label: "Terminal" },
  { value: "base-distribuicao",  label: "Base de Distribuição" },
  { value: "terminal-pipeline",  label: "Terminal de Pipeline" },
  { value: "terminal-marketing", label: "Terminal de Marketing" },
  { value: "outro",              label: "Outro" },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function NovoAPI2350Page() {
  const router = useRouter();

  // --- Identificação ---
  const [nome, setNome]             = useState("");
  const [cliente, setCliente]       = useState("");
  const [local, setLocal]           = useState("");
  const [pasta, setPasta]           = useState("");
  const [tag, setTag]               = useState("TQ-001");
  const [servico, setServico]       = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [normaConst, setNormaConst] = useState<NormaContrucao>("API650");
  const [tipoInst, setTipoInst]     = useState<TipoInstalacao>("base-distribuicao");

  // --- Geometria ---
  const [tipoTanque, setTipoTanque] = useState<TipoTanqueAPI2350>("vertical-teto-fixo");
  const [D_m, setD]                 = useState(7.64);
  const [H_total, setHTotal]        = useState(12);
  const [H_util, setHUtil]          = useState(11.5);
  const [usarVPorMm, setUsarVPorMm] = useState(false);
  const [vPorMm, setVPorMm]         = useState<number>(0);

  // --- Produto ---
  const [nomeProduto, setNomeProduto]   = useState("");
  const [classeNFPA, setClasseNFPA]     = useState<ClasseNFPA>("II");

  // --- Operação ---
  const [vazaoMax, setVazaoMax]         = useState(100);

  async function handleCriar() {
    if (D_m <= 0 || H_total <= 0) {
      alert("Diâmetro e altura total devem ser maiores que zero.");
      return;
    }
    if (H_util > H_total) {
      alert("Altura útil não pode ser maior que a altura total do tanque.");
      return;
    }
    if (usarVPorMm && vPorMm <= 0) {
      alert("Volume por mm deve ser maior que zero quando habilitado.");
      return;
    }

    const projeto = criarProjetoAPI2350({
      nome: nome || `API 2350 — ${tag}`,
      cliente: cliente || undefined,
      local: local || undefined,
      pasta: pasta || undefined,
      tagTanque: tag,
      servico: servico || undefined,
    });

    // Sobrescrever defaults com valores do formulário
    projeto.responsavelAnalise   = responsavel;
    projeto.normaContrucao       = normaConst;
    projeto.escopo.tipoInstalacao = tipoInst;
    projeto.geometria = {
      tipoTanque,
      D_m,
      H_total_m: H_total,
      H_util_m: H_util,
      usarVPorMm,
      vPorMm_m3_mm: usarVPorMm ? vPorMm : null,
    };
    projeto.produto.nome      = nomeProduto;
    projeto.produto.classeNFPA = classeNFPA;
    projeto.produto.inflamavel = classeNFPA !== "nao-inflamavel";
    projeto.operacao.vazaoMax_m3h = vazaoMax;

    // Ajustar escopo de acordo com classe NFPA
    projeto.escopo.produtoClasseI_NFPA  = classeNFPA === "I";
    projeto.escopo.produtoClasseII_NFPA = classeNFPA === "II" || classeNFPA === "IIIA";

    await salvarProjetoAPI2350(projeto);
    router.push(`/api2350/${projeto.id}`);
  }

  // Pré-visualização
  const A_m2   = (Math.PI * D_m * D_m) / 4;
  const V_nom  = A_m2 * H_total;
  const V_util = A_m2 * H_util;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-title text-3xl font-extrabold tracking-tight">
          Nova análise API 2350
        </h1>
        <p className="mt-1 text-sm text-carbono-600">
          Prevenção de transbordamento — API Standard 2350, 5ª edição (2020).
        </p>
      </header>

      {/* Identificação */}
      <Card title="Identificação">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Nome da análise" value={nome} onChange={setNome}
            placeholder="Ex.: OPS TQ-101 — Base Sombrio" />
          <TextField label="Tag do tanque" value={tag} onChange={setTag}
            placeholder="Ex.: TQ-101" />
          <TextField label="Serviço / Produto" value={servico} onChange={setServico}
            placeholder="Ex.: Diesel S10" />
          <TextField label="Cliente (opcional)" value={cliente} onChange={setCliente} />
          <TextField label="Local (opcional)" value={local} onChange={setLocal}
            placeholder="Ex.: Sombrio/SC" />
          <TextField label="Pasta (opcional)" value={pasta} onChange={setPasta}
            placeholder="Ex.: Base Sombrio" />
          <TextField label="Responsável pela análise" value={responsavel}
            onChange={setResponsavel} placeholder="Nome do engenheiro / técnico" />
          <SelectField label="Norma de construção"
            value={normaConst}
            onChange={(v) => setNormaConst(v as NormaContrucao)}
            options={NORMAS_CONSTRUCAO} />
          <SelectField label="Tipo de instalação"
            value={tipoInst}
            onChange={(v) => setTipoInst(v as TipoInstalacao)}
            options={TIPOS_INSTALACAO} />
        </div>
      </Card>

      {/* Geometria */}
      <Card title="Geometria do tanque">
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField
            label="Tipo de tanque"
            value={tipoTanque}
            onChange={(v) => setTipoTanque(v as TipoTanqueAPI2350)}
            options={TIPOS_TANQUE}
          />
          <NumberField label="Diâmetro interno D" unit="m"
            value={D_m} onChange={setD} step={0.01} min={0.1} max={100} />
          <NumberField label="Altura total do costado" unit="m"
            value={H_total} onChange={setHTotal} step={0.5} min={0.5} max={30} />
          <NumberField label="Altura útil (calibrada)" unit="m"
            value={H_util} onChange={setHUtil} step={0.1} min={0.1} max={H_total}
            hint="Altura da régua de calibração (≤ H total)" />
        </div>

        {/* Volume por mm manual */}
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={usarVPorMm}
              onChange={(e) => setUsarVPorMm(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Usar volume/mm manual (tabela de calibração)
          </label>
          {usarVPorMm && (
            <div className="w-48">
              <NumberField label="" unit="m³/mm"
                value={vPorMm} onChange={setVPorMm} step={0.001} min={0.001}
                hint="V/mm na zona superior do tanque" />
            </div>
          )}
        </div>

        {/* Pré-visualização */}
        <div className="mt-3 flex flex-wrap gap-4 rounded-md bg-creme p-3 text-sm">
          {!usarVPorMm ? (
            <>
              <span>
                Área da seção: <strong className="tabular">{A_m2.toFixed(2)} m²</strong>
              </span>
              <span>
                Volume nominal: <strong className="tabular">{V_nom.toFixed(1)} m³</strong>
              </span>
              <span>
                Volume útil: <strong className="tabular">{V_util.toFixed(1)} m³</strong>
              </span>
              <span>
                V/mm geométrico:{" "}
                <strong className="tabular">{(A_m2 / 1000).toFixed(4)} m³/mm</strong>
              </span>
            </>
          ) : (
            <span>
              V/mm manual: <strong className="tabular">{vPorMm} m³/mm</strong>
              {" — "}Área equivalente:{" "}
              <strong className="tabular">{(vPorMm * 1000).toFixed(2)} m²</strong>
            </span>
          )}
        </div>
      </Card>

      {/* Produto */}
      <Card title="Produto armazenado">
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Nome do produto"
            value={nomeProduto} onChange={setNomeProduto}
            placeholder="Ex.: Diesel S10, Gasolina C, Etanol Anidro" />
          <SelectField label="Classe NFPA 30"
            value={classeNFPA}
            onChange={(v) => setClasseNFPA(v as ClasseNFPA)}
            options={CLASSES_NFPA} />
        </div>
        {classeNFPA === "I" && (
          <p className="mt-3 rounded-md border border-amarelo-200 bg-amarelo-50 px-3 py-2 text-sm text-amarelo-800">
            ⚠ Produto Classe I — produto altamente inflamável. A API 2350 geralmente inclui
            este produto no escopo de aplicação plena.
          </p>
        )}
      </Card>

      {/* Operação */}
      <Card title="Operação"
        subtitle="Vazão de recebimento usada no cálculo de volume e tempo de resposta.">
        <div className="grid gap-3 md:grid-cols-2">
          <NumberField label="Vazão máxima de recebimento" unit="m³/h"
            value={vazaoMax} onChange={setVazaoMax} step={5} min={0}
            hint="Throughput máximo na entrada do tanque" />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push("/")}>
          Cancelar
        </Button>
        <Button onClick={handleCriar}>
          Criar análise →
        </Button>
      </div>
    </div>
  );
}
