"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { calcularPintura, CONFIG_PINTURA_DEFAULT } from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, SelectField } from "@/components/Field";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { useProjeto } from "@/lib/useProjeto";
import { compararTanqueCompleto } from "@/lib/calculo";
import { num } from "@/lib/format";
import { PINTURA_DEFAULT } from "@/lib/projeto";
import type { PinturaProjeto, DemaoPintura } from "@/lib/projeto";

interface PageProps {
  params: Promise<{ id: string }>;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ProjetoPinturaPage({ params }: PageProps) {
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
      const pin = estado.projeto.pintura ?? PINTURA_DEFAULT;
      const config = {
        plano: pin.plano,
        primer:        pin.primer,
        intermediario: pin.intermediario,
        acabamento:    pin.acabamento,
      };
      const resultado = calcularPintura({
        resultado: variante.resultado,
        config,
      });
      return { variante, resultado, pin };
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
  const pin = projeto.pintura ?? PINTURA_DEFAULT;

  function setPintura<K extends keyof PinturaProjeto>(
    chave: K,
    valor: PinturaProjeto[K],
  ) {
    atualizar((proj) => ({
      ...proj,
      pintura: { ...(proj.pintura ?? PINTURA_DEFAULT), [chave]: valor },
    }));
  }

  function setDemao(
    demao: "primer" | "intermediario" | "acabamento",
    campo: keyof DemaoPintura,
    valor: number,
  ) {
    atualizar((proj) => {
      const base = proj.pintura ?? PINTURA_DEFAULT;
      return {
        ...proj,
        pintura: {
          ...base,
          [demao]: { ...base[demao], [campo]: valor },
        },
      };
    });
  }

  if (!dados || "erro" in dados)
    return (
      <div className="space-y-5">
        <ProjetoHeader projeto={projeto} />
        <Stepper projetoId={projeto.id} ativa="pintura" />
        <Card>
          <p className="text-sm text-red-700">
            {dados && "erro" in dados ? dados.erro : "Sem cálculo."}
          </p>
        </Card>
      </div>
    );

  const { resultado } = dados;

  const demaosVisiveis =
    pin.plano === "3-demaos"
      ? (["primer", "intermediario", "acabamento"] as const)
      : (["primer", "acabamento"] as const);

  const nomeDemao = {
    primer: "Primer Epóxi",
    intermediario: "Intermediário",
    acabamento: "Acabamento",
  } as const;

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="pintura" />

      {/* Áreas pintáveis */}
      <Card title="Áreas a pintar" subtitle="Costado externo + teto externo + acessórios. Fundo excluído (apoio na fundação).">
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Costado externo</dt>
            <dd className="font-bold tabular">{num(resultado.areaCostado_m2)} m²</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Teto externo</dt>
            <dd className="font-bold tabular">{num(resultado.areaTeto_m2)} m²</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Acessórios (estim.)</dt>
            <dd className="font-bold tabular">{num(resultado.areaAcessorios_m2)} m²</dd>
            <dd className="text-xs text-carbono-500">20% de (Costado + Teto)</dd>
          </div>
          <div className="rounded-md bg-verde-50 border border-verde-200 p-2">
            <dt className="text-carbono-500">Área total pintável</dt>
            <dd className="font-title text-2xl font-bold tabular">
              {num(resultado.areaTotalPintavel_m2)} m²
            </dd>
          </div>
        </dl>
      </Card>

      {/* Plano de pintura */}
      <Card
        title="Plano de pintura"
        subtitle="Defina o número de demãos e os parâmetros de cada camada."
      >
        <div className="mb-4 w-48">
          <SelectField
            label="Número de demãos"
            value={pin.plano}
            onChange={(v) =>
              setPintura("plano", v as "2-demaos" | "3-demaos")
            }
            options={[
              { value: "2-demaos", label: "2 demãos (Primer + Acabamento)" },
              { value: "3-demaos", label: "3 demãos (Primer + Interm. + Acabamento)" },
            ]}
          />
        </div>

        <div className="space-y-4">
          {demaosVisiveis.map((chave, idx) => {
            const demao = pin[chave];
            const res = resultado.demaos[idx];
            return (
              <div
                key={chave}
                className="rounded-md border border-carbono-200 bg-creme p-3"
              >
                <h4 className="mb-3 text-sm font-bold">
                  Demão {idx + 1}: {nomeDemao[chave]}
                </h4>
                <div className="grid gap-3 md:grid-cols-4">
                  <NumberField
                    label="Espessura seca"
                    unit="µm"
                    value={demao.espessura_um}
                    onChange={(v) => setDemao(chave, "espessura_um", v)}
                    step={5}
                    min={10}
                    max={500}
                    hint={`Padrão NTN: ${CONFIG_PINTURA_DEFAULT[chave].espessura_um} µm`}
                  />
                  <NumberField
                    label="Rendimento"
                    unit="m²/L"
                    value={demao.rendimento_m2_L}
                    onChange={(v) => setDemao(chave, "rendimento_m2_L", v)}
                    step={0.5}
                    min={0.5}
                    hint={`Padrão NTN: ${CONFIG_PINTURA_DEFAULT[chave].rendimento_m2_L} m²/L`}
                  />
                  <NumberField
                    label="Custo da tinta"
                    unit="R$/L"
                    value={demao.custo_R$_L}
                    onChange={(v) => setDemao(chave, "custo_R$_L", v)}
                    step={1}
                    min={0}
                    hint="Deixe 0 para não calcular custo."
                  />
                  <div className="flex flex-col justify-end gap-1">
                    {res && (
                      <>
                        <div>
                          <span className="text-xs text-carbono-500">Volume necessário</span>
                          <div className="font-bold tabular">
                            {num(res.volume_L, 1)} L
                          </div>
                        </div>
                        {res.custo_R$ > 0 && (
                          <div>
                            <span className="text-xs text-carbono-500">Custo</span>
                            <div className="font-bold tabular">{brl(res.custo_R$)}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Resumo total */}
      <Card title="Resumo de pintura" destaque>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
              <tr>
                <th className="px-2 py-2">Demão</th>
                <th className="px-2 py-2 text-right">Esp. (µm)</th>
                <th className="px-2 py-2 text-right">Rendimento</th>
                <th className="px-2 py-2 text-right">Volume (L)</th>
                <th className="px-2 py-2 text-right">Custo unitário</th>
                <th className="px-2 py-2 text-right">Custo total</th>
              </tr>
            </thead>
            <tbody>
              {resultado.demaos.map((d) => (
                <tr
                  key={d.nome}
                  className="border-b border-carbono-100 tabular hover:bg-creme"
                >
                  <td className="px-2 py-2 font-bold">{d.nome}</td>
                  <td className="px-2 py-2 text-right">{d.espessura_um}</td>
                  <td className="px-2 py-2 text-right">{d.rendimento_m2_L} m²/L</td>
                  <td className="px-2 py-2 text-right font-bold">{num(d.volume_L, 1)}</td>
                  <td className="px-2 py-2 text-right">
                    {d.custo_R$_L > 0 ? brl(d.custo_R$_L) + "/L" : "—"}
                  </td>
                  <td className="px-2 py-2 text-right font-bold">
                    {d.custo_R$ > 0 ? brl(d.custo_R$) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-carbono-300 bg-creme font-bold">
                <td colSpan={3} className="px-2 py-2 text-right text-xs uppercase tracking-wider text-carbono-500">
                  Total
                </td>
                <td className="px-2 py-2 text-right text-lg">
                  {num(resultado.totalVolume_L, 1)} L
                </td>
                <td className="px-2 py-2" />
                <td className="px-2 py-2 text-right">
                  {resultado.totalCusto_R$ > 0 ? brl(resultado.totalCusto_R$) : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="text-carbono-500">Área pintável total</dt>
            <dd className="font-bold tabular">{num(resultado.areaTotalPintavel_m2)} m²</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Volume total de tinta</dt>
            <dd className="font-title text-2xl font-bold tabular">
              {num(resultado.totalVolume_L, 1)} L
            </dd>
          </div>
          <div className={resultado.totalCusto_R$ > 0 ? "rounded-md bg-verde p-3" : ""}>
            <dt className="text-carbono-500">Custo total da tinta</dt>
            <dd className="font-title text-2xl font-bold tabular">
              {resultado.totalCusto_R$ > 0 ? brl(resultado.totalCusto_R$) : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-carbono-500">
          <Badge cor="info">Nota</Badge> Custo calculado apenas quando o preço
          por litro for informado. Volume calculado pela área pintável ÷ rendimento
          declarado.
        </p>
      </Card>

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}/soldagem`}>
          <Button variant="ghost">← Soldagem</Button>
        </Link>
        <Link href="/">
          <Button>Concluir → Lista de projetos</Button>
        </Link>
      </div>
    </div>
  );
}
