/**
 * Hook de estado reativo para projetos API 2000.
 *
 * Segue o mesmo padrão do useProjeto.ts (API 650):
 *   - Carrega o projeto do IndexedDB pelo id
 *   - Persiste automaticamente a cada atualização (debounce 800 ms)
 *   - Expõe `atualizar(patch | updater)` para mutações imutáveis
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { obterProjetoAPI2000, salvarProjetoAPI2000 } from "./db";
import type { ProjetoAPI2000 } from "./api2000-projeto";

// ---------------------------------------------------------------------------
// Tipos de estado
// ---------------------------------------------------------------------------

type EstadoCarregando = { status: "carregando" };
type EstadoAusente    = { status: "ausente" };
type EstadoErro       = { status: "erro"; mensagem: string };
type EstadoOk         = { status: "ok"; projeto: ProjetoAPI2000 };

export type EstadoAPI2000 =
  | EstadoCarregando
  | EstadoAusente
  | EstadoErro
  | EstadoOk;

type Updater = (p: ProjetoAPI2000) => ProjetoAPI2000;
type Patch = Partial<ProjetoAPI2000>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 800;

export function useApi2000Projeto(id: string) {
  const [estado, setEstado] = useState<EstadoAPI2000>({ status: "carregando" });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carregamento inicial
  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });

    obterProjetoAPI2000(id)
      .then((p) => {
        if (cancelado) return;
        if (!p) {
          setEstado({ status: "ausente" });
        } else {
          setEstado({ status: "ok", projeto: p });
        }
      })
      .catch((e) => {
        if (!cancelado) {
          setEstado({ status: "erro", mensagem: (e as Error).message });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [id]);

  // Persistência com debounce
  const persistir = useCallback((p: ProjetoAPI2000) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      salvarProjetoAPI2000(p).catch(console.error);
    }, DEBOUNCE_MS);
  }, []);

  /**
   * Atualiza o projeto.
   * Aceita um objeto parcial (patch) ou uma função updater pura.
   */
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
