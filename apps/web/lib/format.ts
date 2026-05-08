/**
 * Formatadores PT-BR para a UI do NTANK.
 */

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

export function brl(valor: number): string {
  return fmtBRL.format(valor);
}

export function num(valor: number, casas = 2): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function kg(valor: number, casas = 0): string {
  return `${num(valor, casas)} kg`;
}

export function mm(valor: number, casas = 2): string {
  return `${num(valor, casas)} mm`;
}

export function m(valor: number, casas = 2): string {
  return `${num(valor, casas)} m`;
}

export function m3(valor: number, casas = 1): string {
  return `${num(valor, casas)} m³`;
}

export function pct(valor: number, casas = 1): string {
  return `${num(valor, casas)} %`;
}

const dtfShort = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function dataHora(iso: string): string {
  return dtfShort.format(new Date(iso));
}
