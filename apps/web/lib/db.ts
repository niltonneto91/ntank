/**
 * Persistência IndexedDB dos projetos NTANK.
 *
 * Banco "ntank-db", store "projetos", chave = id do ProjetoNTANK.
 * Tudo client-side — nada sai do dispositivo.
 *
 * Histórico de versões:
 *   v1 — store "projetos" com índice "by-atualizado"
 *   v2 — adiciona índice "by-tipo" (Fase 0 do roadmap multi-calculadora)
 */

"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { migrarProjeto, type ProjetoNTANK } from "./projeto";

interface NtankDB extends DBSchema {
  projetos: {
    key: string;
    value: ProjetoNTANK;
    indexes: {
      "by-atualizado": string;
      /** Adicionado na v2 — permite filtrar por tipo de calculadora. */
      "by-tipo": string;
    };
  };
}

const DB_NAME = "ntank-db";
const DB_VERSION = 2;

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
        // v1 → criação inicial da store
        if (oldVersion < 1) {
          const store = db.createObjectStore("projetos", { keyPath: "id" });
          store.createIndex("by-atualizado", "atualizadoEm");
          store.createIndex("by-tipo", "tipo");
        }

        // v1 → v2: adiciona índice "by-tipo" na store já existente
        // (usuários que já tinham o app instalado)
        if (oldVersion === 1) {
          const store = transaction.objectStore("projetos");
          if (!store.indexNames.contains("by-tipo")) {
            store.createIndex("by-tipo", "tipo");
          }
        }
      },
    });
  }
  return dbPromise;
}

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
    tipo: projeto.tipo ?? "API650",    // garante que o campo existe antes de gravar
    atualizadoEm: new Date().toISOString(),
  };
  await db.put("projetos", atualizado);
}

export async function excluirProjeto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("projetos", id);
}
