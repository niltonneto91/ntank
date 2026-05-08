import type { ReactNode } from "react";

type Cor = "verde" | "carbono" | "amarelo" | "vermelho" | "info";

const CORES: Record<Cor, string> = {
  verde: "bg-verde-100 text-verde-900 border-verde-300",
  carbono: "bg-carbono-100 text-carbono-700 border-carbono-200",
  amarelo: "bg-amber-100 text-amber-900 border-amber-300",
  vermelho: "bg-red-100 text-red-900 border-red-300",
  info: "bg-blue-50 text-blue-900 border-blue-200",
};

export function Badge({
  children,
  cor = "carbono",
}: {
  children: ReactNode;
  cor?: Cor;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        CORES[cor],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
