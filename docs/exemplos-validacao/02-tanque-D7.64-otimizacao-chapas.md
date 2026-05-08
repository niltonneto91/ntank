# Exemplo 02 — Tanque DN 7,64 m (caso ouro do Nilton para otimização de chapas)

**Fonte:** orientação direta de Nilton (Seção 6.2 do briefing).

Caso clássico de aproveitamento ÓTIMO de chapas comerciais:

```
D  = 7,64 m
π·D = 23,9986... m
```

Com chapa de **6 m**: 23,9986 / 6 = 3,9998 → **4 chapas inteiras** (resto ≈ 1,4 mm, dentro da tolerância de 1% do comprimento).
Com chapa de **12 m**: 23,9986 / 12 = 1,9999 → **2 chapas inteiras**.

**Resultado esperado do otimizador (`avaliarAproveitamentoChapa`):**

| Comprimento da chapa | chapasInteiras | resto (m) | classificacao | chapasNecessarias | desperdicio_pct |
|----------------------|----------------|-----------|---------------|-------------------|-----------------|
| 6 m  | 3 | 5,9986 | otimo | 4 | ≈ 0 |
| 12 m | 1 | 11,9986 | otimo | 2 | ≈ 0 |

Esse caso prova a regra de Nilton: **diâmetros cuja circunferência é múltipla do comprimento da chapa devem ser priorizados pelo Modo B (sugestão de geometria por volume)**.

## Como reproduzir

```bash
node -e '
import("./packages/calc-core/dist/index.js").then(m => {
  console.log(m.avaliarAproveitamentoChapa(7.64, 6));
  console.log(m.avaliarAproveitamentoChapa(7.64, 12));
});
'
```
