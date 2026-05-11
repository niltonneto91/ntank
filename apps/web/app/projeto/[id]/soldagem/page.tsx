"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  calcularSoldagem,
  PROCESSOS_SOLDAGEM,
  type ProcessoSoldagem,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, SelectField } from "@/components/Field";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { useProjeto } from "@/lib/useProjeto";
import { compararTanqueCompleto } from "@/lib/calculo";
import { kg, num } from "@/lib/format";
import { SOLDAGEM_DEFAULT } from "@/lib/projeto";
import type { SoldagemProjeto } from "@/lib/projeto";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PROCESSO_OPTIONS = Object.entries(PROCESSOS_SOLDAGEM).map(
  ([value, { nome }]) => ({ value, label: nome }),
);

function corJunta(tipo: string) {
  if (tipo === "topo-meio-v") return "verde";
  if (tipo === "topo-reto") return "info";
  return "carbono";
}

function labelJunta(tipo: string) {
  if (tipo === "topo-meio-v") return "Topo Meio-V 37°";
  if (tipo === "topo-reto") return "Topo reto (chanfro reto)";
  return "Filete";
}

export default function ProjetoSoldagemPage({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useProjeto(id);

  const dados = useMemo(() => {
    if (estado.status !== "ok") return null;
    try {
      const comp = compararTanqueCompleto(estado.projeto);
      const variante =
        comp.variantes.find(
          (v) => v.metodo === estado.projeto.variantePreferida,
        ) ?? comp.recomendada;
      const p = estado.projeto.parametros;
      const s = estado.projeto.soldagem ?? SOLDAGEM_DEFAULT;
      const resultado = calcularSoldagem({
        resultado: variante.resultado,
        larguraChapaFundo_mm:     p.larguraChapaFundo_mm,
        comprimentoChapaFundo_mm: p.comprimentoChapaFundo_mm,
        larguraChapaTeto_mm:      p.larguraChapaTeto_mm,
        comprimentoChapaTeto_mm:  p.comprimentoChapaTeto_mm,
        processos: {
          costado:    s.processoCostado,
          fundo:      s.processoFundo,
          teto:       s.processoTeto,
          acessorios: s.processoAcessorios,
        },
      });
      return { variante, resultado, s };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [estado]);

  if (estado.status === "carregando")
    return <p className="text-sm text-carbono-500">Carregando…</p>;
  if (estado.status !== "ok")
    return (
      <Card>
        <p className="text-sm text-red-700">
          {estado.status === "ausente"
            ? "Projeto não encontrado."
            : estado.mensagem}
        </p>
      </Card>
    );

  const { projeto } = estado;
  const s = projeto.soldagem ?? SOLDAGEM_DEFAULT;

  function setSoldagem<K extends keyof SoldagemProjeto>(
    chave: K,
    valor: SoldagemProjeto[K],
  ) {
    atualizar((proj) => ({
      ...proj,
      soldagem: { ...(proj.soldagem ?? SOLDAGEM_DEFAULT), [chave]: valor },
    }));
  }

  if (!dados || "erro" in dados)
    return (
      <div className="space-y-5">
        <ProjetoHeader projeto={projeto} />
        <Stepper projetoId={projeto.id} ativa="soldagem" />
        <Card>
          <p className="text-sm text-red-700">
            {dados && "erro" in dados ? dados.erro : "Sem cálculo."}
          </p>
        </Card>
      </div>
    );

  const { resultado } = dados;

  // Custo por componente (consumíveis)
  function custoConsumivelComponente(
    comp: (typeof resultado.componentes)[number],
  ): number {
    const proc = comp.processo;
    const cons = comp.consumivel;
    if (proc === "SMAW") {
      return cons.material_kg * s.custoEletrodo_R$_kg;
    }
    return (
      cons.material_kg * s.custoArame_R$_kg +
      cons.gas_m3 * s.custoGasProtecao_R$_m3
    );
  }

  const totalCustoConsumivel = resultado.componentes.reduce(
    (acc, c) => acc + custoConsumivelComponente(c),
    0,
  );
  const custoDiscos = resultado.discos_un * s.custoDisco_R$_un;
  const custoO2 = resultado.oxigenio_kg * s.custoOxigenio_R$_kg;
  const custoAcetileno = resultado.acetileno_m3 * s.custoAcetileno_R$_m3;
  const totalCustoCorte = custoDiscos + custoO2 + custoAcetileno;
  const totalCustoSoldagem = totalCustoConsumivel + totalCustoCorte;

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="soldagem" />

      {/* Configuração de processos */}
      <Card
        title="Processos de soldagem por componente"
        subtitle="Define o processo para cada componente — afeta o consumo de consumíveis."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField
            label="Processo — Costado"
            value={s.processoCostado}
            onChange={(v) => setSoldagem("processoCostado", v as ProcessoSoldagem)}
            options={PROCESSO_OPTIONS}
          />
          <SelectField
            label="Processo — Fundo"
            value={s.processoFundo}
            onChange={(v) => setSoldagem("processoFundo", v as ProcessoSoldagem)}
            options={PROCESSO_OPTIONS}
          />
          <SelectField
            label="Processo — Teto"
            value={s.processoTeto}
            onChange={(v) => setSoldagem("processoTeto", v as ProcessoSoldagem)}
            options={PROCESSO_OPTIONS}
          />
          <SelectField
            label="Processo — Acessórios"
            value={s.processoAcessorios}
            onChange={(v) =>
              setSoldagem("processoAcessorios", v as ProcessoSoldagem)
            }
            options={PROCESSO_OPTIONS}
          />
        </div>
      </Card>

      {/* Juntas por componente */}
      {resultado.componentes.map((comp) => (
        <Card
          key={comp.componente}
          title={`${comp.componente} — ${PROCESSOS_SOLDAGEM[comp.processo].nome}`}
          subtitle={`${comp.juntas.length} junta(s) · ${num(comp.totalComprimento_m, 1)} m de solda · ${num(comp.totalPesoMetal_kg, 2)} kg metal`}
        >
          {comp.juntas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                  <tr>
                    <th className="px-2 py-2">Descrição</th>
                    <th className="px-2 py-2">Tipo de junta</th>
                    <th className="px-2 py-2">Esp. (mm)</th>
                    <th className="px-2 py-2 text-right">Comp. (m)</th>
                    <th className="px-2 py-2 text-right">A seção (mm²)</th>
                    <th className="px-2 py-2 text-right">Metal (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {comp.juntas.map((j, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-carbono-100 tabular hover:bg-creme"
                    >
                      <td className="px-2 py-2 text-xs">{j.descricao}</td>
                      <td className="px-2 py-2">
                        <Badge cor={corJunta(j.tipoJunta) as "verde" | "info" | "carbono"}>
                          {labelJunta(j.tipoJunta)}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">{num(j.espessura_mm, 1)}</td>
                      <td className="px-2 py-2 text-right">{num(j.comprimento_m, 2)}</td>
                      <td className="px-2 py-2 text-right">{num(j.areaSeccao_mm2, 2)}</td>
                      <td className="px-2 py-2 text-right font-bold">
                        {num(j.pesoMetal_kg, 3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-carbono-300 bg-creme font-bold">
                    <td colSpan={4} className="px-2 py-2 text-right text-xs uppercase tracking-wider text-carbono-500">
                      Subtotal
                    </td>
                    <td className="px-2 py-2 text-right">
                      {num(comp.totalComprimento_m, 2)} m
                    </td>
                    <td className="px-2 py-2 text-right">
                      {num(comp.totalPesoMetal_kg, 3)} kg
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-xs text-carbono-500">Nenhum acessório — sem soldagem estimada.</p>
          )}

          {/* Consumíveis do componente */}
          <div className="mt-3 rounded-md border border-carbono-200 bg-creme p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
              Consumíveis — {comp.processo}
            </h4>
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <div>
                <span className="text-carbono-500">
                  {comp.processo === "SMAW" ? "Eletrodo revestido" : "Arame (sólido/tubular)"}
                </span>
                <div className="font-bold tabular">
                  {num(comp.consumivel.material_kg, 2)} kg
                </div>
              </div>
              {comp.consumivel.gas_m3 > 0 && (
                <div>
                  <span className="text-carbono-500">Gás de proteção</span>
                  <div className="font-bold tabular">
                    {num(comp.consumivel.gas_m3, 2)} m³
                  </div>
                </div>
              )}
              <div>
                <span className="text-carbono-500">Custo estimado</span>
                <div className="font-bold tabular">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(custoConsumivelComponente(comp))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {/* Custos de consumíveis */}
      <Card
        title="Custo dos consumíveis de soldagem"
        subtitle="Insira os preços unitários para calcular o custo total estimado."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <NumberField
            label="Eletrodo revestido (SMAW)"
            unit="R$/kg"
            value={s.custoEletrodo_R$_kg}
            onChange={(v) => setSoldagem("custoEletrodo_R$_kg", v)}
            step={0.5}
            min={0}
            hint="Eletrodo E7018, E6013 etc."
          />
          <NumberField
            label="Arame (GMAW/FCAW)"
            unit="R$/kg"
            value={s.custoArame_R$_kg}
            onChange={(v) => setSoldagem("custoArame_R$_kg", v)}
            step={0.5}
            min={0}
            hint="Arame sólido ER70S-6 ou tubular E71T-1."
          />
          <NumberField
            label="Gás de proteção"
            unit="R$/m³"
            value={s.custoGasProtecao_R$_m3}
            onChange={(v) => setSoldagem("custoGasProtecao_R$_m3", v)}
            step={0.5}
            min={0}
            hint="CO₂ ou mistura Ar-CO₂."
          />
        </div>
      </Card>

      {/* Corte oxicombustível + discos */}
      <Card
        title="Corte oxicombustível e discos"
        subtitle="Estimativa proporcional ao peso de aço do tanque (base de referência: tanque de 16.119 kg)."
      >
        <div className="grid gap-4 text-sm md:grid-cols-3">
          {/* Discos */}
          <div className="rounded-md border border-carbono-200 bg-creme p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
              Discos de corte e desbaste (4″ e 7″)
            </div>
            <div className="mb-1 text-2xl font-bold tabular text-carbono">
              {resultado.discos_un} un
            </div>
            <div className="mt-3">
              <NumberField
                label="Custo unitário do disco"
                unit="R$/un"
                value={s.custoDisco_R$_un}
                onChange={(v) => setSoldagem("custoDisco_R$_un", v)}
                step={0.5}
                min={0}
                hint="Disco 4½″ ou 7″ (corte + desbaste)."
              />
            </div>
            <div className="mt-2 text-sm font-bold text-carbono">
              Custo:{" "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(custoDiscos)}
            </div>
          </div>

          {/* Oxigênio */}
          <div className="rounded-md border border-carbono-200 bg-creme p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
              Oxigênio (O₂) — oxicorte
            </div>
            <div className="mb-1 text-2xl font-bold tabular text-carbono">
              {num(resultado.oxigenio_kg, 1)} kg
            </div>
            <div className="mt-3">
              <NumberField
                label="Custo O₂"
                unit="R$/kg"
                value={s.custoOxigenio_R$_kg}
                onChange={(v) => setSoldagem("custoOxigenio_R$_kg", v)}
                step={0.5}
                min={0}
              />
            </div>
            <div className="mt-2 text-sm font-bold text-carbono">
              Custo:{" "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(custoO2)}
            </div>
          </div>

          {/* Acetileno */}
          <div className="rounded-md border border-carbono-200 bg-creme p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
              Acetileno (C₂H₂) — oxicorte
            </div>
            <div className="mb-1 text-2xl font-bold tabular text-carbono">
              {num(resultado.acetileno_m3, 1)} m³
            </div>
            <div className="mt-3">
              <NumberField
                label="Custo acetileno"
                unit="R$/m³"
                value={s.custoAcetileno_R$_m3}
                onChange={(v) => setSoldagem("custoAcetileno_R$_m3", v)}
                step={1}
                min={0}
              />
            </div>
            <div className="mt-2 text-sm font-bold text-carbono">
              Custo:{" "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(custoAcetileno)}
            </div>
          </div>
        </div>
      </Card>

      {/* Resumo total */}
      <Card title="Resumo de soldagem" destaque>
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Metal de solda total</dt>
            <dd className="font-bold tabular text-lg">
              {num(resultado.totalPesoMetal_kg, 2)} kg
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Custo consumíveis solda</dt>
            <dd className="font-bold tabular">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalCustoConsumivel)}
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Custo corte (discos + O₂ + C₂H₂)</dt>
            <dd className="font-bold tabular">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalCustoCorte)}
            </dd>
          </div>
          <div className="rounded-md bg-verde p-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-carbono">
              Custo total estimado
            </dt>
            <dd className="font-title text-2xl font-bold tabular text-carbono">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalCustoSoldagem)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-carbono-500">
          ✅ Inclui consumíveis de soldagem (eletrodo/arame + gás) e corte
          (discos + oxigênio + acetileno). Não inclui mão de obra.
        </p>
      </Card>

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}/materiais`}>
          <Button variant="ghost">← Materiais</Button>
        </Link>
        <Link href={`/projeto/${projeto.id}/pintura`}>
          <Button>Pintura →</Button>
        </Link>
      </div>
    </div>
  );
}
