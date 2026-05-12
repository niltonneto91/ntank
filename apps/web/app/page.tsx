import Link from "next/link";

interface ModuloCard {
  norma: string;
  titulo: string;
  descricao: string;
  href: string;
  ativo: boolean;
  icone: string;
}

const MODULOS: ModuloCard[] = [
  {
    norma: "API 650 · NBR 7821",
    titulo: "Cálculo de Tanque Novo",
    descricao:
      "Dimensionamento completo de tanques verticais cilíndricos: costado, fundo, teto, bocais, escadas e plataformas. Comparativo entre 3 métodos de cálculo.",
    href: "/projetos",
    ativo: true,
    icone: "🛢️",
  },
  {
    norma: "API 653",
    titulo: "Inspeção de Tanque Existente",
    descricao:
      "Avaliação de integridade, vida útil remanescente, espessura mínima aceitável e re-rating de tanques em operação.",
    href: "#",
    ativo: false,
    icone: "🔍",
  },
  {
    norma: "API 2000",
    titulo: "Ventilação Atmosférica",
    descricao:
      "Cálculo da capacidade de vent normal e de emergência (inbreathing / outbreathing). Cenários de enchimento, esvaziamento e incêndio.",
    href: "/api2000/projetos",
    ativo: true,
    icone: "💨",
  },
  {
    norma: "API 2350",
    titulo: "Prevenção de Transbordamento",
    descricao:
      "Classificação OPS (Cat 0–3), tempo e volume de resposta, verificação de níveis MW/HH/AOPS/CH. Memória de cálculo em PDF.",
    href: "/api2350/projetos",
    ativo: true,
    icone: "🚨",
  },
  {
    norma: "NBR 17505",
    titulo: "Cálculo de Bacia de Contenção",
    descricao:
      "Dimensionamento do volume e das dimensões da bacia de contenção para múltiplos tanques, conforme requisitos normativos.",
    href: "#",
    ativo: false,
    icone: "🏗️",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-xl bg-carbono px-8 py-10 text-white">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-verde">
          NTN Engenharia
        </p>
        <h1 className="font-title text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-verde">N</span>TANK
        </h1>
        <p className="mt-3 max-w-xl text-sm text-carbono-300 sm:text-base">
          Plataforma de cálculo para bases e terminais de combustíveis.
          Dimensionamento normativo rastreável, memória de cálculo em PDF,
          projetos salvos localmente no seu dispositivo.
        </p>
      </section>

      {/* Grade de módulos */}
      <section>
        <h2 className="mb-4 font-title text-lg font-bold uppercase tracking-wider text-carbono-500">
          Selecione a calculadora
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((mod) => (
            <ModuloCardComponent key={mod.norma} mod={mod} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuloCardComponent({ mod }: { mod: ModuloCard }) {
  const inner = (
    <div
      className={[
        "flex h-full flex-col rounded-xl border-2 p-5 transition",
        mod.ativo
          ? "border-verde bg-white hover:border-carbono hover:shadow-md cursor-pointer"
          : "border-carbono-200 bg-creme cursor-default opacity-70",
      ].join(" ")}
    >
      {/* Cabeçalho */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-2xl" role="img" aria-label={mod.titulo}>
          {mod.icone}
        </span>
        {mod.ativo ? (
          <span className="rounded-full bg-verde px-2 py-0.5 text-xs font-bold text-carbono">
            Disponível
          </span>
        ) : (
          <span className="rounded-full bg-carbono-200 px-2 py-0.5 text-xs font-bold text-carbono-500">
            Em breve
          </span>
        )}
      </div>

      {/* Norma */}
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-carbono-500">
        {mod.norma}
      </p>

      {/* Título */}
      <h3 className="font-title text-base font-bold leading-tight text-carbono sm:text-lg">
        {mod.titulo}
      </h3>

      {/* Descrição */}
      <p className="mt-2 flex-1 text-xs leading-relaxed text-carbono-600 sm:text-sm">
        {mod.descricao}
      </p>

      {/* CTA */}
      {mod.ativo && (
        <div className="mt-4">
          <span className="inline-block rounded bg-carbono px-4 py-2 text-sm font-semibold text-verde transition hover:bg-carbono-700">
            Abrir calculadora →
          </span>
        </div>
      )}
    </div>
  );

  return mod.ativo ? (
    <Link href={mod.href} className="flex">
      {inner}
    </Link>
  ) : (
    <div className="flex">{inner}</div>
  );
}
