import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamanho = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variante;
  size?: Tamanho;
  full?: boolean;
}

const VARIANTES: Record<Variante, string> = {
  primary: "bg-carbono text-verde hover:bg-carbono-700 disabled:bg-carbono-300",
  secondary:
    "bg-verde text-carbono hover:bg-verde-400 disabled:bg-carbono-200 disabled:text-carbono-400",
  ghost:
    "bg-transparent text-carbono-700 hover:bg-creme border border-carbono-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  full,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:cursor-not-allowed",
        VARIANTES[variant],
        TAMANHOS[size],
        full ? "w-full" : "",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
