import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  destaque?: boolean;
}

export function Card({
  children,
  title,
  subtitle,
  destaque,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border bg-white p-5 shadow-card",
        destaque
          ? "border-verde ring-2 ring-verde-200"
          : "border-carbono-200",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && (
            <h3 className="font-title text-lg font-bold text-carbono">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-sm text-carbono-500">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
