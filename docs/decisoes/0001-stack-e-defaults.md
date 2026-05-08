# ADR 0001 — Stack tecnológico e defaults do NTANK

**Data:** 2026-05-06
**Status:** Aceito
**Autores:** Nilton Neto (NTN Engenharia) + Claude Code

---

## Contexto

Início da Fase 0 do NTANK (calculadora de tanques verticais cilíndricos para a NTN Engenharia). É necessário fixar stack, valores default, identidade visual e fontes de referência **antes** de iniciar a Fase 1 (núcleo de cálculo do costado).

Este ADR registra as 15 decisões alinhadas com Nilton em 2026-05-06, em resposta às perguntas da Seção 11 do `PROMPT.md`.

---

## Decisões

### 1. Stack tecnológico
- **Frontend:** Next.js 15 + React + TypeScript, entregue como **PWA** (instalável em Android/iOS via navegador).
- **Cálculo:** 100% client-side em **TypeScript puro**, isolado em `packages/calc-core` para ser portável e auditável.
- **Persistência:** **IndexedDB** local (via `idb`); sem backend no MVP.
- **Estilo:** Tailwind CSS + variáveis CSS para paleta NTN.
- **Geração de PDF:** `@react-pdf/renderer` (componentes React → PDF, integra direto com a memória de cálculo estruturada).
- **Monorepo:** `npm workspaces` (nativo no Node 24, sem dependências externas como pnpm).

**Por quê:** uma única base de código entrega web + mobile, custo zero de backend, funciona offline, e o `calc-core` em TypeScript puro pode ser portado para um app nativo no futuro se necessário.

### 2. Materiais iniciais (a confirmar Sd/St com Nilton na Fase 2)
Cadastro inicial usando valores típicos de literatura técnica (ASME Sec. II Part D para uso em equivalentes nacionais):

| Material   | Sd (MPa) | St (MPa) | Observação |
|------------|----------|----------|------------|
| ASTM A283-C | 137      | 154      | Aço estrutural baixo carbono |
| ASTM A36    | 160      | 171      | Aço estrutural geral |
| ASTM A516 Gr.60 | 160  | 171      | Aço para vasos pressão (média temp) |
| ASTM A516 Gr.65 | 173  | 195      | Aço para vasos pressão (média temp) |
| ASTM A516 Gr.70 | 188  | 208      | Aço para vasos pressão (média temp) |

> **Pendência Fase 2:** Nilton revisa e ajusta valores conforme prática NTN.

### 3. Eficiência de junta (E)
- **Default:** 0,85 (radiografia parcial — caso usual).
- **Editável pelo usuário** — opções típicas: 0,70 / 0,85 / 1,00.

### 4. Espessura mínima nominal por diâmetro
Implementar a **regra paramétrica da prática usual** (sem reproduzir texto da norma) — a tabela vem da prática API 650 sem citar trechos:

| Diâmetro nominal D | Espessura mínima |
|--------------------|------------------|
| D < 15 m           | 5 mm (3/16") |
| 15 ≤ D < 36 m      | 6 mm (1/4") |
| 36 ≤ D < 60 m      | 8 mm (5/16") |
| D ≥ 60 m           | 10 mm (3/8") |

A função aplicará `max(t_calc, t_min_nominal)` na espessura adotada.

### 5. Custo do aço (R$/kg) — default
- **R$ 6,50/kg** (parametrizável na UI; será editável pelo usuário a cada projeto).

### 6. Exemplos de validação
- **Fonte:** planilha `CALCULO DE TANQUES.xlsx` em `OneDrive-Pessoal/NTN ENGENHARIA/CÁLCULOS/PLANILHAS/`.
- Extraído primeiro caso completo em `docs/exemplos-validacao/01-tanque-1960m3-NBR7821.md`.
- Outras planilhas potencialmente úteis na mesma pasta: `PLANILHA CÁLCULO DE TETO.xlsx`, `Tabela Peso TQs. API.xlsx`.

### 7. Bocais — sugestão automática mínima por norma

**No teto:**
- Boca de visita
- Escotilha de medição manual
- Medidor de nível eletrônico
- Sensor de temperatura
- Sensor de transbordo
- Bocal da VPV (válvula de pressão e vácuo)

**No costado:**
- Bocas de visita (manholes)
- Bocal de entrada (recebimento de produto)
- Bocal de saída (despacho de produto)
- Saída baixa
- Saída da bacia de dreno (dreno do fundo)

### 8. Flanges — base de dados
- Fonte: tabelas dimensionais e de massa **ASME B16.5** (compilação própria a partir de catálogos de fornecedor — não copiar texto da norma).
- Faixa MVP: DN 1" a 24", classes 150# e 300#.
- Tipos: Welding Neck (WN), Slip-On (SO), Socket Weld (SW), Blind (BL).
- Faces: Raised Face (RF), Flat Face (FF), Ring-Type Joint (RTJ).

### 9. Escadas, plataformas e guarda-corpos — perfis default
- **Longarina:** UDC 200×75×8
- **Piso de plataforma:** chapa xadrez 3/16" ou grade Gradil 30×3
- **Guarda-corpo:** tubo Sch 40 1.1/4" (altura 1,10 m, travessão 0,55 m, rodapé 0,20 m — NR-12)
- **Degraus:** chapa xadrez ou cantoneira (passo 210 mm, h calculado por ângulo)
- **Ângulo escada:** máximo 50° (default 50°)
- **Largura degrau:** 750 mm

### 10. Sobrespessura de corrosão (CA)
- **Default:** 1,5 mm.
- **Editável** pelo usuário por projeto.
- Faixa típica: 1,5 a 3,0 mm.

### 11. Tipos de teto no MVP
**Três** tipos (dome suportado fora do MVP):
1. Cônico autoportante
2. Cônico suportado (com vigas)
3. Dome autoportante

### 12. Hospedagem
- **Subdomínio:** `ntank.ntnengenharia.com.br` (a apontar para Vercel ou serviço equivalente).
- Deploy automático a cada push para `main` na fase de produção.

### 13. Logo NTANK
- **Arquivo:** `APP CALCULO/NTANK LOGO.PNG` (fornecido por Nilton — 785 KB).
- Será embarcado nos componentes de UI (cabeçalho, splash, capa do PDF).
- Identidade visual segue paleta NTN (verde `#ADD91C` + preto `#000000`).

### 14. Tipografia
- **Títulos:** Exo 2 Bold (Google Fonts — fallback web da Andromeda Bold).
- **Corpo:** system-ui (fallback de Segoe UI Symbol).
- Fonte embarcada via `next/font` na PWA (sem flash de fonte e sem dependência de CDN externa).

### 15. Renomear pasta-raiz
- `APP CALCULO/` → `NTANK/` no **fim da Fase 1** (depois que o cálculo do costado estiver validado e testado).
- Motivo de adiar: evitar invalidar o working directory durante o desenvolvimento da Fase 1. A renomeação é uma operação trivial no fim.

---

## Defaults consolidados (cheat-sheet)

| Parâmetro | Default | Editável? |
|-----------|---------|-----------|
| Material das chapas | A516 Gr.60 | sim |
| Eficiência de junta E | 0,85 | sim |
| CA (corrosão) | 1,5 mm | sim |
| Largura da chapa | 2.000 mm | sim (1.500 / 2.000 / 2.440) |
| Comprimento da chapa | 6.000 mm | sim (6.000 / 12.000) |
| Densidade G | 1,0 g/cm³ | sim (≥ 0,1) |
| Custo do aço | R$ 6,50/kg | sim |
| Ângulo da escada | 50° | sim (≤ 50°) |
| Passo dos degraus | 210 mm | sim |
| Largura do degrau | 750 mm | sim |
| Altura guarda-corpo | 1.100 mm | parametrizável (NR-12 ≥ 1.050 mm) |
| Tipo de fundo default | Cônico para centro | sim |
| Tipo de teto default | Cônico autoportante | sim |

---

## Consequências

- O `calc-core` é a peça mais crítica: precisa de testes contra a planilha já na Fase 1.
- A regra de espessura mínima nominal e os valores de Sd/St ficam parametrizados em arquivos de configuração (não hardcoded), para Nilton ajustar sem precisar mexer em código.
- A renomeação da pasta no fim da Fase 1 é a única "ação destrutiva" pendente — o resto é aditivo.

---

## Próximos passos

1. Criar `docs/exemplos-validacao/01-tanque-1960m3-NBR7821.md` com o exemplo completo da planilha.
2. Estruturar `packages/calc-core/` com TypeScript + Vitest.
3. Implementar tabelas (materiais, chapas comerciais, espessura mínima).
4. Implementar otimizador de chapas comerciais.
5. Implementar NBR 7821 (replicar planilha bit a bit).
6. Implementar API 650 1-Foot.
7. Implementar API 650 VDP.
8. CLI de validação (JSON in / JSON out).
9. Testes de regressão contra `01-tanque-1960m3`.
