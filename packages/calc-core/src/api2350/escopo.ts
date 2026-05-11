/**
 * Verificação de escopo — API Standard 2350, 5th Edition, 2020.
 *
 * Determina se o tanque está dentro do escopo da norma (Section 1 — Scope).
 *
 * NOTA DE COPYRIGHT: A lógica de escopo foi implementada a partir de
 * conhecimento público sobre a API 2350; não reproduz texto normativo.
 * Verificar com exemplar licenciado da norma.
 */

import type {
  EntradaEscopoAPI2350,
  ResultadoEscopoAPI2350,
  AlertaAPI2350,
} from "./types.js";

/**
 * Verifica se o tanque está dentro do escopo da API 2350.
 *
 * Fora do escopo:
 * - Produtos LPG ou LNG (normas específicas se aplicam)
 * - Volume < 5.000 L
 * - Tanque não conectado a sistema de recebimento (sem risco de overflow por recebimento)
 * - Produto coberto por outra prática específica (ex.: PEI RP 600)
 *
 * Requer avaliação:
 * - Tanque dedicado a alívio de duto (pipeline relief tank)
 * - Recebimento exclusivamente por caminhão/vagão com controle de fluxo rigoroso
 */
export function verificarEscopoAPI2350(
  entrada: EntradaEscopoAPI2350,
): ResultadoEscopoAPI2350 {
  const alertas: AlertaAPI2350[] = [];
  const motivosFora: string[] = [];
  const motivosAvaliacao: string[] = [];

  // --- Fora do escopo ---
  if (entrada.produtoLPG) {
    motivosFora.push(
      "Produto GLP (LPG) — normas específicas se aplicam (ex.: NFPA 58, API 2510).",
    );
  }
  if (entrada.produtoLNG) {
    motivosFora.push(
      "Produto GNL (LNG) — normas específicas se aplicam (ex.: NFPA 59A, API 625).",
    );
  }
  if (!entrada.volumeMaior5000L) {
    motivosFora.push(
      "Volume nominal ≤ 5.000 L — tanque abaixo do limiar de escopo da API 2350.",
    );
  }
  if (!entrada.conectadoRecebimento) {
    motivosFora.push(
      "Tanque não conectado a sistema de recebimento — sem risco de transbordamento por transferência.",
    );
  }
  if (entrada.cobertoPorOutraPratica) {
    motivosFora.push(
      "Tanque coberto por outra prática específica do proprietário/operador (ex.: PEI RP 600).",
    );
  }

  if (motivosFora.length > 0) {
    alertas.push({
      code: "S001",
      nivel: "INFO",
      mensagem:
        "Tanque fora do escopo da API 2350. A aplicação pode ser usada em modo de referência " +
        "para boas práticas, mas a conformidade normativa não é exigida para este tanque.",
    });
    return { resultado: "fora", motivos: motivosFora, alertas };
  }

  // --- Requer avaliação ---
  if (entrada.tanqueDedicadoAlivio) {
    motivosAvaliacao.push(
      "Tanque dedicado a alívio de duto (pipeline slug catcher / surge tank) — " +
        "verificar se o projeto já contempla proteção específica contra sobrenível.",
    );
  }
  if (entrada.exclusivamenteCaminhaoVagao) {
    motivosAvaliacao.push(
      "Recebimento exclusivamente por caminhão/vagão — " +
        "confirmar que a vazão máxima e o controle operacional atendem aos requisitos da API 2350.",
    );
    alertas.push({
      code: "S002",
      nivel: "ALERTA",
      mensagem:
        "Recebimento por caminhão/vagão: verificar se a vazão máxima utilizada reflete " +
        "a descarga real máxima do transportador, não a capacidade da bomba do tanque.",
    });
  }

  // --- Alerta de produto ---
  if (!entrada.produtoClasseI_NFPA && !entrada.produtoClasseII_NFPA) {
    alertas.push({
      code: "S003",
      nivel: "INFO",
      mensagem:
        "Produto não classificado como Classe I ou II (NFPA). " +
        "A API 2350 se aplica a produtos inflamáveis e combustíveis; " +
        "confirmar enquadramento com ABNT NBR 17505 / NFPA 30.",
    });
  }

  alertas.push({
    code: "A001",
    nivel: "AVISO_LEGAL",
    mensagem:
      "Verificação de escopo preliminar — confirmar com a versão licenciada da " +
      "API Standard 2350, 5th Edition, 2020, Section 1.",
  });

  if (motivosAvaliacao.length > 0) {
    return { resultado: "requer-avaliacao", motivos: motivosAvaliacao, alertas };
  }

  return { resultado: "dentro", motivos: [], alertas };
}
