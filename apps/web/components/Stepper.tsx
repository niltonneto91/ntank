"use client";

import Link from "next/link";

export type EtapaId =
  | "geometria"
  | "parametros"
  | "bocais"
  | "acessorios"
  | "comparativo"
  | "detalhes"
  | "materiais"
  | "soldagem"
  | "pintura";

const ETAPAS: ReadonlyArray<{ id: EtapaId; label: string }> = [
  { id: "geometria",   label: "Geometria" },
  { id: "parametros",  label: "Parâmetros" },
  { id: "bocais",      label: "Bocais" },
  { id: "acessorios",  label: "Acessórios" },
  { id: "comparativo", label: "Comparativo" },
  { id: "detalhes",    label: "Detalhes" },
  { id: "materiais",   label: "Materiais" },
  { id: "soldagem",    label: "Soldagem" },
  { id: "pintura",     label: "Pintura" },
];

interface StepperProps {
  projetoId: string;
  ativa: EtapaId;
}

export function Stepper({ projetoId, ativa }: StepperProps) {
  const indiceAtivo = ETAPAS.findIndex((e) => e.id === ativa);

  return (
    <nav
      aria-label="Etapas do projeto"
      className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-carbono-200 bg-white p-2 text-sm"
    >
      {ETAPAS.map((etapa, idx) => {
        const ativo = etapa.id === ativa;
        const concluida = idx < indiceAtivo;
        return (
          <Link
            key={etapa.id}
            href={`/projeto/${projetoId}/${etapa.id === "geometria" ? "" : etapa.id}`}
            className={[
              "flex items-center gap-1.5 rounded-md px-2 py-2 font-medium transition sm:gap-2 sm:px-3",
              ativo
                ? "bg-carbono text-verde"
                : concluida
                  ? "bg-verde-50 text-carbono-700 hover:bg-verde-100"
                  : "text-carbono-500 hover:bg-creme",
            ].join(" ")}
            aria-current={ativo ? "step" : undefined}
            title={etapa.label}
          >
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                ativo
                  ? "bg-verde text-carbono"
                  : concluida
                    ? "bg-verde text-carbono"
                    : "bg-carbono-200 text-carbono-600",
              ].join(" ")}
            >
              {idx + 1}
            </span>
            <span className={ativo ? "" : "hidden sm:inline"}>
              {etapa.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
