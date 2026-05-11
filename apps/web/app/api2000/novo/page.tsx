"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { criarProjetoAPI2000 } from "@/lib/api2000-projeto";
import { salvarProjetoAPI2000 } from "@/lib/db";
import type { ClasseLiquidoAPI2000, TipoTanqueAPI2000 } from "@ntank/calc-core";

const CLASSES_LIQUIDO: ReadonlyArray<{ value: ClasseLiquidoAPI2000; label: string }> = [
  { value: "IA",            label: "Classe IA — PF < 23°C e PE < 38°C (ex.: gasolina)" },
  { value: "IB",            label: "Classe IB — PF < 23°C e PE ≥ 38°C (ex.: acetona)" },
  { value: "IC",            label: "Classe IC — 23°C ≤ PF < 38°C (ex.: xileno)" },
  { value: "II",            label: "Classe II — 38°C ≤ PF < 60°C (ex.: diesel)" },
  { value: "IIIA",          label: "Classe IIIA — 60°C ≤ PF < 93°C (ex.: óleo combustível)" },
  { value: "IIIB",          label: "Classe IIIB — PF ≥ 93°C (ex.: asfalto)" },
  { value: "nao-inflamavel", label: "Não inflamável" },
];

const TIPOS_TANQUE: ReadonlyArray<{ value: TipoTanqueAPI2000; label: string }> = [
  { value: "vertical-teto-fixo",               label: "Vertical — teto fixo atmosférico" },
  { value: "vertical-teto-flutuante-interno",  label: "Vertical — teto flutuante interno" },
  { value: "vertical-teto-flutuante-externo",  label: "Vertical — teto flutuante externo" },
  { value: "horizontal",                       label: "Horizontal" },
];

