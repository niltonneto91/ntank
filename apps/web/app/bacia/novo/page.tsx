"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField, NumberField, SelectField } from "@/components/Field";
import { criarProjetoBacia } from "@/lib/bacia-projeto";
import { salvarProjetoBacia } from "@/lib/db";

export default function NovaBaciaPage() {
  const router = useRouter();

  const [nome, setNome]       = useState("Nova Bacia de Contenção");
  const [cliente, setCliente] = useState("");
  const [local, setLocal]     = useState("");
  const [pasta, setPasta]     = useState("");
  const [modo, setModo]       = useState<"verificar" | "dimensionar">("dimensionar");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function handleCriar() {
    if (!nome.trim()) {
      setErro("Informe um nome para o projeto.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const projeto = criarProjetoBacia({ nome: nome.trim(), cliente: cliente.trim() || undefined, local: local.trim() || undefined, pasta: pasta.trim(), modo });
      await salvarProjetoBacia(projeto);
      router.push(`/bacia/${projeto.id}`);
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <section>
        <Link href="/bacia/projetos" className="text-xs text-carbono-500 hover:text-carbono-700">
          ← Bacias de Contenção
        </Link>
        <h1 className="mt-1 font-title text-3xl font-extrabold tracking-tight">
          Nova Bacia de Contenção
        </h1>
        <p className="mt-1 text-sm text-carbono-600">
          Preencha os dados básicos. Você poderá editar tudo depois.
        </p>
      </section>

      <Card title="Identificação">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="Nome do projeto"
              value={nome}
              onChange={setNome}
              placeholder="Ex.: Bacia TQ-01 / TQ-02 — Terminal Sombrio"
            />
          </div>
          <TextField
            label="Cliente"
            value={cliente}
            onChange={setCliente}
            placeholder="Razão social ou nome"
          />
          <TextField
            label="Local / Planta"
            value={local}
            onChange={setLocal}
            placeholder="Ex.: Paulínia - SP"
          />
          <div className="sm:col-span-2">
            <TextField
              label="Pasta (opcional)"
              value={pasta}
              onChange={setPasta}
              placeholder="Ex.: Terminal Sombrio"
            />
          </div>
        </div>
      </Card>

      <Card title="Modo de cálculo">
        <p className="text-sm text-carbono-600 mb-4">
          Você poderá alternar entre os modos a qualquer momento na calculadora.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setModo("dimensionar")}
            className={`rounded-lg border-2 p-4 text-left transition ${
              modo === "dimensionar"
                ? "border-verde bg-verde/10"
                : "border-carbono-200 bg-white hover:border-carbono-400"
            }`}
          >
            <p className="font-bold text-sm">🏗️ Dimensionar nova bacia</p>
            <p className="mt-1 text-xs text-carbono-500">
              Calcula as dimensões (L × W) e altura de muro necessárias para
              conter os tanques informados.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setModo("verificar")}
            className={`rounded-lg border-2 p-4 text-left transition ${
              modo === "verificar"
                ? "border-verde bg-verde/10"
                : "border-carbono-200 bg-white hover:border-carbono-400"
            }`}
          >
            <p className="font-bold text-sm">✅ Verificar bacia existente</p>
            <p className="mt-1 text-xs text-carbono-500">
              Verifica se uma bacia já construída atende ao volume requerido
              pela NBR 17505-2 §5.9.2.
            </p>
          </button>
        </div>
      </Card>

      {erro && (
        <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>
      )}

      <div className="flex gap-3">
        <Button onClick={handleCriar} disabled={salvando}>
          {salvando ? "Criando…" : "Criar projeto →"}
        </Button>
        <Link href="/bacia/projetos">
          <Button variant="secondary">Cancelar</Button>
        </Link>
      </div>
    </div>
  );
}
