/**
 * Dispatcher do cálculo do teto.
 *
 * Direciona para a função específica do tipo de teto. Tetos suportados
 * por dome ficam para fase posterior (fora do MVP).
 */

import type { EntradaTeto, ResultadoTeto } from "../types.js";
import { calcularTetoConicoAutoportante } from "./conico-autoportante.js";
import { calcularTetoConicoSuportado } from "./conico-suportado.js";
import { calcularTetoDomeAutoportante } from "./dome-autoportante.js";

export function calcularTeto(entrada: EntradaTeto): ResultadoTeto {
  switch (entrada.tipo) {
    case "conico-autoportante":
      return calcularTetoConicoAutoportante(entrada);
    case "conico-suportado":
      return calcularTetoConicoSuportado(entrada);
    case "dome-autoportante":
      return calcularTetoDomeAutoportante(entrada);
    default: {
      const exhaustiveCheck: never = entrada.tipo;
      throw new Error(`Tipo de teto desconhecido: ${String(exhaustiveCheck)}`);
    }
  }
}

export { calcularTetoConicoAutoportante } from "./conico-autoportante.js";
export { calcularTetoConicoSuportado } from "./conico-suportado.js";
export { calcularTetoDomeAutoportante } from "./dome-autoportante.js";
