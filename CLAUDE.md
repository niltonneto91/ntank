# CLAUDE.md — NTANK (Calculadora de Tanques NTN)

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste projeto. As instruções aqui **complementam** o `CLAUDE.md` da pasta raiz `NTN ENGENHARIA/` (identidade visual, tom de voz, normas técnicas e contexto institucional). Em caso de conflito, este arquivo prevalece para o escopo do APP.

---

## Visão Geral do Projeto

**Nome comercial:** **NTANK**
**Pasta-raiz atual:** `APP CALCULO/` (pode ser renomeada para `NTANK/` no início da Fase 1)
**Tipo:** Aplicativo **mobile + web** (multiplataforma — PWA na primeira entrega)
**Público-alvo:** Engenheiros, projetistas e profissionais que dimensionam tanques de armazenamento de líquidos (combustíveis, derivados de petróleo, líquidos inflamáveis e químicos a granel).
**Idioma da interface e dos documentos:** Português brasileiro (PT-BR).

### Objetivo

Desenvolver o **NTANK**, calculadora de tanques que, a partir de parâmetros básicos de entrada (diâmetro, altura, volume desejado, produto armazenado, densidade etc.), retorne o **dimensionamento completo do tanque** — fundo, costado, teto, bocais e reforços, flanges, escadas, plataformas e guarda-corpos — segundo as normas:

- **API 650** — *Welded Tanks for Oil Storage* (último standard adotado).
- **ABNT NBR 7821** — *Tanques soldados para armazenamento de petróleo e derivados*.
- **ASME B16.5** — Flanges (especificação por DN/classe).
- **NR-12 / NR-35** — Verificação dimensional de escadas, plataformas e guarda-corpos.

O NTANK executa **todos os métodos de cálculo aplicáveis em paralelo** e recomenda a **solução de menor custo de construção** com base no peso de aço resultante. Gera **memória de cálculo completa** (passo a passo, fórmulas, parâmetros adotados, referência normativa) — equivalente a um caderno técnico que pode ser anexado a um projeto/dossiê de fabricação.

---

## Funcionalidades Núcleo (MVP)

### Entrada flexível (3 modos)
- **Modo A — Geometria conhecida:** D + H → volume nominal e útil.
- **Modo B — Volume desejado:** volume → lista de combinações (D, H) viáveis, **priorizando aproveitamento de chapas comerciais** (ver "Otimização de chapas" abaixo).
- **Modo C — Volume + restrição:** volume + restrição em um eixo (ex.: H máx) → combinações filtradas.

### Parâmetros de dimensionamento
- Produto, densidade relativa (G), CA, material, eficiência de junta (E), temperatura
- Largura (1.500 / 2.000 / 2.440 mm) e comprimento (6.000 / 12.000 mm) da chapa
- Tipo de fundo, tipo de teto, lista dinâmica de bocais, escadas e plataformas

### Componentes calculados
1. **Costado:** 1-Foot (API 650 5.6.3), VDP (API 650 5.6.4), NBR 7821; varredura por largura de chapa e material.
2. **Fundo:** espessura mínima por área e por borda, anel anular.
3. **Teto:** cônico autoportante, cônico suportado, dome autoportante, dome suportado.
4. **Bocais e reforços:** API 650 item 5.7 — área de reforço, espessura do pescoço, anel de reforço; calcular por dois métodos e adotar o mais econômico que atenda.
5. **Flanges:** seleção por DN/classe ASME B16.5; massa por catálogo.
6. **Escadas, plataformas e guarda-corpos:** geometria, peso estimado por perfis comerciais, conformidade dimensional NR-12 / NR-35.

### Otimização de chapas comerciais (regra crítica)
Chapas comerciais têm comprimento de **6 m ou 12 m**. O app prioriza diâmetros cuja **circunferência (π × D)** seja:
- Múltipla exata de 6 m ou 12 m (aproveitamento ótimo). *Exemplo: DN 7,64 m → π × D ≈ 24,0 m → 4 chapas de 6 m, ou 2 chapas de 12 m.*
- Ou múltipla de 6/12 m + uma chapa adicional de 2 a 4 m (aproveitamento bom).

