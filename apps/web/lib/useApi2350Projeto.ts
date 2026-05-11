"use client";

/**
 * Hook de estado reativo para projetos API 2350.
 *
 * Segue o mesmo padrão do useApi2000Projeto.ts:
 *   - Carrega o projeto do IndexedDB pelo id
 *   - Persiste automaticamente a cada atualização (debounce 800 ms)
 *   - Expõe `atualizar(patch | updater)` para mutações imutáveis
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { obterProjetoAPI2350, salvarProjetoAPI2350 } from "./db";
import type { ProjetoAPI2350 } from "./api2350-projeto";

// ---------------------------------------------------------------------------
// Tipos de estado
// ---------------------------------------------------------------------------

type EstadoCarregando = { status: "carregando" };
type EstadoAusente    = { status: "ausente" };
type EstadoErro       = { status: "erro"; mensagem: string };
type EstadoOk         = { status: "ok"; projeto: ProjetoAPI2350 };

export type EstadoAPI2350 =
  | EstadoCarregando
  | EstadoAusente
  | EstadoErro
  | EstadoOk;

type Updater = (p: ProjetoAPI2350) => ProjetoAPI2350;
type Patch = Partial<ProjetoAPI2350>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 800;

export function useApi2350Projeto(id: string) {
  const [estado, setEstado] = useState<EstadoAPI2350>({ status: "carregando" });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carregamento inicial
  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });

    obterProjetoAPI2350(id)
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
  const persistir = useCallback((p: ProjetoAPI2350) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      salvarProjetoAPI2350(p).catch(console.error);
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
