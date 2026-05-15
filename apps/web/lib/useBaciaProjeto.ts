"use client";

/**
 * Hook de estado reativo para projetos Bacia de Contenção (NBR 17505).
 * Segue o mesmo padrão de useApi653Projeto / useApi2000Projeto.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { obterProjetoBacia, salvarProjetoBacia } from "./db";
import type { ProjetoBacia } from "./bacia-projeto";

type EstadoCarregando = { status: "carregando" };
type EstadoAusente    = { status: "ausente" };
type EstadoErro       = { status: "erro"; mensagem: string };
type EstadoOk         = { status: "ok"; projeto: ProjetoBacia };

export type EstadoBacia =
  | EstadoCarregando
  | EstadoAusente
  | EstadoErro
  | EstadoOk;

type Updater = (p: ProjetoBacia) => ProjetoBacia;
type Patch   = Partial<ProjetoBacia>;

const DEBOUNCE_MS = 800;

export function useBaciaProjeto(id: string) {
  const [estado, setEstado] = useState<EstadoBacia>({ status: "carregando" });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });

    obterProjetoBacia(id)
      .then((p) => {
        if (cancelado) return;
        if (!p) setEstado({ status: "ausente" });
        else     setEstado({ status: "ok", projeto: p });
      })
      .catch((e) => {
        if (!cancelado)
          setEstado({ status: "erro", mensagem: (e as Error).message });
      });

    return () => { cancelado = true; };
  }, [id]);

  const persistir = useCallback((p: ProjetoBacia) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      salvarProjetoBacia(p).catch(console.error);
    }, DEBOUNCE_MS);
  }, []);

  const atualizar = useCallback(
    (patchOrUpdater: Patch | Updater) => {
      setEstado((prev) => {
        if (prev.status !== "ok") return prev;
        const atualizado =
          typeof patchOrUpdater === "function"
            ? patchOrUpdater(prev.projeto)
            : { ...prev.projeto, ...patchOrUpdater };
        persistir(atualizado);
        return { status: "ok", projeto: atualizado };
      });
    },
    [persistir],
  );

  return { estado, atualizar };
}
