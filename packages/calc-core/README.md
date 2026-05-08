# @ntank/calc-core

Núcleo de cálculo do **NTANK** (calculadora de tanques verticais cilíndricos da NTN Engenharia).

Pacote 100% TypeScript puro — sem dependências de DOM, sem efeito colateral.
Roda no Node, no navegador e em React Native.

## Status — Fase 1 (Costado)

✅ Exemplo 01 da planilha NTN passa 100% (peso ±1 kg, espessuras ±0,01 mm).

| Cálculo | Status |
|---------|--------|
| NBR 7821 simplificada (replica planilha NTN) | ✅ |
| API 650 1-Foot (item 5.6.3) | ✅ |
| API 650 VDP (item 5.6.4, iterativo) | ✅ |
| Otimizador de chapas comerciais (6 m / 12 m) | ✅ |
| Sugestão de geometrias por volume | ✅ |
| Tabela de materiais (A283-C / A36 / A516 Gr.60-65-70) | ✅ |
| Comparativo de custo entre os 3 métodos | ✅ |
| CLI JSON → JSON | ✅ |
| Memória de cálculo estruturada (alimenta PDF futuro) | ✅ |

## Como rodar os testes

```bash
cd packages/calc-core
npm install     # primeira vez apenas
npx vitest run
```

Resultado esperado: `Tests  27 passed (27)`.

## Como usar a CLI

A CLI lê um JSON de entrada e devolve um JSON com o comparativo das três variantes + recomendação:

```bash
# Compila TypeScript → JavaScript
cd packages/calc-core
npx tsc

# Roda com arquivo de entrada
node dist/cli.js ../../docs/exemplos-validacao/01-entrada.json

# Ou via stdin
echo '{ "D_mm": 11460, "H_mm": 19000, "G": 1, "CA_mm": 1.5, "larguraChapa_mm": 1500, "comprimentoChapa_mm": 6000 }' | node dist/cli.js
```

## Formato de entrada

```json
{
  "D_mm": 11460,            // diâmetro nominal (mm)
  "H_mm": 19000,            // altura nominal (mm)
  "G": 1.0,                 // densidade relativa do produto
  "CA_mm": 1.5,             // sobrespessura de corrosão (mm)
  "larguraChapa_mm": 1500,  // 1500 / 2000 / 2440
  "comprimentoChapa_mm": 6000, // 6000 / 12000
  "materialId": "A283-C",   // opcional — default A283-C
  "E": 0.85,                // opcional — eficiência de junta, default 0,85
  "custoAcoPorKg_R$": 6.5   // opcional — default R$ 6,50/kg
}
```

## API programática

```typescript
import {
  compararCostado,
  calcularCostadoNBR7821,
  calcularCostadoOneFoot,
  calcularCostadoVDP,
  avaliarAproveitamentoChapa,
  sugerirGeometriasPorVolume,
  getMaterial,
} from "@ntank/calc-core";

const resultado = compararCostado({
  D_mm: 11460,
  H_mm: 19000,
  G: 1.0,
  CA_mm: 1.5,
  larguraChapa_mm: 1500,
  comprimentoChapa_mm: 6000,
});

console.log(resultado.recomendada.resultado.pesoTotal_kg);
// → 39668.62
```

## Estrutura

```
src/
├── index.ts             — exports públicos
├── types.ts             — tipos TypeScript compartilhados
├── materiais.ts         — tabela de materiais (A283-C / A36 / A516)
├── chapas.ts            — chapas comerciais e otimizador
├── espessura-minima.ts  — espessura mínima nominal por faixa de D
├── costado/
│   ├── index.ts         — dispatcher e comparativo
│   ├── nbr-7821.ts      — método NBR 7821 simplificada
│   ├── one-foot.ts      — método API 650 1-Foot
│   └── vdp.ts           — método API 650 VDP iterativo
└── cli.ts               — CLI JSON → JSON
```
