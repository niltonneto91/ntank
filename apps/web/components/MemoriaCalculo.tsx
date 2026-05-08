import type { ResultadoCalculo } from "@ntank/calc-core";
import { num } from "@/lib/format";

export function MemoriaCalculo({ memoria }: { memoria: ResultadoCalculo }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-carbono px-2 py-0.5 font-mono text-verde">
          {memoria.itemNorma}
        </span>
        <span className="text-carbono-500">{memoria.metodo}</span>
      </div>
      <div className="rounded-md bg-creme p-3 font-mono text-[12px] leading-relaxed text-carbono-800">
        <div>
          <strong>Fórmula:</strong> {memoria.formula}
        </div>
        <div className="mt-1">
          <strong>Substituição:</strong> {memoria.substituicao}
        </div>
        <div className="mt-1">
          <strong>Resultado:</strong>{" "}
          <span className="text-carbono">
            {num(memoria.resultado.valor, 3)} {memoria.resultado.unidade}
          </span>
        </div>
        {memoria.espessuraAdotada && (
          <div className="mt-1">
            <strong>Espessura adotada:</strong>{" "}
            <span className="text-carbono">
              {num(memoria.espessuraAdotada.valor, 2)}{" "}
              {memoria.espessuraAdotada.unidade}
            </span>
            <span className="text-carbono-500">
              {" "}
              — {memoria.espessuraAdotada.justificativa}
            </span>
          </div>
        )}
      </div>
      {Object.keys(memoria.parametros).length > 0 && (
        <details className="text-xs text-carbono-500">
          <summary className="cursor-pointer hover:text-carbono">
            Parâmetros usados
          </summary>
          <dl className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
            {Object.entries(memoria.parametros).map(([k, v]) => (
              <div key={k} className="rounded bg-white px-2 py-1">
                <dt className="font-mono text-[10px] text-carbono-400">{k}</dt>
                <dd className="font-mono tabular">
                  {typeof v === "number" ? num(v, 3) : v}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
