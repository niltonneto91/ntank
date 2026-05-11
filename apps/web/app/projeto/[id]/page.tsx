"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  avaliarAproveitamentoChapa,
  type AvaliacaoChapa,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, TextField } from "@/components/Field";
import { ProjetoHeader } from "@/components/ProjetoHeader";
import { Stepper } from "@/components/Stepper";
import { useProjeto } from "@/lib/useProjeto";
import { m, m3, num, pct } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjetoGeometriaPage({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useProjeto(id);

  if (estado.status === "carregando")
    return <p className="text-sm text-carbono-500">Carregando…</p>;
  if (estado.status === "ausente")
    return (
      <Card>
        <p className="text-sm">Projeto não encontrado.</p>
        <div className="mt-2">
          <Link href="/projetos">
            <Button variant="ghost">← Voltar</Button>
          </Link>
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

  const aprov: AvaliacaoChapa | null = (() => {
    try {
      return avaliarAproveitamentoChapa(
        projeto.geometria.D_m,
        projeto.parametros.comprimentoChapa_mm / 1000,
      );
    } catch {
      return null;
    }
  })();

  const vol =
    (Math.PI * Math.pow(projeto.geometria.D_m, 2) * projeto.geometria.H_m) / 4;

  return (
    <div className="space-y-5">
      <ProjetoHeader projeto={projeto} />
      <Stepper projetoId={projeto.id} ativa="geometria" />

      <Card title="Identificação">
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            label="Nome"
            value={projeto.nome}
            onChange={(v) => atualizar({ nome: v })}
          />
          <TextField
            label="Cliente"
            value={projeto.cliente ?? ""}
            onChange={(v) => atualizar({ cliente: v || undefined })}
          />
          <TextField
            label="Local"
            value={projeto.local ?? ""}
            onChange={(v) => atualizar({ local: v || undefined })}
          />
          <TextField
            label="Responsável técnico"
            value={projeto.responsavelTecnico ?? ""}
            onChange={(v) =>
              atualizar({ responsavelTecnico: v || undefined })
            }
            placeholder="Ex.: Eng. Nilton Neto · CREA-SP 5070123456"
          />
        </div>
      </Card>

      <Card
        title="Geometria do tanque"
        subtitle="Diâmetro e altura definem o volume nominal e o número de chapas do costado."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <NumberField
            label="Diâmetro D"
            unit="m"
            value={projeto.geometria.D_m}
            onChange={(v) =>
              atualizar((p) => ({
                ...p,
                geometria: { ...p.geometria, D_m: v },
              }))
            }
            step={0.01}
            min={1}
            max={100}
            hint="Faixa usual API 650: 1 m a 60 m."
          />
          <NumberField
            label="Altura H"
            unit="m"
            value={projeto.geometria.H_m}
            onChange={(v) =>
              atualizar((p) => ({
                ...p,
                geometria: { ...p.geometria, H_m: v },
              }))
            }
            step={0.5}
            min={1}
            max={25}
            hint="Faixa usual: 3 m a 25 m."
          />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-creme p-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-carbono-500">Volume nominal</dt>
            <dd className="font-bold tabular">{m3(vol)}</dd>
          </div>
          <div>
            <dt className="text-carbono-500">Razão H/D</dt>
            <dd className="font-bold tabular">
              {num(projeto.geometria.H_m / projeto.geometria.D_m, 2)}
            </dd>
          </div>
          {aprov && (
            <>
              <div>
                <dt className="text-carbono-500">Circunferência</dt>
                <dd className="font-bold tabular">{m(aprov.circunferencia_m)}</dd>
              </div>
              <div>
                <dt className="text-carbono-500">Chapas (costado)</dt>
                <dd className="font-bold tabular flex flex-wrap items-center gap-2">
                  <span>{aprov.descricao}</span>
                  <Badge
                    cor={
                      aprov.classificacao === "otimo"
                        ? "verde"
                        : aprov.classificacao === "bom"
                          ? "info"
                          : "amarelo"
                    }
                  >
                    {aprov.classificacao === "otimo"
                      ? "ótimo"
                      : aprov.classificacao}{" "}
                    · {pct(aprov.desperdicio_pct)} desp.
                  </Badge>
                </dd>
              </div>
            </>
          )}
        </dl>
      </Card>

      <div className="flex justify-end">
        <Link href={`/projeto/${projeto.id}/parametros`}>
          <Button>Próximo · Parâmetros →</Button>
        </Link>
      </div>
    </div>
  );
}
