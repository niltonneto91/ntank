/**
 * Cálculo de vida útil restante (RUL — Remaining Useful Life) — API 653.
 *
 * Para cada curso do costado:
 *   RUL = (t_medida − t_min) / CR   [anos]
 *
 * onde:
 *   t_medida = espessura medida na inspeção [mm]
 *   t_min    = espessura mínima aceitável por API 653 §4.3.2 [mm]
 *   CR       = taxa de corrosão adotada [mm/ano]
 *
 * Se t_medida < t_min → RUL = 0 (REPROVADO imediato).
 * Se CR = 0 → RUL = null (vida indefinida — mas alertado).
 *
 * O RUL do COSTADO é o menor RUL entre todos os cursos.
 *
 * NÃO reproduz texto da norma.
 */

import { round2 } from "./conversoes.js";
import { calcularTaxaCorrosao } from "./corrosao.js";
import { calcularMASTCurso } from "./espessura-min.js";
import type {
  EntradaAvaliacaoCostado,
  ResultadoAvaliacaoCostado,
  ResultadoVerificacaoCurso,
  StatusCurso,
  AlertaAPI653,
} from "./types.js";

/**
 * Avalia todos os cursos do costado: MAST, taxa de corrosão e RUL.
 * Retorna o resultado consolidado com o curso crítico e o RUL global.
 */
export function avaliarCostado(
  entrada: EntradaAvaliacaoCostado,
): ResultadoAvaliacaoCostado {
  const { D_m, H_liq_m, G, S_MPa, E, cursos, CR_assumida_mm_ano, dataInspecao } = entrada;
  const alertasGlobais: AlertaAPI653[] = [];

  if (cursos.length === 0) {
    alertasGlobais.push({
      code: "V001",
      nivel: "CRITICO",
      mensagem: "Nenhum curso informado. Insira os dados de medição do costado.",
    });
    return {
      cursos: [],
      cursoCritico: null,
      RUL_costado_anos: null,
      costadoAprovado: false,
      alertas: alertasGlobais,
    };
  }

  // Calcular cota de base de cada curso (altura acumulada dos cursos anteriores)
  const cotas: number[] = [];
  let cota = 0;
  for (const c of cursos) {
    cotas.push(cota);
    cota += c.altura_m;
  }

  const resultadosCursos: ResultadoVerificacaoCurso[] = cursos.map((c, idx) => {
    const alertasCurso: AlertaAPI653[] = [];

    // 1. MAST — espessura mínima aceitável
    const mast = calcularMASTCurso(D_m, H_liq_m, cotas[idx] ?? 0, c.numero, G, S_MPa, E);
    const t_min_mm = mast.t_min_mm;

    // 2. Taxa de corrosão para este curso
    const taxa = calcularTaxaCorrosao(
      c.t_medida_mm,
      c.t_anterior_mm,
      c.data_anterior,
      dataInspecao,
      CR_assumida_mm_ano,
    );
    taxa.alertas.forEach((a) =>
      alertasCurso.push({ ...a, code: `${a.code}-C${c.numero}` }),
    );
    const CR = taxa.CR_adotada_mm_ano;

    // 3. RUL
    const t_perda_mm = round2(c.t_nominal_mm - c.t_medida_mm);
    const t_sobra_mm = round2(c.t_medida_mm - t_min_mm);
    let RUL_anos: number | null = null;
    let status: StatusCurso = "APROVADO";

    if (c.t_medida_mm < t_min_mm) {
      status = "REPROVADO";
      RUL_anos = 0;
      alertasCurso.push({
        code: `V002-C${c.numero}`,
        nivel: "CRITICO",
        mensagem:
          `Curso ${c.numero}: espessura medida (${c.t_medida_mm} mm) está ` +
          `ABAIXO da mínima aceitável (${t_min_mm.toFixed(3)} mm). ` +
          "O tanque NÃO está apto para operação neste nível de produto.",
      });
    } else if (CR > 0) {
      RUL_anos = round2(t_sobra_mm / CR);
      if (RUL_anos < 1) {
        status = "CRITICO";
        alertasCurso.push({
          code: `V003-C${c.numero}`,
          nivel: "CRITICO",
          mensagem:
            `Curso ${c.numero}: vida útil restante < 1 ano (${RUL_anos.toFixed(2)} anos). ` +
            "Inspeção e decisão de reparo/substituição urgente requeridas.",
        });
      } else if (RUL_anos < 3) {
        status = "CRITICO";
        alertasCurso.push({
          code: `V004-C${c.numero}`,
          nivel: "ALERTA",
          mensagem:
            `Curso ${c.numero}: vida útil restante entre 1–3 anos (${RUL_anos.toFixed(2)} anos). ` +
            "Planejar intervenção no próximo ciclo de inspeção.",
        });
      }
    }
    // CR = 0: RUL_anos permanece null (tratado como indefinido)

    return {
      numero: c.numero,
      t_nominal_mm: c.t_nominal_mm,
      t_medida_mm: c.t_medida_mm,
      t_min_mm,
      t_perda_mm,
      t_sobra_mm,
      CR_mm_ano: CR,
      RUL_anos,
      status,
      alertas: alertasCurso,
    };
  });

  // Curso crítico: menor RUL positivo (cursos reprovados têm RUL=0)
  const cursosComRUL = resultadosCursos.filter((r) => r.RUL_anos !== null);
  const cursoCritico =
    cursosComRUL.length > 0
      ? cursosComRUL.reduce((min, r) => (r.RUL_anos! < min.RUL_anos! ? r : min))
      : null;

  const RUL_costado_anos = cursoCritico?.RUL_anos ?? null;
  const costadoAprovado = resultadosCursos.every((r) => r.status !== "REPROVADO");

  alertasGlobais.push({
    code: "A001",
    nivel: "AVISO_LEGAL",
    mensagem:
      "Avaliação preliminar de integridade — não substitui laudo técnico formal " +
      "assinado por engenheiro habilitado (ART/RRT). " +
      "Referência: API Standard 653, 5ª edição.",
  });

  return {
    cursos: resultadosCursos,
    cursoCritico,
    RUL_costado_anos,
    costadoAprovado,
    alertas: alertasGlobais,
  };
}
