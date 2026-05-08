"use client";

import { useCallback, useEffect, useState } from "react";
import { obterProjeto, salvarProjeto } from "./db";
import { migrarProjeto, type ProjetoNTANK } from "./projeto";

export type EstadoProjeto =
  | { status: "carregando" }
  | { status: "ausente" }
  | { status: "erro"; mensagem: string }
  | { status: "ok"; projeto: ProjetoNTANK };

/**
 * Hook que carrega um projeto do IndexedDB e expõe um helper `salvar`
 * que persiste alterações de forma otimista no estado local.
 */
export function useProjeto(id: string) {
  const [estado, setEstado] = useState<EstadoProjeto>({ status: "carregando" });

  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });
    obterProjeto(id)
      .then((p) => {
        if (cancelado) return;
        if (!p) setEstado({ status: "ausente" });
        else setEstado({ status: "ok", projeto: migrarProjeto(p) });
      })
      .catch((e: Error) => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: e.message });
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  const atualizar = useCallback(
    async (patch: Partial<ProjetoNTANK> | ((p: ProjetoNTANK) => ProjetoNTANK)) => {
      setEstado((e) => {
        if (e.status !== "ok") return e;
        const novo =
          typeof patch === "function"
            ? patch(e.projeto)
            : { ...e.projeto, ...patch };
        // persiste em background
        void salvarProjeto(novo);
        return { status: "ok", projeto: novo };
      });
    },
    [],
  );

  return { estado, atualizar };
}
