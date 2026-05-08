"use client";

import { useEffect, useState } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/** Parser que aceita "1,5" (PT-BR) ou "1.5" (PT-EN). */
function parseNumeroBR(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, "").replace(",", ".");
  if (limpo === "" || limpo === "-" || limpo === "." || limpo === "-.") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Renderiza um número como string editável (sem formatação de milhares). */
function fmtNumeroEdit(n: number): string {
  if (!Number.isFinite(n)) return "";
  // Usa ponto para não conflitar com a vírgula durante digitação.
  return String(n);
}

interface BaseProps {
  label: string;
  hint?: string;
  unit?: string;
  error?: string;
  norma?: string;
  children?: ReactNode;
}

export function Field({ label, hint, unit, error, norma, children }: BaseProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between text-sm font-medium text-carbono-700">
        <span>
          {label}
          {unit && (
            <span className="ml-1 text-carbono-500 font-normal">({unit})</span>
          )}
        </span>
        {norma && (
          <span className="text-[10px] uppercase tracking-wider text-carbono-400">
            {norma}
          </span>
        )}
      </span>
      {children}
      {hint && !error && (
        <span className="text-xs text-carbono-500">{hint}</span>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  label: string;
  value: number | "";
  onChange: (v: number) => void;
  hint?: string;
  unit?: string;
  norma?: string;
  error?: string;
  step?: number;
  min?: number;
  max?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  unit,
  norma,
  error,
  step,
  min,
  max,
  ...rest
}: NumberFieldProps) {
  // Buffer de string para tolerar estados intermediários ("0.", "1,", "-").
  // Sincroniza com o `value` externo quando ele muda por outro caminho.
  const [texto, setTexto] = useState<string>(
    typeof value === "number" ? fmtNumeroEdit(value) : "",
  );
  useEffect(() => {
    if (typeof value !== "number") return;
    const parsed = parseNumeroBR(texto);
    if (parsed === null || Math.abs(parsed - value) > 1e-9) {
      setTexto(fmtNumeroEdit(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const fora =
    (() => {
      const n = parseNumeroBR(texto);
      if (n === null) return texto !== "";
      if (typeof min === "number" && n < min) return true;
      if (typeof max === "number" && n > max) return true;
      return false;
    })();

  return (
    <Field
      label={label}
      unit={unit}
      hint={hint}
      norma={norma}
      error={error ?? (fora ? "Valor fora da faixa esperada." : undefined)}
    >
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={(e) => {
          const t = e.target.value;
          setTexto(t);
          const n = parseNumeroBR(t);
          if (n !== null) onChange(n);
        }}
        onBlur={() => {
          const n = parseNumeroBR(texto);
          if (n === null) {
            // restaura último válido
            if (typeof value === "number") setTexto(fmtNumeroEdit(value));
          } else {
            // normaliza o display
            setTexto(fmtNumeroEdit(n));
          }
        }}
        aria-invalid={fora || Boolean(error)}
        className={[
          "tabular w-full rounded-md border px-3 py-2 text-base outline-none transition",
          error || fora
            ? "border-red-500 bg-red-50"
            : "border-carbono-200 bg-white focus:border-verde",
        ].join(" ")}
        {...rest}
        // step/min/max só servem como dica; validação é nossa.
        data-step={step}
        data-min={min}
        data-max={max}
      />
    </Field>
  );
}

interface SelectFieldProps<T extends string | number>
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "onChange" | "children"
  > {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  hint?: string;
  norma?: string;
  error?: string;
}

export function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  hint,
  norma,
  error,
  ...rest
}: SelectFieldProps<T>) {
  return (
    <Field label={label} hint={hint} norma={norma} error={error}>
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          const first = options[0];
          if (typeof first?.value === "number") {
            onChange(Number(v) as T);
          } else {
            onChange(v as T);
          }
        }}
        className="w-full rounded-md border border-carbono-200 bg-white px-3 py-2 text-base outline-none transition focus:border-verde"
        {...rest}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  ...rest
}: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-md border px-3 py-2 text-base outline-none transition",
          error
            ? "border-red-500 bg-red-50"
            : "border-carbono-200 bg-white focus:border-verde",
        ].join(" ")}
        {...rest}
      />
    </Field>
  );
}
