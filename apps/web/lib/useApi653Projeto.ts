"use client";

/**
 * Hook de estado reativo para projetos API 653.
 * Segue o mesmo padrão de useApi2000Projeto / useApi2350Projeto.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { obterProjetoAPI653, salvarProjetoAPI653 } from "./db";
import type { ProjetoAPI653 } from "./api653-projeto";

type EstadoCarregando = { status: "carregando" };
type EstadoAusente    = { status: "ausente" };
type EstadoErro       = { status: "erro"; mensagem: string };
type EstadoOk         = { status: "ok"; projeto: ProjetoAPI653 };

export type EstadoAPI653 =
  | EstadoCarregando
  | EstadoAusente
  | EstadoErro
  | EstadoOk;

type Updater = (p: ProjetoAPI653) => ProjetoAPI653;
type Patch   = Partial<ProjetoAPI653>;

const DEBOUNCE_MS = 800;

export function useApi653Projeto(id: string) {
  const [estado, setEstado] = useState<EstadoAPI653>({ status: "carregando" });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });

    obterProjetoAPI653(id)
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

  const persistir = useCallback((p: ProjetoAPI653) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      salvarProjetoAPI653(p).catch(console.error);
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
