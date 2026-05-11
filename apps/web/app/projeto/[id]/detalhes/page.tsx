"use client";

import { Fragment, use, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { MemoriaCalculo } from "@/components/MemoriaCalculo";
import { useProjeto } from "@/lib/useProjeto";
import { compararTanqueCompleto } from "@/lib/calculo";
import { brl, kg, mm, num } from "@/lib/format";
import { PARAMETROS_DEFAULT } from "@/lib/projeto";
import type { ResultadoBocal, ResultadoTanqueCompleto } from "@ntank/calc-core";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjetoDetalhesPage({ params }: PageProps) {
  const { id } = use(params);
  const { estado } = useProjeto(id);
  const [anelExpandido, setAnelExpandido] = useState<number | null>(1);
  const [bocalExpandido, setBocalExpandido] = useState<string | null>(null);

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
  if (!comparativo || "erro" in comparativo)
    return (
      <div className="space-y-5">
        <ProjetoHeader projeto={projeto} />
        <Stepper projetoId={projeto.id} ativa="detalhes" />
        <Card>
          <p className="text-sm text-red-700">
            {comparativo && "erro" in comparativo
              ? comparativo.erro
              : "Sem cálculo."}
          </p>
        </Card>
      </div>
    );

  const variante =
    comparativo.variantes.find((v) => v.metodo === projeto.variantePreferida) ??
    comparativo.recomendada;
  const t: ResultadoTanqueCompleto = variante.resultado;
  const r = t.costado;

  async function baixarPDF() {
    // Lazy import — evita carregar @react-pdf/renderer no bundle inicial.
    const [{ pdf }, { MemoriaPDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/pdf/MemoriaPDF"),
    ]);
    const logoUrl = `${window.location.origin}/ntank-logo.png`;
    const blob = await pdf(
      <MemoriaPDF
        projeto={projeto}
        resultado={t}
        variante={variante.metodo}
        logoUrl={logoUrl}
        responsavel={projeto.responsavelTecnico}
      />,
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ntank-memoria-${projeto.nome.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="detalhes" />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-title text-lg font-bold">
              Variante: {variante.metodo}
            </h2>
            <p className="text-xs text-carbono-500">
              {projeto.variantePreferida
                ? "Escolhida manualmente."
                : "Recomendada pelo critério de menor custo total."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge cor="verde">{kg(t.pesoTotal_kg)}</Badge>
            <Badge cor="carbono">{brl(t.custo_R$)}</Badge>
            <Badge cor="carbono">{r.numeroAneis} anéis</Badge>
            <Button size="sm" variant="secondary" onClick={baixarPDF}>
              ↓ Baixar memória (PDF)
            </Button>
          </div>
        </div>
      </Card>

      {/* ============== COSTADO ============== */}
      <Card title="Costado — anéis" subtitle="Clique em um anel para ver a memória de cálculo.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
              <tr>
                <th className="px-2 py-2">Anel</th>
                <th className="px-2 py-2">Altura</th>
                <th className="px-2 py-2">H efetiva</th>
                <th className="px-2 py-2">e calculada</th>
                <th className="px-2 py-2">Chapa</th>
                <th className="px-2 py-2">e adotada</th>
                <th className="px-2 py-2">Peso</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {r.aneis.map((a) => {
                const aberto = anelExpandido === a.indice;
                return (
                  <Fragment key={a.indice}>
                    <tr
                      onClick={() => setAnelExpandido(aberto ? null : a.indice)}
                      className={[
                        "cursor-pointer border-b border-carbono-100 transition tabular",
                        aberto ? "bg-verde-50" : "hover:bg-creme",
                      ].join(" ")}
                    >
                      <td className="px-2 py-2 font-bold">#{a.indice}</td>
                      <td className="px-2 py-2">{mm(a.altura_mm, 0)}</td>
                      <td className="px-2 py-2">
                        {num(a.H_efetiva_m, 2)} m
                      </td>
                      <td className="px-2 py-2">{mm(a.e_calc_mm)}</td>
                      <td className="px-2 py-2">
                        <Badge cor="carbono">{a.chapaComercial.polegada}"</Badge>
                      </td>
                      <td className="px-2 py-2 font-bold">
                        {mm(a.chapaComercial.espessura)}
                      </td>
                      <td className="px-2 py-2">{kg(a.peso_kg)}</td>
                      <td className="px-2 py-2 text-xs text-carbono-500">
                        {aberto ? "▲" : "▼"}
                      </td>
                    </tr>
                    {aberto && (
                      <tr className="border-b border-carbono-100 bg-verde-50">
                        <td colSpan={8} className="px-2 py-3">
                          <MemoriaCalculo memoria={a.memoriaCalculo} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-carbono-500">
          Subtotal costado:{" "}
          <strong className="tabular">{kg(r.pesoTotal_kg)}</strong>
        </div>
      </Card>

      {/* ============== FUNDO ============== */}
      <Card
        title={`Fundo — ${rotuloFundo(t.fundo.tipo)}`}
        subtitle="Espessura mínima nominal + sobrespessura de corrosão."
      >
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Espessura calc.</dt>
            <dd className="font-bold tabular">{mm(t.fundo.e_calc_mm)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Espessura adotada</dt>
            <dd className="font-bold tabular">
              {mm(t.fundo.e_adotada_mm)}{" "}
              <Badge cor="carbono">{t.fundo.chapaComercial.polegada}"</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Área projetada</dt>
            <dd className="font-bold tabular">{num(t.fundo.area_m2)} m²</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Massa corpo</dt>
            <dd className="font-bold tabular">{kg(t.fundo.peso_corpo_kg)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <MemoriaCalculo memoria={t.fundo.memoriaCalculo} />
        </div>

        {t.fundo.anelAnular && (
          <div className="mt-4 rounded-md border border-verde-200 bg-verde-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Badge cor="verde">Anel anular aplicado</Badge>
              <span className="text-xs text-carbono-500">
                Largura: {t.fundo.anelAnular.largura_mm} mm · Espessura:{" "}
                <strong>{mm(t.fundo.anelAnular.espessura_mm)}</strong> · Massa:{" "}
                <strong>{kg(t.fundo.anelAnular.peso_kg)}</strong>
              </span>
            </div>
            <MemoriaCalculo memoria={t.fundo.anelAnular.memoriaCalculo} />
          </div>
        )}

        <div className="mt-3 text-xs text-carbono-500">
          Subtotal fundo:{" "}
          <strong className="tabular">{kg(t.fundo.pesoTotal_kg)}</strong>
        </div>
      </Card>

      {/* ============== FUNDO DUPLO ============== */}
      {projeto.fundoDuplo?.ativo && (() => {
        const fd = projeto.fundoDuplo!;
        const p = projeto.parametros;
        const largFD  = fd.larguraChapa_mm    ?? p.larguraChapaFundo_mm    ?? p.larguraChapa_mm;
        const comprFD = fd.comprimentoChapa_mm ?? p.comprimentoChapaFundo_mm ?? p.comprimentoChapa_mm;
        const areaUn  = (largFD / 1_000) * (comprFD / 1_000);
        const qtde    = Math.ceil((t.fundo.area_m2 / areaUn) * 1.15);
        const pesoFD  = t.fundo.chapaComercial.pesoPorM2 * areaUn * qtde;
        return (
          <Card
            title="Fundo Duplo (segundo fundo interno)"
            subtitle="Mesma espessura do fundo externo. Dimensões de chapa e CA configuráveis."
          >
            <dl className="grid gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-carbono-500">Espessura adotada</dt>
                <dd className="font-bold tabular">
                  {mm(t.fundo.e_adotada_mm)}{" "}
                  <Badge cor="carbono">{t.fundo.chapaComercial.polegada}"</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-carbono-500">Chapa (Larg × Compr)</dt>
                <dd className="font-bold tabular">{largFD} × {comprFD} mm</dd>
              </div>
              <div>
                <dt className="text-carbono-500">CA do fundo duplo</dt>
                <dd className="font-bold tabular">
                  {mm(fd.CA_mm ?? p.CA_fundo_mm ?? p.CA_mm)}
                </dd>
              </div>
              <div>
                <dt className="text-carbono-500">Área projetada</dt>
                <dd className="font-bold tabular">{num(t.fundo.area_m2)} m²</dd>
              </div>
              <div>
                <dt className="text-carbono-500">Qtde estimada de chapas</dt>
                <dd className="font-bold tabular">{qtde} un</dd>
              </div>
              <div>
                <dt className="text-carbono-500">Peso estimado</dt>
                <dd className="font-bold tabular">{kg(pesoFD)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-carbono-500">
              Estimativa: {qtde} chapas × {num(areaUn, 3)} m² × {num(t.fundo.chapaComercial.pesoPorM2, 2)} kgf/m² (fator 1,15 de perda no corte circular).
            </p>
          </Card>
        );
      })()}

      {/* ============== TETO ============== */}
      <Card
        title={`Teto — ${rotuloTeto(t.teto.tipo)}`}
        subtitle="Cálculo segundo API 650 5.10 + estimativa paramétrica de estrutura."
      >
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Espessura calc.</dt>
            <dd className="font-bold tabular">{mm(t.teto.e_calc_mm)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Espessura adotada</dt>
            <dd className="font-bold tabular">
              {mm(t.teto.e_adotada_mm)}{" "}
              <Badge cor="carbono">{t.teto.chapaComercial.polegada}"</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Área superfície</dt>
            <dd className="font-bold tabular">{num(t.teto.area_m2)} m²</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Massa total teto</dt>
            <dd className="font-bold tabular">{kg(t.teto.pesoTotal_kg)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Chapa cobertura</dt>
            <dd className="tabular">{kg(t.teto.peso_chapa_kg)}</dd>
          </div>
          {t.teto.peso_estrutura_kg > 0 && (
            <div>
              <dt className="text-carbono-500">Estrutura</dt>
              <dd className="tabular">{kg(t.teto.peso_estrutura_kg)}</dd>
            </div>
          )}
        </dl>

        {t.teto.detalheEstrutura && (
          <div className="mt-4 rounded-md border border-carbono-200 bg-creme p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
              Detalhamento da estrutura (vigas + anel + colunas + conexões)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-carbono-500">
                  <tr>
                    <th className="px-2 py-1">Item</th>
                    <th className="px-2 py-1">Perfil</th>
                    <th className="px-2 py-1">Qtde</th>
                    <th className="px-2 py-1">Comp. (m)</th>
                    <th className="px-2 py-1">kg/m</th>
                    <th className="px-2 py-1 text-right">Massa (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-carbono-100 tabular">
                    <td className="px-2 py-1 font-bold">Vigas radiais</td>
                    <td className="px-2 py-1">
                      {t.teto.detalheEstrutura.vigas.perfil}
                    </td>
                    <td className="px-2 py-1">
                      {t.teto.detalheEstrutura.vigas.quantidade}
                    </td>
                    <td className="px-2 py-1">
                      {num(t.teto.detalheEstrutura.vigas.comprimento_m, 2)}
                    </td>
                    <td className="px-2 py-1">
                      {num(t.teto.detalheEstrutura.vigas.kg_por_m, 1)}
                    </td>
                    <td className="px-2 py-1 text-right font-bold">
                      {kg(t.teto.detalheEstrutura.vigas.massa_kg, 0)}
                    </td>
                  </tr>
                  <tr className="border-t border-carbono-100 tabular">
                    <td className="px-2 py-1 font-bold">Anel central</td>
                    <td className="px-2 py-1">
                      {t.teto.detalheEstrutura.anelCentral.perfil}
                    </td>
                    <td className="px-2 py-1">1</td>
                    <td className="px-2 py-1">
                      π × {num(t.teto.detalheEstrutura.anelCentral.diametro_m, 2)}
                    </td>
                    <td className="px-2 py-1">
                      {num(t.teto.detalheEstrutura.anelCentral.kg_por_m, 1)}
                    </td>
                    <td className="px-2 py-1 text-right font-bold">
                      {kg(t.teto.detalheEstrutura.anelCentral.massa_kg, 0)}
                    </td>
                  </tr>
                  {t.teto.detalheEstrutura.colunas.quantidade > 0 ? (
                    <tr className="border-t border-carbono-100 tabular">
                      <td className="px-2 py-1 font-bold">Colunas internas</td>
                      <td className="px-2 py-1">
                        {t.teto.detalheEstrutura.colunas.perfil}
                      </td>
                      <td className="px-2 py-1">
                        {t.teto.detalheEstrutura.colunas.quantidade}
                      </td>
                      <td className="px-2 py-1">
                        {num(t.teto.detalheEstrutura.colunas.comprimento_m, 2)}
                      </td>
                      <td className="px-2 py-1">
                        {num(t.teto.detalheEstrutura.colunas.kg_por_m, 1)}
                      </td>
                      <td className="px-2 py-1 text-right font-bold">
                        {kg(t.teto.detalheEstrutura.colunas.massa_kg, 0)}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-t border-carbono-100 tabular">
                      <td
                        className="px-2 py-1 text-carbono-500"
                        colSpan={6}
                      >
                        Sem colunas internas (D &lt; 12 m).
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-carbono-100 tabular">
                    <td className="px-2 py-1 font-bold">Conexões (8%)</td>
                    <td className="px-2 py-1 text-carbono-500" colSpan={4}>
                      Contraventamentos + emendas estimados
                    </td>
                    <td className="px-2 py-1 text-right font-bold">
                      {kg(t.teto.detalheEstrutura.massa_conexoes_kg, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4">
          <MemoriaCalculo memoria={t.teto.memoriaCalculo} />
        </div>
      </Card>

      {/* ============== BOCAIS ============== */}
      <Card
        title={`Bocais (${t.bocais.length})`}
        subtitle={
          t.bocais.length === 0
            ? "Nenhum bocal cadastrado. Adicione bocais na etapa anterior."
            : "Pescoço (Sch 40) + reforço (mais econômico que atende API 650 5.7) + flange (ASME B16.5). Clique para ver memória."
        }
      >
        {t.bocais.length === 0 ? (
          <Link href={`/projeto/${projeto.id}/bocais`}>
            <Button size="sm" variant="ghost">
              ← Adicionar bocais
            </Button>
          </Link>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                  <tr>
                    <th className="px-2 py-2">TAG</th>
                    <th className="px-2 py-2">Função</th>
                    <th className="px-2 py-2">Pos.</th>
                    <th className="px-2 py-2">DN</th>
                    <th className="px-2 py-2">Classe</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2">Reforço</th>
                    <th className="px-2 py-2 text-right">Pesc.</th>
                    <th className="px-2 py-2 text-right">Ref.</th>
                    <th className="px-2 py-2 text-right">Flange</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {t.bocais.map((b: ResultadoBocal) => {
                    const aberto = bocalExpandido === b.entrada.tag;
                    return (
                      <Fragment key={b.entrada.tag}>
                        <tr
                          onClick={() =>
                            setBocalExpandido(aberto ? null : b.entrada.tag)
                          }
                          className={[
                            "cursor-pointer border-b border-carbono-100 transition tabular",
                            aberto ? "bg-verde-50" : "hover:bg-creme",
                          ].join(" ")}
                        >
                          <td className="px-2 py-2 font-bold">{b.entrada.tag}</td>
                          <td className="px-2 py-2 text-xs">
                            {b.entrada.funcao}
                          </td>
                          <td className="px-2 py-2">
                            <Badge
                              cor={
                                b.entrada.posicao === "teto" ? "info" : "carbono"
                              }
                            >
                              {b.entrada.posicao}
                            </Badge>
                          </td>
                          <td className="px-2 py-2">{b.entrada.DN_pol}"</td>
                          <td className="px-2 py-2">{b.entrada.classe}</td>
                          <td className="px-2 py-2">
                            {b.entrada.tipoFlange}/{b.entrada.face}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {b.reforcoAdotado.metodo === "anel-externo"
                              ? "Anel externo"
                              : "Pescoço esp."}
                            {!b.reforcoAdotado.atende && (
                              <Badge cor="amarelo">⚠</Badge>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {kg(b.massa_pescoco_kg, 1)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {kg(b.reforcoAdotado.massa_kg, 1)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {kg(b.flange.massa_kg, 1)}
                          </td>
                          <td className="px-2 py-2 text-right font-bold">
                            {kg(b.pesoTotal_kg, 1)}
                          </td>
                          <td className="px-2 py-2 text-xs text-carbono-500">
                            {aberto ? "▲" : "▼"}
                          </td>
                        </tr>
                        {aberto && (
                          <tr className="border-b border-carbono-100 bg-verde-50">
                            <td colSpan={12} className="px-2 py-3">
                              <div className="space-y-3">
                                <MemoriaCalculo memoria={b.memoriaCalculo} />
                                <div className="rounded-md border border-carbono-200 bg-white p-3">
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-carbono-500">
                                    Comparativo dos 2 métodos de reforço
                                  </h4>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {b.reforcos.map((reforco) => (
                                      <div
                                        key={reforco.metodo}
                                        className={[
                                          "rounded-md p-2 text-xs",
                                          reforco.metodo ===
                                          b.reforcoAdotado.metodo
                                            ? "bg-verde-100 border border-verde-300"
                                            : "bg-creme",
                                        ].join(" ")}
                                      >
                                        <div className="mb-1 flex items-center justify-between">
                                          <strong>
                                            {reforco.metodo === "anel-externo"
                                              ? "Anel externo"
                                              : "Pescoço espessado"}
                                          </strong>
                                          {reforco.metodo ===
                                            b.reforcoAdotado.metodo && (
                                            <Badge cor="verde">★ adotado</Badge>
                                          )}
                                        </div>
                                        <dl className="grid grid-cols-2 gap-1 tabular">
                                          <div>
                                            <dt className="text-carbono-500">
                                              A_req
                                            </dt>
                                            <dd>
                                              {num(reforco.A_req_mm2, 0)} mm²
                                            </dd>
                                          </div>
                                          <div>
                                            <dt className="text-carbono-500">
                                              A_disp
                                            </dt>
                                            <dd>
                                              {num(reforco.A_disp_mm2, 0)} mm²{" "}
                                              {reforco.atende ? "✓" : "✗"}
                                            </dd>
                                          </div>
                                          <div>
                                            <dt className="text-carbono-500">
                                              Massa
                                            </dt>
                                            <dd className="font-bold">
                                              {kg(reforco.massa_kg, 2)}
                                            </dd>
                                          </div>
                                        </dl>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <MemoriaCalculo memoria={b.flange.memoriaCalculo} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-carbono-500">
              Subtotal bocais:{" "}
              <strong className="tabular">{kg(t.pesoBocais_kg)}</strong>
            </div>
          </>
        )}
      </Card>

      {/* ============== ACESSÓRIOS ============== */}
      {t.acessorios && (
        <Card
          title="Escada, plataformas e guarda-corpos"
          subtitle="Estimativas paramétricas com perfis comerciais (UDC 200×75, chapa xadrez 3/16″, tubo Sch 40 1.1/4″)."
        >
          {/* ESCADA */}
          {t.acessorios.escada.tipo !== "nenhuma" && (
            <div className="mb-4">
              <h3 className="font-title text-base font-bold mb-2">
                {t.acessorios.escada.tipo === "helicoidal-externa"
                  ? "Escada helicoidal externa"
                  : "Escada marinheiro vertical"}
              </h3>
              <dl className="grid gap-2 text-sm md:grid-cols-4 mb-3">
                <div>
                  <dt className="text-carbono-500">Comprimento</dt>
                  <dd className="font-bold tabular">
                    {num(t.acessorios.escada.comprimento_m, 2)} m
                  </dd>
                </div>
                <div>
                  <dt className="text-carbono-500">
                    Nº de degraus / passo / altura
                  </dt>
                  <dd className="font-bold tabular">
                    {t.acessorios.escada.numeroDegraus} ·{" "}
                    {num(t.acessorios.escada.passoPe_mm, 0)} mm ·{" "}
                    {num(t.acessorios.escada.alturaDegrau_mm, 0)} mm
                  </dd>
                </div>
                <div>
                  <dt className="text-carbono-500">Massa longarinas</dt>
                  <dd className="font-bold tabular">
                    {kg(t.acessorios.escada.peso_longarinas_kg)}
                  </dd>
                </div>
                <div>
                  <dt className="text-carbono-500">
                    Massa{" "}
                    {t.acessorios.escada.tipo === "marinheiro-vertical"
                      ? "travessões"
                      : "degraus"}
                  </dt>
                  <dd className="font-bold tabular">
                    {kg(t.acessorios.escada.peso_degraus_kg)}
                  </dd>
                </div>
                {t.acessorios.escada.peso_gaiola_kg > 0 && (
                  <div>
                    <dt className="text-carbono-500">Massa gaiola</dt>
                    <dd className="font-bold tabular">
                      {kg(t.acessorios.escada.peso_gaiola_kg)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-carbono-500">
                    <strong>Total escada</strong>
                  </dt>
                  <dd className="font-bold tabular">
                    {kg(t.acessorios.escada.pesoTotal_kg)}
                  </dd>
                </div>
              </dl>
              <MemoriaCalculo memoria={t.acessorios.escada.memoriaCalculo} />
              {t.acessorios.escada.avisos.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs text-amber-800">
                  {t.acessorios.escada.avisos.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
              {t.acessorios.guardaCorpoEscada && (
                <div className="mt-3 rounded-md border border-verde-200 bg-verde-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge cor="verde">Guarda-corpo da escada</Badge>
                    <span className="text-xs text-carbono-500">
                      {num(t.acessorios.guardaCorpoEscada.comprimento_m, 2)} m ·{" "}
                      <strong>
                        {kg(t.acessorios.guardaCorpoEscada.peso_kg)}
                      </strong>{" "}
                      · altura {t.acessorios.guardaCorpoEscada.altura_mm} mm
                    </span>
                  </div>
                  <MemoriaCalculo
                    memoria={t.acessorios.guardaCorpoEscada.memoriaCalculo}
                  />
                </div>
              )}
            </div>
          )}

          {/* PLATAFORMAS */}
          {t.acessorios.plataformas.length > 0 && (
            <div>
              <h3 className="font-title text-base font-bold mb-2">
                Plataformas ({t.acessorios.plataformas.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                    <tr>
                      <th className="px-2 py-2">Nome</th>
                      <th className="px-2 py-2">Cota (m)</th>
                      <th className="px-2 py-2">Área (m²)</th>
                      <th className="px-2 py-2 text-right">Piso</th>
                      <th className="px-2 py-2 text-right">Estrut.</th>
                      <th className="px-2 py-2 text-right">G/Corpo</th>
                      <th className="px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.acessorios.plataformas.map((p) => (
                      <tr
                        key={p.entrada.id}
                        className="border-b border-carbono-100 tabular"
                      >
                        <td className="px-2 py-2 font-bold">{p.entrada.id}</td>
                        <td className="px-2 py-2">
                          {num(p.entrada.cota_m, 2)}
                        </td>
                        <td className="px-2 py-2">
                          {num(p.area_m2, 2)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {kg(p.peso_piso_kg, 1)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {kg(p.peso_estrutura_kg, 1)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {p.peso_guardaCorpo_kg > 0
                            ? kg(p.peso_guardaCorpo_kg, 1)
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-bold">
                          {kg(p.pesoTotal_kg, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-carbono-500">
            Subtotal acessórios:{" "}
            <strong className="tabular">{kg(t.pesoAcessorios_kg)}</strong>
          </div>
        </Card>
      )}

      {/* ============== LISTA DE CHAPAS ============== */}
      <Card
        title="Lista de chapas (corte)"
        subtitle="Quantitativo total de chapas comerciais para o costado."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
              <tr>
                <th className="px-2 py-2">Chapa</th>
                <th className="px-2 py-2">Espessura</th>
                <th className="px-2 py-2">Peso/m²</th>
                <th className="px-2 py-2 text-right">Quantidade (chapas)</th>
              </tr>
            </thead>
            <tbody>
              {r.listaChapas.map((c) => (
                <tr
                  key={c.chapa.polegada}
                  className="border-b border-carbono-100 tabular"
                >
                  <td className="px-2 py-2 font-bold">
                    <Badge cor="carbono">{c.chapa.polegada}"</Badge>
                  </td>
                  <td className="px-2 py-2">{mm(c.chapa.espessura)}</td>
                  <td className="px-2 py-2">
                    {num(c.chapa.pesoPorM2)} kgf/m²
                  </td>
                  <td className="px-2 py-2 text-right font-bold">
                    {num(c.quantidade, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-carbono-500">
          Lista de corte do <strong>costado</strong>. Fundo e teto requerem suas
          próprias chapas (ver dados acima).
        </p>
      </Card>

      {/* ============== RESUMO ============== */}
      <Card title="Resumo do tanque completo" destaque>
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Variante</dt>
            <dd className="font-bold">{variante.metodo}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Massa costado</dt>
            <dd className="font-bold tabular">{kg(r.pesoTotal_kg)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Massa fundo</dt>
            <dd className="font-bold tabular">{kg(t.fundo.pesoTotal_kg)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Massa teto</dt>
            <dd className="font-bold tabular">{kg(t.teto.pesoTotal_kg)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">
              Massa bocais ({t.bocais.length})
            </dt>
            <dd className="font-bold tabular">{kg(t.pesoBocais_kg)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Massa acessórios</dt>
            <dd className="font-bold tabular">{kg(t.pesoAcessorios_kg)}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-carbono-500">Massa total de aço</dt>
            <dd className="font-title text-2xl font-bold tabular text-carbono">
              {kg(t.pesoTotal_kg)}
            </dd>
          </div>
          <div>
            <dt className="text-carbono-500">Custo do aço</dt>
            <dd className="font-bold tabular">{brl(t.custo_R$)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Custo mão de obra</dt>
            <dd className="font-bold tabular">
              {brl(t.pesoTotal_kg * (projeto.parametros.custoMaoDeObraPorKg_R$ ?? PARAMETROS_DEFAULT.custoMaoDeObraPorKg_R$))}
            </dd>
          </div>
          <div className="md:col-span-2 rounded-md bg-verde p-3 flex flex-col gap-1">
            <dt className="text-xs font-bold uppercase tracking-wider text-carbono">
              Custo total estimado (aço + Mão de obra)
            </dt>
            <dd className="font-title text-3xl font-bold tabular text-carbono leading-tight">
              {brl(t.custo_R$ + t.pesoTotal_kg * (projeto.parametros.custoMaoDeObraPorKg_R$ ?? PARAMETROS_DEFAULT.custoMaoDeObraPorKg_R$))}
            </dd>
            <dd className="text-xs text-carbono-700 tabular">
              Aço: {brl(t.custo_R$)} ({brl(projeto.parametros.custoAcoPorKg_R$)}/kg) ·{" "}
              MO: {brl(t.pesoTotal_kg * (projeto.parametros.custoMaoDeObraPorKg_R$ ?? PARAMETROS_DEFAULT.custoMaoDeObraPorKg_R$))} ({brl(projeto.parametros.custoMaoDeObraPorKg_R$ ?? PARAMETROS_DEFAULT.custoMaoDeObraPorKg_R$)}/kg) ·{" "}
              Total: {Math.round(t.pesoTotal_kg).toLocaleString("pt-BR")} kg
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-carbono-500">
          ✅ Inclui costado, fundo (corpo + anel anular se aplicável), teto
          (chapa + estrutura se aplicável), bocais (pescoço + reforço +
          flange) e acessórios (escada + plataformas + guarda-corpos).
        </p>
      </Card>

      {/* ============== CTA NTN ENGENHARIA ============== */}
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <h3 className="font-title text-lg font-bold">
              Quer construir este tanque?
            </h3>
            <p className="mt-1 text-sm text-carbono-600">
              A <strong>NTN Engenharia</strong> realiza o projeto detalhado, fabricação e
              montagem de tanques de armazenamento de combustíveis — da concepção
              ao start-up. Entre em contato e receba um orçamento personalizado.
            </p>
          </div>
          <a
            href={`https://wa.me/5519997514035?text=${encodeURIComponent("Preciso de um orçamento para tanque de combustível")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-5 py-3 font-bold text-white shadow transition hover:bg-[#1ebe5c]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar com a NTN Engenharia
          </a>
        </div>
      </Card>

      <div className="flex justify-between">
        <Link href={`/projeto/${projeto.id}/comparativo`}>
          <Button variant="ghost">← Comparativo</Button>
        </Link>
        <Link href={`/projeto/${projeto.id}/materiais`}>
          <Button>Lista de Materiais →</Button>
        </Link>
      </div>
    </div>
  );
}

function rotuloFundo(tipo: string): string {
  switch (tipo) {
    case "plano-com-anel-anular":
      return "Plano com anel anular";
    case "conico-centro":
      return "Cônico para centro";
    case "conico-periferia":
      return "Cônico para periferia";
    default:
      return tipo;
  }
}

function rotuloTeto(tipo: string): string {
  switch (tipo) {
    case "conico-autoportante":
      return "Cônico autoportante";
    case "conico-suportado":
      return "Cônico suportado";
    case "dome-autoportante":
      return "Dome autoportante";
    default:
      return tipo;
  }
}