export default function NovoAPI2000Page() {
  const router = useRouter();

  // Identificação
  const [nome, setNome]     = useState("");
  const [cliente, setCliente] = useState("");
  const [local, setLocal]   = useState("");
  const [pasta, setPasta]   = useState("");
  const [tag, setTag]       = useState("T-001");

  // Geometria
  const [tipoTanque, setTipoTanque] = useState<TipoTanqueAPI2000>("vertical-teto-fixo");
  const [D_m, setD]   = useState(7.64);
  const [H_m, setH]   = useState(12);
  const [H_liq, setHliq] = useState(11.5);

  // Produto
  const [nomeProduto, setNomeProduto] = useState("");
  const [classe, setClasse] = useState<ClasseLiquidoAPI2000>("II");
  const [T_arm, setTArm]   = useState(30);

  // Operação
  const [Q_enc, setQEnc] = useState(100);
  const [Q_esv, setQEsv] = useState(80);

  async function handleCriar() {
    if (D_m <= 0 || H_m <= 0 || H_liq <= 0) {
      alert("Diâmetro, altura e nível máximo devem ser maiores que zero.");
      return;
    }
    if (H_liq > H_m) {
      alert("Nível máximo de líquido não pode ser maior que a altura do tanque.");
      return;
    }

    const projeto = criarProjetoAPI2000({
      nome: nome || `API 2000 — ${tag}`,
      cliente: cliente || undefined,
      local: local || undefined,
      pasta: pasta || undefined,
      tagTanque: tag,
    });

    // Sobrescrever defaults com os valores do formulário
    Object.assign(projeto, {
      tipoTanque,
      geometria: {
        D_m,
        H_m,
        H_liq_max_m: H_liq,
        areaAutoCalculada: true,
      },
      produto: {
        nome: nomeProduto,
        classe,
        T_armazenamento_C: T_arm,
        blanketing: false,
      },
      operacao: {
        Q_enchimento_m3h: Q_enc,
        Q_esvaziamento_m3h: Q_esv,
        simultaneo: false,
        recuperacaoVapor: false,
      },
    });

    await salvarProjetoAPI2000(projeto);
    router.push(`/api2000/${projeto.id}`);
  }

  const V_nom = (Math.PI * D_m * D_m * H_m) / 4;
  const A_wet = Math.PI * D_m * H_liq;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-title text-3xl font-extrabold tracking-tight">
          Novo cálculo API 2000
        </h1>
        <p className="mt-1 text-sm text-carbono-600">
          Ventilação normal de tanque atmosférico — API Standard 2000, 7ª edição (2014).
        </p>
      </header>

      {/* Identificação */}
      <Card title="Identificação">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Nome do cálculo" value={nome} onChange={setNome}
            placeholder="Ex.: Ventilação T-101 — Base Sombrio" />
          <TextField label="Tag do tanque" value={tag} onChange={setTag}
            placeholder="Ex.: T-101" />
          <TextField label="Cliente (opcional)" value={cliente} onChange={setCliente} />
          <TextField label="Local (opcional)" value={local} onChange={setLocal}
            placeholder="Ex.: Sombrio/SC" />
          <TextField label="Pasta (opcional)" value={pasta} onChange={setPasta}
            placeholder="Ex.: Base Sombrio" />
        </div>
      </Card>

      {/* Geometria */}
      <Card title="Geometria do tanque">
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField
            label="Tipo de tanque"
            value={tipoTanque}
            onChange={(v) => setTipoTanque(v as TipoTanqueAPI2000)}
            options={TIPOS_TANQUE}
          />
          <NumberField label="Diâmetro interno D" unit="m" value={D_m}
            onChange={setD} step={0.01} min={0.1} max={100} />
          <NumberField label="Altura do costado H" unit="m" value={H_m}
            onChange={setH} step={0.5} min={0.5} max={30} />
          <NumberField label="Nível máximo de líquido" unit="m" value={H_liq}
            onChange={setHliq} step={0.1} min={0.1} max={H_m}
            hint="Deve ser ≤ altura do costado" />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 rounded-md bg-creme p-3 text-sm">
          <span>
            Volume nominal:{" "}
            <strong className="tabular">{V_nom.toFixed(1)} m³</strong>
          </span>
          <span>
            Área molhada (costado):{" "}
            <strong className="tabular">{A_wet.toFixed(1)} m²</strong>
          </span>
        </div>
      </Card>

      {/* Produto */}
      <Card title="Produto armazenado">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField
            label="Nome do produto"
            value={nomeProduto}
            onChange={setNomeProduto}
            placeholder="Ex.: Diesel S10"
          />
          <SelectField
            label="Classe (NBR 17505 / NFPA 30)"
            value={classe}
            onChange={(v) => setClasse(v as ClasseLiquidoAPI2000)}
            options={CLASSES_LIQUIDO}
          />
          <NumberField
            label="Temperatura de armazenamento"
            unit="°C"
            value={T_arm}
            onChange={setTArm}
            step={1}
            min={-40}
            max={95}
            hint="Temperatura típica de operação do produto"
          />
        </div>
        {(classe === "IA" || classe === "IB" || classe === "IC") && (
          <p className="mt-3 rounded-md border border-amarelo-200 bg-amarelo-50 px-3 py-2 text-sm text-amarelo-800">
            ⚠ Produto Classe {classe} — válvula pressão/vácuo normalmente fechada é obrigatória
            (API 2000). Respiro aberto não é aceitável sem análise específica.
          </p>
        )}
      </Card>

      {/* Operação */}
      <Card title="Operação" subtitle="Vazões máximas que definem o dimensionamento do VPV.">
        <div className="grid gap-3 md:grid-cols-2">
          <NumberField
            label="Vazão máxima de enchimento"
            unit="m³/h"
            value={Q_enc}
            onChange={setQEnc}
            step={5}
            min={0}
            hint="Throughput de líquido entrando no tanque"
          />
          <NumberField
            label="Vazão máxima de esvaziamento"
            unit="m³/h"
            value={Q_esv}
            onChange={setQEsv}
            step={5}
            min={0}
            hint="Throughput de líquido saindo do tanque"
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push("/")}>
          Cancelar
        </Button>
        <Button onClick={handleCriar}>Calcular →</Button>
      </div>
    </div>
  );
}
