"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { MATERIAIS } from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { useProjeto } from "@/lib/useProjeto";
import { listarProjetos } from "@/lib/db";
import type {
  FundoDuploProjeto,
  FundoProjeto,
  TetoProjeto,
  TipoFundoUI,
  TipoTetoUI,
} from "@/lib/projeto";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjetoParametrosPage({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useProjeto(id);

  // ⚠️ Todos os hooks ANTES de qualquer return condicional (Rules of Hooks)
  const [pastasDisponiveis, setPastasDisponiveis] = useState<string[]>([]);
  const [novaPastaInput, setNovaPastaInput] = useState("");
  const [mostraNovaPasta, setMostraNovaPasta] = useState(false);
  useEffect(() => {
    listarProjetos().then((todos) => {
      const pastas = [
        ...new Set(todos.map((p) => p.pasta?.trim() ?? "").filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, "pt-BR"));
      setPastasDisponiveis(pastas);
    });
  }, []);

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
  const { parametros: p, fundo, teto } = projeto;

  function setParam<K extends keyof typeof p>(chave: K, valor: (typeof p)[K]) {
    atualizar((proj) => ({
      ...proj,
      parametros: { ...proj.parametros, [chave]: valor },
    }));
  }
  function setFundo<K extends keyof FundoProjeto>(
    chave: K,
    valor: FundoProjeto[K],
  ) {
    atualizar((proj) => ({
      ...proj,
      fundo: { ...proj.fundo, [chave]: valor },
    }));
  }
  function setFundoDuplo<K extends keyof FundoDuploProjeto>(
    chave: K,
    valor: FundoDuploProjeto[K],
  ) {
    atualizar((proj) => ({
      ...proj,
      fundoDuplo: { ...(proj.fundoDuplo ?? { ativo: false }), [chave]: valor },
    }));
  }

  function setTeto<K extends keyof TetoProjeto>(
    chave: K,
    valor: TetoProjeto[K],
  ) {
    atualizar((proj) => ({
      ...proj,
      teto: { ...proj.teto, [chave]: valor },
    }));
  }

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="parametros" />

      {/* Organização — Pasta */}
      <Card title="Organização" subtitle="Agrupe este projeto em uma pasta para facilitar a navegação.">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-48">
            <SelectField
              label="Pasta"
              value={projeto.pasta ?? ""}
              onChange={(v) => {
                if (v === "__nova__") {
                  setMostraNovaPasta(true);
                } else {
                  atualizar((proj) => ({ ...proj, pasta: v || undefined }));
                }
              }}
              options={[
                { value: "", label: "Sem pasta" },
                ...pastasDisponiveis.map((pasta) => ({ value: pasta, label: `📁 ${pasta}` })),
                { value: "__nova__", label: "+ Criar nova pasta…" },
              ]}
            />
          </div>
          {mostraNovaPasta && (
            <div className="flex gap-2 items-center flex-1 min-w-48">
              <input
                type="text"
                autoFocus
                placeholder="Nome da nova pasta…"
                value={novaPastaInput}
                onChange={(e) => setNovaPastaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novaPastaInput.trim()) {
                    const nome = novaPastaInput.trim();
                    atualizar((proj) => ({ ...proj, pasta: nome }));
                    setPastasDisponiveis((prev) =>
                      [...new Set([...prev, nome])].sort((a, b) => a.localeCompare(b, "pt-BR")),
                    );
                    setNovaPastaInput("");
                    setMostraNovaPasta(false);
                  }
                  if (e.key === "Escape") setMostraNovaPasta(false);
                }}
                className="flex-1 rounded border border-carbono-300 bg-white px-3 py-2 text-sm outline-none focus:border-verde"
              />
              <Button
                size="sm"
                onClick={() => {
                  const nome = novaPastaInput.trim();
                  if (!nome) return;
                  atualizar((proj) => ({ ...proj, pasta: nome }));
                  setPastasDisponiveis((prev) =>
                    [...new Set([...prev, nome])].sort((a, b) => a.localeCompare(b, "pt-BR")),
                  );
                  setNovaPastaInput("");
                  setMostraNovaPasta(false);
                }}
              >✓</Button>
              <Button size="sm" variant="ghost" onClick={() => setMostraNovaPasta(false)}>✕</Button>
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Bloco 1 — Costado e materiais"
        subtitle="Parâmetros que alimentam os métodos NBR 7821, API 650 1-Foot e VDP."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <TextField
            label="Produto armazenado"
            value={p.produto}
            onChange={(v) => setParam("produto", v)}
            placeholder="Ex.: Etanol hidratado, Diesel S10…"
          />
          <NumberField
            label="Densidade relativa G"
            value={p.G}
            onChange={(v) => setParam("G", v)}
            step={0.01}
            min={0.1}
            max={2.5}
            hint="1,0 = água. Etanol ≈ 0,79; Diesel ≈ 0,84."
          />
          <NumberField
            label="CA do costado"
            unit="mm"
            value={p.CA_mm}
            onChange={(v) => setParam("CA_mm", v)}
            step={0.5}
            min={0}
            max={6}
            hint="Sobrespessura de corrosão. Default NTN: 1,5 mm."
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SelectField
            label="Material das chapas"
            value={p.materialId}
            onChange={(v) => setParam("materialId", v)}
            options={Object.values(MATERIAIS).map((mat) => ({
              value: mat.id,
              label: `${mat.designacao} (Sd ${mat.Sd} MPa)`,
            }))}
            norma="ASME Sec. II Part D"
          />
          <NumberField
            label="Eficiência de junta E"
            value={p.E}
            onChange={(v) => setParam("E", v)}
            step={0.05}
            min={0.5}
            max={1}
            norma="API 650"
            hint="0,85 (radiografia parcial) ou 1,00 (radiografia total)."
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <NumberField
            label="Custo do aço"
            unit="R$/kg"
            value={p.custoAcoPorKg_R$}
            onChange={(v) => setParam("custoAcoPorKg_R$", v)}
            step={0.1}
            min={0}
            hint="Chapa de aço carbono. Default NTN: R$ 6,50/kg."
          />
          <NumberField
            label="Custo de mão de obra"
            unit="R$/kg"
            value={p.custoMaoDeObraPorKg_R$ ?? 18}
            onChange={(v) => setParam("custoMaoDeObraPorKg_R$", v)}
            step={1}
            min={0}
            hint="Fabricação + montagem. Default NTN: R$ 18,00/kg."
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SelectField
            label="Largura da chapa — Costado"
            value={p.larguraChapa_mm}
            onChange={(v) => setParam("larguraChapa_mm", Number(v))}
            options={[
              { value: 1500, label: "1.500 mm" },
              { value: 1800, label: "1.800 mm" },
              { value: 2000, label: "2.000 mm" },
              { value: 2440, label: "2.440 mm  (esp. ≥ 6,35 mm)" },
              { value: 2550, label: "2.550 mm  (esp. ≥ 6,35 mm)" },
            ]}
            hint={
              p.larguraChapa_mm >= 2400
                ? "Largura ≥ 2.400 mm: chapas comerciais a partir de 1/4″ (6,35 mm)."
                : "Define a altura de cada anel do costado."
            }
          />
          <SelectField
            label="Comprimento da chapa — Costado"
            value={p.comprimentoChapa_mm}
            onChange={(v) => setParam("comprimentoChapa_mm", Number(v))}
            options={[
              { value: 6000, label: "6.000 mm" },
              { value: 12000, label: "12.000 mm" },
            ]}
            hint="Usado no aproveitamento da circunferência."
          />
        </div>

        <div className="mt-4 rounded-md border border-carbono-200 bg-creme p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
            Chapas de fundo e teto (para cálculo de soldas e lista de materiais)
          </h4>
          <div className="grid gap-3 md:grid-cols-4">
            <SelectField
              label="Largura — Fundo"
              value={p.larguraChapaFundo_mm ?? p.larguraChapa_mm}
              onChange={(v) => setParam("larguraChapaFundo_mm", Number(v))}
              options={[
                { value: 1200, label: "1.200 mm" },
                { value: 1500, label: "1.500 mm" },
                { value: 2000, label: "2.000 mm" },
                { value: 2440, label: "2.440 mm" },
              ]}
            />
            <SelectField
              label="Comprimento — Fundo"
              value={p.comprimentoChapaFundo_mm ?? p.comprimentoChapa_mm}
              onChange={(v) => setParam("comprimentoChapaFundo_mm", Number(v))}
              options={[
                { value: 6000, label: "6.000 mm" },
                { value: 12000, label: "12.000 mm" },
              ]}
            />
            <SelectField
              label="Largura — Teto"
              value={p.larguraChapaTeto_mm ?? p.larguraChapa_mm}
              onChange={(v) => setParam("larguraChapaTeto_mm", Number(v))}
              options={[
                { value: 1200, label: "1.200 mm" },
                { value: 1500, label: "1.500 mm" },
                { value: 2000, label: "2.000 mm" },
                { value: 2440, label: "2.440 mm" },
              ]}
            />
            <SelectField
              label="Comprimento — Teto"
              value={p.comprimentoChapaTeto_mm ?? p.comprimentoChapa_mm}
              onChange={(v) => setParam("comprimentoChapaTeto_mm", Number(v))}
              options={[
                { value: 6000, label: "6.000 mm" },
                { value: 12000, label: "12.000 mm" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 rounded-md border border-carbono-200 bg-creme p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
            Sobrespessura de corrosão (CA) opcional
          </h4>
          <p className="mb-3 text-xs text-carbono-600">
            Por padrão, CA é aplicada apenas no costado (em contato direto com
            o produto). Marque abaixo para aplicar também no fundo e/ou no teto.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.aplicarCAFundo ?? false}
                  onChange={(e) =>
                    setParam("aplicarCAFundo", e.target.checked)
                  }
                  className="h-4 w-4 accent-verde"
                />
                <span>Aplicar CA no fundo</span>
              </label>
              {p.aplicarCAFundo && (
                <NumberField
                  label="CA do fundo"
                  unit="mm"
                  value={p.CA_fundo_mm ?? p.CA_mm}
                  onChange={(v) => setParam("CA_fundo_mm", v)}
                  step={0.5}
                  min={0}
                  max={6}
                />
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.aplicarCATeto ?? false}
                  onChange={(e) => setParam("aplicarCATeto", e.target.checked)}
                  className="h-4 w-4 accent-verde"
                />
                <span>Aplicar CA no teto</span>
              </label>
              {p.aplicarCATeto && (
                <NumberField
                  label="CA do teto"
                  unit="mm"
                  value={p.CA_teto_mm ?? p.CA_mm}
                  onChange={(v) => setParam("CA_teto_mm", v)}
                  step={0.5}
                  min={0}
                  max={6}
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Bloco 2 — Fundo"
        subtitle={`Regra NTN: D ≥ 12 m → anel anular; D < 12 m → cônico para periferia (default). D atual: ${projeto.geometria.D_m.toFixed(2)} m.`}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            label="Tipo de fundo"
            value={fundo.tipo}
            onChange={(v) => setFundo("tipo", v as TipoFundoUI)}
            options={[
              { value: "plano-com-anel-anular", label: "Plano com anel anular" },
              { value: "conico-centro", label: "Cônico para centro" },
              { value: "conico-periferia", label: "Cônico para periferia" },
            ]}
            norma="API 650 5.4 / NBR 7821 5.5"
          />
          {fundo.tipo === "plano-com-anel-anular" && (
            <NumberField
              label="Largura do anel anular"
              unit="mm"
              value={fundo.larguraAnelAnular_mm ?? 700}
              onChange={(v) => setFundo("larguraAnelAnular_mm", v)}
              step={50}
              min={500}
              max={2000}
              hint="Default NTN: 700 mm. API 650 mínimo prático: 600 mm."
            />
          )}
        </div>
        <div className="mt-3 text-xs text-carbono-500">
          <Badge cor="info">Fundo</Badge> Espessura nominal: 6 mm + CA. Cálculo
          completo aparece no comparativo.
        </div>
      </Card>

      <Card
        title="Bloco 2b — Fundo duplo (opcional)"
        subtitle="Segundo fundo interno instalado acima do fundo externo. Dimensionado igual ao fundo principal."
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={projeto.fundoDuplo?.ativo ?? false}
            onChange={(e) => setFundoDuplo("ativo", e.target.checked)}
            className="h-4 w-4 accent-verde"
          />
          <span className="font-medium">Incluir fundo duplo</span>
        </label>
        {(projeto.fundoDuplo?.ativo ?? false) && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <SelectField
                label="Largura — Fundo duplo"
                value={projeto.fundoDuplo?.larguraChapa_mm ?? (p.larguraChapaFundo_mm ?? p.larguraChapa_mm)}
                onChange={(v) => setFundoDuplo("larguraChapa_mm", Number(v))}
                options={[
                  { value: 1200, label: "1.200 mm" },
                  { value: 1500, label: "1.500 mm" },
                  { value: 2000, label: "2.000 mm" },
                  { value: 2440, label: "2.440 mm" },
                ]}
              />
              <SelectField
                label="Comprimento — Fundo duplo"
                value={projeto.fundoDuplo?.comprimentoChapa_mm ?? (p.comprimentoChapaFundo_mm ?? p.comprimentoChapa_mm)}
                onChange={(v) => setFundoDuplo("comprimentoChapa_mm", Number(v))}
                options={[
                  { value: 6000, label: "6.000 mm" },
                  { value: 12000, label: "12.000 mm" },
                ]}
              />
              <NumberField
                label="CA — Fundo duplo"
                unit="mm"
                value={projeto.fundoDuplo?.CA_mm ?? (p.CA_fundo_mm ?? p.CA_mm)}
                onChange={(v) => setFundoDuplo("CA_mm", v)}
                step={0.5}
                min={0}
                max={6}
                hint="CA aplicada no fundo duplo. Default = CA do fundo externo."
              />
            </div>
            <div className="rounded-md border border-verde-200 bg-verde-50 p-2 text-xs text-carbono-700">
              <strong>Fundo duplo:</strong> espessura calculada igual ao fundo externo. A área utilizada
              é a mesma do fundo. Quantitativo de chapas calculado na aba <em>Materiais</em>.
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Bloco 3 — Teto"
        subtitle="Tipo construtivo do teto. Cônico autoportante é o mais comum em tanques pequenos a médios."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="Tipo de teto"
            value={teto.tipo}
            onChange={(v) => setTeto("tipo", v as TipoTetoUI)}
            options={[
              {
                value: "conico-autoportante",
                label: "Cônico autoportante",
              },
              {
                value: "conico-suportado",
                label: "Cônico suportado (com vigas)",
              },
              {
                value: "dome-autoportante",
                label: "Dome autoportante",
              },
            ]}
            norma="API 650 5.10"
          />
          {(teto.tipo === "conico-autoportante" ||
            teto.tipo === "conico-suportado") && (
            <NumberField
              label="Ângulo do cone"
              unit="graus"
              value={teto.anguloCone_graus ?? 15}
              onChange={(v) => setTeto("anguloCone_graus", v)}
              step={0.5}
              min={
                teto.tipo === "conico-autoportante" ? 9.5 : 4.76
              }
              max={30}
              hint={
                teto.tipo === "conico-autoportante"
                  ? "Faixa autoportante: 9,5° a 30°. Default 15°."
                  : "Faixa suportado: 4,76° a 30°. Default 9,5°."
              }
            />
          )}
          {teto.tipo === "dome-autoportante" && (
            <NumberField
              label="Raio do dome"
              unit="m"
              value={teto.R_dome_m ?? projeto.geometria.D_m}
              onChange={(v) => setTeto("R_dome_m", v)}
              step={0.5}
              min={projeto.geometria.D_m * 0.8}
              max={projeto.geometria.D_m * 1.2}
              hint={`Faixa válida: ${(projeto.geometria.D_m * 0.8).toFixed(2)} a ${(projeto.geometria.D_m * 1.2).toFixed(2)} m. Default: R = D.`}
            />
          )}
          {teto.tipo === "conico-suportado" && (
            <NumberField
              label="Peso da estrutura"
              unit="kg/m²"
              value={teto.pesoEstruturaPorM2_kg ?? 30}
              onChange={(v) => setTeto("pesoEstruturaPorM2_kg", v)}
              step={5}
              min={10}
              max={120}
              hint="Vigas radiais + anel central + colunas. Default 30 kg/m²."
            />
          )}
        </div>
        <div className="mt-3 text-xs text-carbono-500">
          <Badge cor="info">Teto</Badge>{" "}
          {teto.tipo === "conico-autoportante" &&
            "Espessura calculada por t = D / (4,8 · sin θ)."}
          {teto.tipo === "conico-suportado" &&
            "Espessura mínima 5 + CA na chapa; massa adicional vem da estrutura."}
          {teto.tipo === "dome-autoportante" &&
            "Espessura calculada por t = R_dome / 1,776 (forma reduzida API 650 5.10.6 atmosférico)."}
        </div>
      </Card>

      <Card title="Bloco 4 — Selo flutuante (opcional)" subtitle="Vedação flutuante interna que reduz emissões de vapores.">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={projeto.seloFlutuante ?? false}
            onChange={(e) =>
              atualizar((proj) => ({ ...proj, seloFlutuante: e.target.checked }))
            }
            className="h-4 w-4 accent-verde"
          />
          <span className="font-medium">Tanque com selo flutuante interno</span>
        </label>
        <p className="mt-2 text-xs text-carbono-600">
          O selo flutuante reduz a emissão de vapores ao manter o produto sempre
          em contato com a vedação. Quando ativo, o VPV (ventilador de pressão e
          vácuo) não se aplica.
        </p>
        {(projeto.seloFlutuante ?? false) && (
          <div className="mt-2 rounded-md border border-verde-200 bg-verde-50 p-3 text-xs text-carbono-700">
            <strong>Com selo flutuante:</strong> VPV suprimido. Prever{" "}
            <strong>4 ventilações 400 × 1.300 mm</strong> no costado (nível
            superior) para alívio de pressão e vácuo conforme API 650 Apêndice H.
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}`}>
          <Button variant="ghost">← Geometria</Button>
        </Link>
        <Link href={`/projeto/${projeto.id}/bocais`}>
          <Button>Bocais →</Button>
        </Link>
      </div>
    </div>
  );
}