### Comparativo automático e recomendação
O app executa **todas as variantes em paralelo**, calcula massa de aço por componente e custo total (R$/kg parametrizável), e destaca a **"Melhor custo-benefício"** (menor custo; empate desempatado por melhor aproveitamento de chapas). Usuário pode aceitar ou escolher manualmente outra variante.

### Saídas
- Tabela de espessuras por componente
- Massa de aço discriminada (costado, fundo, teto, bocais, flanges, escadas, plataformas, guarda-corpos) e total
- **Lista de chapas a comprar** (lista de corte)
- **Lista de bocais** (TAG, DN, classe, posição)
- **Memória de cálculo em PDF** com identidade NTANK/NTN, capa, sumário, passo a passo por componente, referências normativas (apenas item/seção)

### Persistência
Local (IndexedDB) — sem backend no MVP.

---

## Funcionalidades Futuras (Backlog)

- Verificação de **vento e sismo** (estabilidade global)
- **Selo flutuante** e **teto flutuante**
- **Bacia de contenção** (NBR 17505)
- **Reserva de incêndio** (NBR 17505 / NFPA 11 / NFPA 30)
- **Venting atmosférico** (API 2000)
- Re-rating de tanques existentes (**API 653**)
- Multi-usuário, autenticação, sincronização em nuvem
- Internacionalização (EN/ES)
- Geração de **desenhos 2D (DWG/DXF)** ou modelo 3D
- Integração com **AutoCAD Plant3D**

---

## Normas Técnicas de Referência

> **IMPORTANTE — Direitos autorais:** As normas técnicas (API 650, NBR 7821, NBR 17505, API 653, API 2000 etc.) são **documentos protegidos por copyright**. NÃO reproduzir tabelas, textos ou fórmulas integrais nos arquivos de código, comentários, base de dados ou interface. **Permitido:** referenciar item/seção (ex.: "API 650, 5.6.3.2"), implementar a fórmula matemática (não há copyright em fórmulas físicas), e citar até **1 trecho curto (< 15 palavras)** entre aspas quando estritamente necessário.

| Norma | Aplicação |
|---|---|
| **API 650** | Tanques verticais cilíndricos soldados, baixa pressão, armazenamento de petróleo e derivados |
| **NBR 7821** | Tanques soldados para armazenamento de petróleo e derivados (referência nacional) |
| **NBR 17505** | Armazenamento de líquidos inflamáveis e combustíveis (bacia, distâncias, classificação) |
| **API 653** | Inspeção, reparo, alteração e reconstrução de tanques |
| **API 2000** | Venting atmosférico e em condições anormais |
| **ASME Sec. II Part D** | Propriedades mecânicas e tensões admissíveis dos materiais |

Os cálculos do APP devem ser **rastreáveis** à norma — cada resultado deve indicar a equação e o item da norma que originou o número.

---

## Stack Tecnológico (a definir em conjunto com Nilton)

Decisões pendentes — confirmar antes de iniciar codificação:

- **Frontend mobile:** React Native, Flutter ou PWA?
- **Frontend web:** Next.js, React + Vite ou outro?
- **Backend:** API em Node.js/TypeScript, Python (FastAPI), ou cálculos 100% client-side?
- **Persistência:** Firebase, Supabase, Postgres self-hosted, ou local (IndexedDB/SQLite)?
- **Geração de PDF:** server-side (Puppeteer/WeasyPrint) ou client-side (jsPDF/pdfmake)?
- **Autenticação:** anônimo, Google/Microsoft SSO, ou e-mail/senha?

**Recomendação inicial (sujeita a revisão):** PWA com Next.js + TypeScript, cálculo client-side (TypeScript puro, testável), persistência em IndexedDB para offline, geração de PDF com jsPDF — entrega web e mobile com base de código única, sem custo de backend.

---

## Identidade Visual

Seguir a identidade da NTN Engenharia (definida no CLAUDE.md raiz):

- **Verde primário:** `#ADD91C` (PANTONE 2291 C)
- **Preto:** `#000000`
- **Fundos:** `#ECECE3` / `#FFFFFF`
- **Títulos:** Andromeda Bold (fallback: sans-serif geométrica em peso 700)
- **Corpo:** Segoe UI Symbol Regular (fallback: system-ui)
- **Logos:** `logotipo-novo-ntn-03.png` e `logotipo-novo-ntn-05.png` (na pasta raiz)

