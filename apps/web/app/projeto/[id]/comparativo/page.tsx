"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { useProjeto } from "@/lib/useProjeto";
import { compararTanqueCompleto } from "@/lib/calculo";
import { brl, kg, mm, num, pct } from "@/lib/format";
import { PARAMETROS_DEFAULT } from "@/lib/projeto";
import type { ResultadoCostado } from "@ntank/calc-core";

interface PageProps {
  params: Promise<{ id: string }>;
}

function maiorEspessura(r: ResultadoCostado): number {
  return r.aneis.reduce((m, a) => Math.max(m, a.chapaComercial.espessura), 0);
}

export default function ProjetoComparativoPage({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useProjeto(id);

  const comparativo = useMemo(() => {
    if (estado.status !== "ok") return null;
    try {
      return compararTanqueCompleto(estado.projeto);
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
          {estado.status === "ausente" ? "Projeto não encontrado." : estado.mensagem}
        </p>
      </Card>
    );
  const { projeto } = estado;

  if (comparativo && "erro" in comparativo) {
    return (
      <div className="space-y-5">
        <ProjetoHeader projeto={projeto} />
        <Stepper projetoId={projeto.id} ativa="comparativo" />
        <Card>
          <p className="text-sm text-red-700">
            Não foi possível calcular: {comparativo.erro}
          </p>
          <Link
            href={`/projeto/${projeto.id}/parametros`}
            className="mt-2 inline-block"
          >
            <Button variant="ghost">← Revisar parâmetros</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!comparativo) return null;

  const recomendadaMetodo = comparativo.recomendada.metodo;
  const custoMDO = projeto.parametros.custoMaoDeObraPorKg_R$ ?? PARAMETROS_DEFAULT.custoMaoDeObraPorKg_R$;
  const piorCusto = Math.max(
    ...comparativo.variantes.map((v) => v.resultado.custo_R$ + v.resultado.pesoTotal_kg * custoMDO),
  );

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="comparativo" />

      <Card>
        <p className="text-sm text-carbono-600">
          Executamos os <strong>3 métodos aplicáveis</strong> em paralelo
          (costado + fundo + teto). A variante destacada em verde é a
          recomendada — critério: <em>menor custo total de aço</em>.
        </p>
        {(() => {
          const vdp = comparativo.variantes.find((v) => v.metodo === "API 650 VDP");
          const oneFoot = comparativo.variantes.find((v) => v.metodo === "API 650 1-Foot");
          const iguais = vdp && oneFoot &&
            Math.abs(vdp.resultado.pesoTotal_kg - oneFoot.resultado.pesoTotal_kg) < 0.5;
          if (!iguais) return null;
          return (
            <p className="mt-2 text-xs text-carbono-500">
              ℹ️ <strong>VDP = 1-Foot:</strong> resultado esperado quando o costado é
              governado pela espessura mínima ou todos os anéis têm espessura uniforme
              (comum em tanques pequenos com produto leve). O VDP traz benefício em
              tanques maiores onde os anéis superiores são mais finos que os inferiores.
            </p>
          );
        })()}
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {comparativo.variantes.map((v) => {
          const r = v.resultado;
          const recomendada = v.metodo === recomendadaMetodo;
          const escolhida = projeto.variantePreferida === v.metodo;
          return (
            <Card
              key={v.metodo}
              destaque={recomendada}
              className="flex flex-col gap-3"
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-title text-base font-bold">{v.metodo}</h3>
                  <p className="text-xs text-carbono-500">
                    {r.costado.numeroAneis} anéis ·{" "}
                    {num(r.costado.chapasPorAnel, 2)} chapas/anel
                  </p>
                </div>
                {recomendada && (
                  <Badge cor="verde">★ Melhor custo-benefício</Badge>
                )}
              </header>

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-carbono-500">Massa total</dt>
                  <dd className="font-bold tabular">{kg(r.pesoTotal_kg)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-carbono-500">Custo aço</dt>
                  <dd className="tabular">{brl(r.custo_R$)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-carbono-500">Custo mão de obra</dt>
                  <dd className="tabular">{brl(r.pesoTotal_kg * custoMDO)}</dd>
                </div>
                <div className="flex justify-between border-t border-carbono-200 pt-1">
                  <dt className="font-bold">Custo total estimado</dt>
                  <dd className="font-bold tabular">{brl(r.custo_R$ + r.pesoTotal_kg * custoMDO)}</dd>
                </div>
              </dl>

              <div className="rounded-md bg-creme p-2 text-xs">
                <div className="mb-1 font-semibold uppercase tracking-wider text-carbono-500">
                  Composição (kg)
                </div>
                <dl className="grid grid-cols-5 gap-1 tabular">
                  <div>
                    <dt className="text-carbono-400">Costado</dt>
                    <dd className="font-bold">{num(r.costado.pesoTotal_kg, 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-carbono-400">Fundo</dt>
                    <dd className="font-bold">{num(r.fundo.pesoTotal_kg, 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-carbono-400">Teto</dt>
                    <dd className="font-bold">{num(r.teto.pesoTotal_kg, 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-carbono-400">
                      Bocais ({r.bocais.length})
                    </dt>
                    <dd className="font-bold">{num(r.pesoBocais_kg, 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-carbono-400">Acess.</dt>
                    <dd className="font-bold">{num(r.pesoAcessorios_kg, 0)}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md bg-creme p-2 text-xs">
                <div className="mb-1 font-semibold uppercase tracking-wider text-carbono-500">
                  Espessuras costado (base → topo, mm)
                </div>
                <div className="flex flex-wrap gap-1 tabular">
                  {r.costado.aneis.map((a) => (
                    <span
                      key={a.indice}
                      className="rounded bg-white px-2 py-0.5 font-mono"
                      title={`Anel ${a.indice}: ${a.chapaComercial.polegada}" — calc ${num(a.e_calc_mm, 2)} mm`}
                    >
                      {a.chapaComercial.espessura}
                    </span>
                  ))}
                  <span className="text-carbono-400">|</span>
                  <span
                    className="rounded bg-white px-2 py-0.5 font-mono"
                    title={`Espessura máx. costado: ${mm(maiorEspessura(r.costado))}`}
                  >
                    máx {maiorEspessura(r.costado)}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant={escolhida ? "secondary" : "ghost"}
                onClick={() => atualizar({ variantePreferida: v.metodo })}
              >
                {escolhida ? "✓ Variante escolhida" : "Escolher esta variante"}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card title="Resumo da recomendação">
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Método</dt>
            <dd className="font-title text-lg font-bold">
              {recomendadaMetodo}
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Massa total de aço</dt>
            <dd className="font-title text-lg font-bold tabular">
              {kg(comparativo.recomendada.resultado.pesoTotal_kg)}
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Custo aço + montagem</dt>
            <dd className="font-title text-lg font-bold tabular">
              {brl(comparativo.recomendada.resultado.custo_R$ + comparativo.recomendada.resultado.pesoTotal_kg * custoMDO)}
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Base: aço / MO</dt>
            <dd className="text-xs text-carbono-500 tabular mt-1">
              {brl(projeto.parametros.custoAcoPorKg_R$)}/kg · {brl(custoMDO)}/kg
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-carbono-500">
          Diferença para a variante mais cara:{" "}
          {pct(
            ((piorCusto - (comparativo.recomendada.resultado.custo_R$ + comparativo.recomendada.resultado.pesoTotal_kg * custoMDO)) /
              (comparativo.recomendada.resultado.custo_R$ + comparativo.recomendada.resultado.pesoTotal_kg * custoMDO)) *
              100,
          )}
        </p>
      </Card>

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}/acessorios`}>
          <Button variant="ghost">← Acessórios</Button>
        </Link>
        <Link href={`/projeto/${projeto.id}/detalhes`}>
          <Button>Ver detalhes →</Button>
        </Link>
      </div>
    </div>
  );
}
