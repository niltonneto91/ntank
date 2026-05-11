"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { calcularListaMateriais } from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { useProjeto } from "@/lib/useProjeto";
import { compararTanqueCompleto } from "@/lib/calculo";
import { kg, mm, num } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjetoMateriaisPage({ params }: PageProps) {
  const { id } = use(params);
  const { estado } = useProjeto(id);

  const dados = useMemo(() => {
    if (estado.status !== "ok") return null;
    try {
      const comp = compararTanqueCompleto(estado.projeto);
      const variante =
        comp.variantes.find(
          (v) => v.metodo === estado.projeto.variantePreferida,
        ) ?? comp.recomendada;
      const p = estado.projeto.parametros;
      const fd = estado.projeto.fundoDuplo;
      const lista = calcularListaMateriais({
        resultado: variante.resultado,
        larguraChapaFundo_mm:     p.larguraChapaFundo_mm,
        comprimentoChapaFundo_mm: p.comprimentoChapaFundo_mm,
        larguraChapaTeto_mm:      p.larguraChapaTeto_mm,
        comprimentoChapaTeto_mm:  p.comprimentoChapaTeto_mm,
        fundoDuploAtivo:             fd?.ativo ?? false,
        larguraChapaFundoDuplo_mm:   fd?.larguraChapa_mm,
        comprimentoChapaFundoDuplo_mm: fd?.comprimentoChapa_mm,
        CA_fundoDuplo_mm:            fd?.CA_mm,
      });
      return { variante, lista };
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

  if (!dados || "erro" in dados)
    return (
      <div className="space-y-5">
        <ProjetoHeader projeto={projeto} />
        <Stepper projetoId={projeto.id} ativa="materiais" />
        <Card>
          <p className="text-sm text-red-700">
            {dados && "erro" in dados ? dados.erro : "Sem cálculo."}
          </p>
        </Card>
      </div>
    );

  const { lista } = dados;

  // Agrupar itens por componente para exibição separada
  const grupos: Record<string, typeof lista.itens[number][]> = {};
  for (const item of lista.itens) {
    if (!grupos[item.componente]) grupos[item.componente] = [];
    grupos[item.componente]!.push(item);
  }

  const corBadge = (comp: string) => {
    if (comp === "Costado") return "carbono";
    if (comp === "Fundo") return "info";
    if (comp === "Fundo Duplo") return "verde";
    return "amarelo"; // Teto
  };

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="materiais" />

      {/* Resumo */}
      <Card title="Resumo — Lista de materiais (chapas)" destaque>
        <dl className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="text-carbono-500">Total de chapas</dt>
            <dd className="font-title text-2xl font-bold tabular">
              {lista.totalChapas} un
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Área total comprada</dt>
            <dd className="font-title text-2xl font-bold tabular">
              {num(lista.totalArea_m2)} m²
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Peso total de chapas</dt>
            <dd className="font-title text-2xl font-bold tabular">
              {kg(lista.totalPeso_kg)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-carbono-500">
          Costado: aproveitamento exato por anel · Fundo e Teto: fator de
          aproveitamento 1,15 (15 % de perda no corte circular).
        </p>
      </Card>

      {/* Tabela detalhada */}
      <Card
        title="Relação de chapas por componente"
        subtitle="Espessuras comerciais em polegadas. Largura × Comprimento em mm."
      >
        {Object.entries(grupos).map(([componente, itens]) => (
          <div key={componente} className="mb-6 last:mb-0">
            <h3 className="mb-2 flex items-center gap-2 font-title text-base font-bold">
              <Badge cor={corBadge(componente)}>{componente}</Badge>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                  <tr>
                    <th className="px-2 py-2">Chapa (pol)</th>
                    <th className="px-2 py-2">Esp. (mm)</th>
                    <th className="px-2 py-2">Largura</th>
                    <th className="px-2 py-2">Comprimento</th>
                    <th className="px-2 py-2">Área unit.</th>
                    <th className="px-2 py-2 text-right">kg/m²</th>
                    <th className="px-2 py-2 text-right">Qtde</th>
                    <th className="px-2 py-2 text-right">Área total</th>
                    <th className="px-2 py-2 text-right">Peso total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-carbono-100 tabular hover:bg-creme"
                    >
                      <td className="px-2 py-2 font-bold">
                        <Badge cor="carbono">{item.polegada}"</Badge>
                      </td>
                      <td className="px-2 py-2">{mm(item.espessura_mm)}</td>
                      <td className="px-2 py-2">{item.largura_mm} mm</td>
                      <td className="px-2 py-2">{item.comprimento_mm} mm</td>
                      <td className="px-2 py-2">{num(item.areaUnitaria_m2, 3)} m²</td>
                      <td className="px-2 py-2 text-right">
                        {num(item.pesoPorM2_kg, 1)}
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-lg">
                        {item.quantidade}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {num(item.areaTotal_m2, 2)} m²
                      </td>
                      <td className="px-2 py-2 text-right font-bold">
                        {kg(item.pesoTotal_kg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-carbono-300 bg-creme font-bold">
                    <td colSpan={6} className="px-2 py-2 text-right text-xs uppercase tracking-wider text-carbono-500">
                      Subtotal {componente}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {itens.reduce((s, i) => s + i.quantidade, 0)} un
                    </td>
                    <td className="px-2 py-2 text-right">
                      {num(itens.reduce((s, i) => s + i.areaTotal_m2, 0), 2)} m²
                    </td>
                    <td className="px-2 py-2 text-right">
                      {kg(itens.reduce((s, i) => s + i.pesoTotal_kg, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* Total geral */}
        <div className="mt-4 rounded-md border border-carbono-300 bg-carbono p-3 text-verde">
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">Total geral — chapas</div>
              <div className="font-title text-xl font-bold tabular">{lista.totalChapas} un</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">Área total</div>
              <div className="font-title text-xl font-bold tabular">{num(lista.totalArea_m2)} m²</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">Peso total de chapas</div>
              <div className="font-title text-xl font-bold tabular">{kg(lista.totalPeso_kg)}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-xs text-carbono-500">
          <strong>Nota:</strong> Esta lista contempla apenas chapas de costado, fundo e teto.
          Não estão incluídos: bocais, chapas de reforço e acessórios (escadas, plataformas, guarda-corpos).
        </p>
      </Card>

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}/detalhes`}>
          <Button variant="ghost">← Detalhes</Button>
        </Link>
        <Link href={`/projeto/${projeto.id}/soldagem`}>
          <Button>Soldagem →</Button>
        </Link>
      </div>
    </div>
  );
}