A interface deve transmitir **robustez técnica e clareza** — nada de visual genérico de SaaS. Pensar em "ferramenta de engenheiro de campo": legível em tablet em obra, contraste alto, números grandes.

---

## Engenharia de Software — Diretrizes

### Qualidade do cálculo é prioridade absoluta
- Todo cálculo normativo deve ter **teste unitário** validando contra um exemplo conhecido (ex.: exemplo trabalhado da própria norma ou de literatura técnica).
- Tolerância numérica esperada: ±0,1 mm na espessura final.
- Nunca arredondar prematuramente — manter precisão dupla até a apresentação final.
- Unidades: SI internamente (m, mm, kg, kPa). Conversões só na fronteira de UI.

### Estrutura de cálculo
- Separar **camada de cálculo puro** (funções determinísticas, sem efeito colateral) da **camada de UI**.
- Cada função de cálculo recebe um objeto de entrada validado e retorna `{ valor, unidade, fórmula, referenciaNormativa, parâmetros }` para alimentar a memória de cálculo.

### Validação de entradas
- Diâmetro, altura e densidade > 0
- Faixas plausíveis (ex.: D entre 1 m e 100 m) com aviso amarelo (não bloqueante) para fora da faixa
- Material com tensões admissíveis carregadas de tabela interna de materiais comuns

### Não introduzir
- Telemetria que envie dados de projeto do usuário sem consentimento explícito
- Bibliotecas de cálculo de terceiros sem auditoria — o cálculo normativo deve ser auditável e nosso

---

## Estrutura de Pastas (sugerida)

```
APP CALCULO/
├── CLAUDE.md                  (este arquivo)
├── docs/                      Documentação técnica e de produto
│   ├── normas/                Resumos internos de aplicação das normas (NÃO copiar trechos)
│   ├── exemplos/              Exemplos de cálculo validados (entrada → saída esperada)
│   └── decisoes/              ADRs (Architecture Decision Records)
├── apps/
│   ├── web/                   Frontend web
│   └── mobile/                Frontend mobile (se diferente do web)
├── packages/
│   ├── calc-core/             Núcleo de cálculo (TypeScript puro, alvo de testes)
│   ├── materiais/             Base de materiais e tensões admissíveis
│   └── ui/                    Componentes visuais compartilhados
└── tests/                     Testes de integração / E2E
```

A estrutura final será definida quando o stack for escolhido.

---

## Idioma e Localização

- **Interface, documentação, comentários de código e mensagens de commit:** português brasileiro.
- **Identificadores no código (variáveis, funções, classes):** inglês técnico, exceto termos sem tradução consolidada (ex.: `costado`, `casco`).
- **Memória de cálculo gerada:** PT-BR.
- Considerar suporte futuro a inglês para clientes internacionais (estrutura de i18n desde o início).

---

## Documentos e Entregáveis

- Memórias de cálculo finais: **PDF**, com cabeçalho NTN.
- Documentação técnica do produto: **Markdown** em `docs/`.
- Apresentações comerciais do APP (quando houver): **.pptx** seguindo a identidade NTN.
- Salvar entregáveis nesta pasta (`APP CALCULO/`).

---

## Próximos Passos

O ponto de partida operacional é o arquivo `PROMPT.md` desta pasta — ele contém o briefing completo (15 perguntas de alinhamento + plano de 7 fases) que deve ser colado em uma nova sessão do Claude Code para iniciar o desenvolvimento.

Ordem recomendada:
1. Confirmar stack, defaults e renomear pasta para `NTANK/` (Fase 0).
2. Implementar núcleo de cálculo do costado em `calc-core` com testes (Fase 1).
3. UI web NTANK PWA com costado funcionando ponta a ponta (Fase 2).
4. Fundo e teto (Fase 3).
5. Bocais, reforços e flanges (Fase 4).
6. Escadas, plataformas e guarda-corpos (Fase 5).
7. PDF da memória de cálculo completa (Fase 6).
8. Polimento e instalação como PWA mobile (Fase 7).
