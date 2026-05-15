"use client";

/**
 * Persistência IndexedDB dos projetos NTANK.
 *
 * Banco "ntank-db" — stores:
 *   "projetos"      → ProjetoNTANK (API 650 / API 653)
 *   "calc-api2000"  → ProjetoAPI2000 (ventilação — API 2000)
 *   "calc-api2350"  → ProjetoAPI2350 (prevenção de transbordamento — API 2350)
 *   "calc-api653"   → ProjetoAPI653 (inspeção e vida útil — API 653)
 *   "calc-bacia"    → ProjetoBacia (bacia de contenção — NBR 17505)
 *
 * Histórico de versões:
 *   v1 — store "projetos" com índice "by-atualizado"
 *   v2 — adiciona índice "by-tipo" em "projetos" (Fase 0)
 *   v3 — adiciona store "calc-api2000" (Fase API 2000)
 *   v4 — adiciona store "calc-api2350" (Fase API 2350)
 *   v5 — adiciona store "calc-api653"  (Fase API 653)
 *   v6 — adiciona store "calc-bacia"   (Fase NBR 17505 Bacia de Contenção)
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { migrarProjeto, type ProjetoNTANK } from "./projeto";
import type { ProjetoAPI2000 } from "./api2000-projeto";
import type { ProjetoAPI2350 } from "./api2350-projeto";
import type { ProjetoAPI653 } from "./api653-projeto";
import type { ProjetoBacia } from "./bacia-projeto";

interface NtankDB extends DBSchema {
  projetos: {
    key: string;
    value: ProjetoNTANK;
    indexes: {
      "by-atualizado": string;
      "by-tipo": string;
    };
  };
  "calc-api2000": {
    key: string;
    value: ProjetoAPI2000;
    indexes: {
      "by-atualizado": string;
    };
  };
  "calc-api2350": {
    key: string;
    value: ProjetoAPI2350;
    indexes: {
      "by-atualizado": string;
    };
  };
  "calc-api653": {
    key: string;
    value: ProjetoAPI653;
    indexes: {
      "by-atualizado": string;
    };
  };
  "calc-bacia": {
    key: string;
    value: ProjetoBacia;
    indexes: {
      "by-atualizado": string;
    };
  };
}

const DB_NAME = "ntank-db";
const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase<NtankDB>> | null = null;

function getDB(): Promise<IDBPDatabase<NtankDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB indisponível neste ambiente."),
    );
  }
  if (!dbPromise) {
    dbPromise = openDB<NtankDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // v1 → criação inicial da store "projetos"
        if (oldVersion < 1) {
          const store = db.createObjectStore("projetos", { keyPath: "id" });
          store.createIndex("by-atualizado", "atualizadoEm");
          store.createIndex("by-tipo", "tipo");
        }

        // v1 → v2: adiciona índice "by-tipo" (usuários que já tinham o app)
        if (oldVersion === 1) {
          const store = transaction.objectStore("projetos");
          if (!store.indexNames.contains("by-tipo")) {
            store.createIndex("by-tipo", "tipo");
          }
        }

        // v2 → v3: nova store "calc-api2000" para projetos API 2000
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("calc-api2000")) {
            const s = db.createObjectStore("calc-api2000", { keyPath: "id" });
            s.createIndex("by-atualizado", "atualizadoEm");
          }
        }

        // v3 → v4: nova store "calc-api2350" para projetos API 2350
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains("calc-api2350")) {
            const s = db.createObjectStore("calc-api2350", { keyPath: "id" });
            s.createIndex("by-atualizado", "atualizadoEm");
          }
        }

        // v4 → v5: nova store "calc-api653" para projetos API 653
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains("calc-api653")) {
            const s = db.createObjectStore("calc-api653", { keyPath: "id" });
            s.createIndex("by-atualizado", "atualizadoEm");
          }
        }

        // v5 → v6: nova store "calc-bacia" para projetos Bacia de Contenção
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains("calc-bacia")) {
            const s = db.createObjectStore("calc-bacia", { keyPath: "id" });
            s.createIndex("by-atualizado", "atualizadoEm");
          }
        }
      },
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// API 650 / ProjetoNTANK
// ---------------------------------------------------------------------------

export async function listarProjetos(): Promise<ProjetoNTANK[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("projetos", "by-atualizado");
  return all.reverse().map(migrarProjeto); // mais recentes primeiro
}

export async function obterProjeto(id: string): Promise<ProjetoNTANK | undefined> {
  const db = await getDB();
  const p = await db.get("projetos", id);
  return p ? migrarProjeto(p) : undefined;
}

export async function salvarProjeto(projeto: ProjetoNTANK): Promise<void> {
  const db = await getDB();
  const atualizado: ProjetoNTANK = {
    ...projeto,
    tipo: projeto.tipo ?? "API650",
    atualizadoEm: new Date().toISOString(),
  };
  await db.put("projetos", atualizado);
}

export async function excluirProjeto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("projetos", id);
}

// ---------------------------------------------------------------------------
// API 2000 / ProjetoAPI2000
// ---------------------------------------------------------------------------

export async function listarProjetosAPI2000(): Promise<ProjetoAPI2000[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("calc-api2000", "by-atualizado");
  return all.reverse(); // mais recentes primeiro
}

export async function obterProjetoAPI2000(id: string): Promise<ProjetoAPI2000 | undefined> {
  const db = await getDB();
  return db.get("calc-api2000", id);
}

export async function salvarProjetoAPI2000(projeto: ProjetoAPI2000): Promise<void> {
  const db = await getDB();
  await db.put("calc-api2000", {
    ...projeto,
    atualizadoEm: new Date().toISOString(),
  });
}

export async function excluirProjetoAPI2000(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("calc-api2000", id);
}

// ---------------------------------------------------------------------------
// API 2350 / ProjetoAPI2350
// ---------------------------------------------------------------------------

export async function listarProjetosAPI2350(): Promise<ProjetoAPI2350[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("calc-api2350", "by-atualizado");
  return all.reverse(); // mais recentes primeiro
}

export async function obterProjetoAPI2350(id: string): Promise<ProjetoAPI2350 | undefined> {
  const db = await getDB();
  return db.get("calc-api2350", id);
}

export async function salvarProjetoAPI2350(projeto: ProjetoAPI2350): Promise<void> {
  const db = await getDB();
  await db.put("calc-api2350", {
    ...projeto,
    atualizadoEm: new Date().toISOString(),
  });
}

export async function excluirProjetoAPI2350(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("calc-api2350", id);
}

// ---------------------------------------------------------------------------
// API 653 / ProjetoAPI653
// ---------------------------------------------------------------------------

export async function listarProjetosAPI653(): Promise<ProjetoAPI653[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("calc-api653", "by-atualizado");
  return all.reverse(); // mais recentes primeiro
}

export async function obterProjetoAPI653(id: string): Promise<ProjetoAPI653 | undefined> {
  const db = await getDB();
  return db.get("calc-api653", id);
}

export async function salvarProjetoAPI653(projeto: ProjetoAPI653): Promise<void> {
  const db = await getDB();
  await db.put("calc-api653", {
    ...projeto,
    atualizadoEm: new Date().toISOString(),
  });
}

export async function excluirProjetoAPI653(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("calc-api653", id);
}

// ---------------------------------------------------------------------------
// NBR 17505 / ProjetoBacia
// ---------------------------------------------------------------------------

export async function listarProjetosBacia(): Promise<ProjetoBacia[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("calc-bacia", "by-atualizado");
  return all.reverse(); // mais recentes primeiro
}

export async function obterProjetoBacia(id: string): Promise<ProjetoBacia | undefined> {
  const db = await getDB();
  return db.get("calc-bacia", id);
}

export async function salvarProjetoBacia(projeto: ProjetoBacia): Promise<void> {
  const db = await getDB();
  await db.put("calc-bacia", {
    ...projeto,
    atualizadoEm: new Date().toISOString(),
  });
}

export async function excluirProjetoBacia(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("calc-bacia", id);
}
