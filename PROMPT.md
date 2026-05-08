# Prompt para Claude Code — NTANK (Calculadora de Tanques NTN)

> Cole o conteúdo abaixo (a partir da linha "---") em uma nova sessão do Claude Code, dentro da pasta `APP CALCULO/`. O agente vai ler o `CLAUDE.md` desta pasta automaticamente e usá-lo como contexto.

---

## 1. Contexto e seu papel nesta sessão

Você é um engenheiro de software sênior trabalhando junto com **Nilton Neto**, engenheiro mecânico com 15+ anos em armazenamento de combustíveis e sócio-fundador da **NTN Engenharia** (empresa especializada em bases e terminais de combustíveis). O `CLAUDE.md` desta pasta tem o contexto completo do projeto, identidade visual e diretrizes — leia-o antes de qualquer coisa.

Nilton é o **dono do domínio técnico**: as fórmulas, normas e regras de engenharia vêm dele e devem ser confirmadas com ele em caso de dúvida. Você é o dono da **execução de software**: arquitetura, código, testes, UX, performance.

**Antes de começar a codificar, faça as perguntas listadas na Seção 11.** Não invente decisões de stack, escopo ou fórmulas sem alinhar.

---

## 2. Missão

Construir um aplicativo **web + mobile** chamado **NTANK** que dimensiona tanques verticais cilíndricos de armazenamento de líquidos segundo **API 650** e **NBR 7821**. O NTANK calcula **fundo, costado, teto, bocais, reforços, flanges, escadas, plataformas e guarda-corpos**, executa **todos os métodos de cálculo previstos pelas normas em paralelo** e recomenda a solução de **menor custo de construção** com base no peso de aço resultante. Ao final, gera uma **memória de cálculo completa** rastreável a cada item normativo aplicado.

**Nome comercial:** NTANK
**Razão de existir:** padronizar e acelerar o dimensionamento de tanques na NTN Engenharia, evitando retrabalho de planilhas e garantindo conformidade normativa rastreável em cada projeto.

---

## 3. Fluxo do usuário (UX que você deve implementar)

### Etapa 1 — Definição da geometria base (entrada flexível)

O usuário escolhe **um dos três modos de entrada**:

- **Modo A — Geometria conhecida:** informa diâmetro (D) e altura (H) → app calcula volume nominal e volume útil.
- **Modo B — Volume desejado:** informa volume (m³) → app retorna uma **lista de combinações (D, H) viáveis**, priorizando diâmetros que otimizam o uso de chapas comerciais (ver Seção 6.2). O usuário seleciona uma combinação para seguir.
- **Modo C — Volume + restrição:** informa volume e fixa um dos eixos (ex.: "altura máxima 12 m por restrição de bombeiros") → app retorna combinações viáveis com a restrição respeitada.

### Etapa 2 — Parâmetros de dimensionamento

Após a geometria estar definida, o app pergunta os parâmetros de cálculo. Cada campo deve ter **valor sugerido (default) com base em prática usual** e tooltip com a referência normativa:

**Bloco 1 — Costado e materiais:**
- Produto armazenado e densidade relativa (G)
- Sobrespessura de corrosão — CA (mm)
- Material das chapas (lista: A283-C, A36, A516-Gr.60/65/70, equivalentes nacionais)
- Largura das chapas do costado (default: 2.000 mm; opções: 1.500 / 2.000 / 2.440 mm)
- Comprimento das chapas (default: 6.000 mm; opções: 6.000 / 12.000 mm)
- Eficiência de junta — E (default: 0,85 ou 1,0 conforme inspeção radiográfica)
- Temperatura de projeto

**Bloco 2 — Fundo e teto:**
- Tipo de fundo (plano com anel anular, cônico para centro, cônico para periferia)
- Tipo de teto (cônico autoportante, cônico suportado, dome autoportante, dome suportado)
- Inclinação do teto

**Bloco 3 — Bocais e flanges (lista dinâmica):**
- Adicionar/remover linhas; cada linha tem: TAG, função (entrada produto, saída produto, dreno, vent, manhole, instrumentação), diâmetro nominal (DN), classe de pressão (150# / 300#), elevação na parede ou no teto, tipo de flange (WN, SO, SW, blind), face (RF/FF/RTJ).
- O app sugere automaticamente os bocais mínimos por norma (ex.: vent, dreno, manhole no costado e no teto).

**Bloco 4 — Acessórios:**
- Escada: tipo (helicoidal externa, marinheiro vertical), largura, ângulo (helicoidal).
- Plataformas: lista (topo, intermediárias) com cota e largura.
- Guarda-corpos: por plataforma e ao longo da escada (NR-12 / NR-35 — altura mínima, travessão intermediário, rodapé).
- Boca de visita lateral (manhole): cota e DN.

### Etapa 3 — Cálculo em paralelo de todas as variantes normativas

O app executa **todos os métodos aplicáveis** (Seção 6.3) e apresenta um **comparativo** com:

- Espessura por anel do costado (mm)
- Espessura do fundo, anel anular e teto (mm)
- Massa total de aço discriminada por componente (costado, fundo, teto, bocais, flanges, escadas, plataformas, guarda-corpos) (kg)
- Custo estimado de construção (kg × R$/kg de aço, com R$/kg parametrizável)
- Aproveitamento de chapas comerciais no costado (% de desperdício)
- Recomendação destacada: **"Melhor custo-benefício"**

### Etapa 4 — Detalhamento da solução escolhida

O usuário pode:
- Aceitar a recomendação ou escolher manualmente outra variante
- Ver **todos os cálculos** (passo a passo, fórmulas substituídas, item normativo) de qualquer variante e qualquer componente
- Editar parâmetros e recalcular

### Etapa 5 — Geração da memória de cálculo

Exporta um PDF com:
- Capa com identidade NTN (logo, cores, dados do projeto)
- Sumário
- Dados de entrada
- Memória de cálculo passo a passo, organizada por componente:
  1. Fundo
  2. Costado (anel por anel)
  3. Teto
  4. Bocais e reforços (cada bocal com seu cálculo de reforço)
  5. Flanges (especificação por bocal)
  6. Escadas, plataformas e guarda-corpos
- Tabela resumo de espessuras adotadas
- Tabela de chapas comerciais a comprar (lista de corte)
- Massa total de aço por componente e total geral
- Lista de bocais com TAG, DN, classe, posição
- Referências normativas (apenas item/seção, **não reproduzir texto das normas**)
- Assinatura/responsável técnico

---

## 4. Escopo MVP (primeira entrega completa)

Implementar **na ordem** abaixo, com testes para cada item:

1. **Núcleo de cálculo do costado** (`calc-core`):
   - Método 1-Foot (API 650, item 5.6.3)
   - Método Variable-Design-Point — VDP (API 650, item 5.6.4)
   - Método análogo NBR 7821
   - Otimizador de chapas comerciais (Seção 6.2)
   - Estimador de massa do costado
2. **Cálculo do fundo** — espessura mínima por área e por borda, anel anular
3. **Cálculo do teto** — cônico autoportante, cônico suportado, dome autoportante e suportado
4. **Cálculo de bocais e reforços** (API 650, item 5.7) — área de reforço requerida, espessura do pescoço, dimensões do anel de reforço
5. **Especificação de flanges** — seleção por DN/classe segundo ASME B16.5; cálculo de massa
6. **Escadas, plataformas e guarda-corpos** — geometria, peso estimado, conformidade dimensional com NR-12 / NR-35 (altura mínima de guarda-corpo, espaçamento de degraus)
7. **UI web** (PWA responsiva — funciona em mobile via navegador)
8. **Geração de PDF da memória de cálculo** com todos os componentes
9. **Persistência local** dos projetos do usuário (IndexedDB)

---

## 5. Fora do escopo MVP (backlog explícito)

Não implementar agora; mencionar no roadmap:

- Verificação de vento e sismo (estabilidade global do tanque)
- Selo flutuante e teto flutuante
- Bacia de contenção (NBR 17505)
- Reserva de incêndio (NBR 17505 / NFPA 11 / NFPA 30)
- Re-rating de tanques existentes (API 653)
- Cálculo de venting atmosférico (API 2000)
- Multi-usuário, autenticação, sincronização em nuvem
- Internacionalização (EN/ES)
- Geração de desenhos 2D (DWG/DXF) ou modelo 3D
- Integração com AutoCAD Plant3D

---

## 6. Lógica de cálculo — detalhes que NÃO são opcionais

### 6.1 Entradas e validação
- Unidades **SI** internamente (m, mm, kg, Pa, N).
- Conversões só na fronteira da UI.
- Diâmetro, altura, densidade > 0.
- Avisos amarelos (não bloqueantes) para valores fora de faixa usual: D < 1 m ou D > 100 m, H < 1 m ou H > 25 m.

### 6.2 Otimização de chapas comerciais (regra crítica de Nilton)

Chapas comerciais de costado têm **comprimento padrão de 6 m ou 12 m**. O app deve **priorizar diâmetros cuja circunferência (π × D) seja múltipla de 6 m ou 12 m, ou múltipla de 6/12 m + uma chapa adicional de 2 a 4 m**.

Exemplo de Nilton: **DN 7,64 m → π × D ≈ 24,0 m → 4 chapas de 6 m, ou 2 chapas de 12 m** (aproveitamento ótimo, zero desperdício).

Implementar:

```
chapasNecessarias(D, comprimentoChapa):
  C = π × D
  n_inteiras = floor(C / comprimentoChapa)
  resto = C - (n_inteiras × comprimentoChapa)
  if resto == 0: aproveitamento ótimo
  elif 2 <= resto <= 4: aproveitamento bom (chapa adicional comercializável)
  else: aproveitamento ruim (desperdício > tolerável)
```

No **Modo B** (volume → geometrias), o ranking das combinações (D, H) deve favorecer:
1. Aproveitamento ótimo de chapas (prioridade máxima)
2. Aproveitamento bom (resto entre 2 e 4 m)
3. Menor altura total (mais estável, mais fácil de construir)
4. Razão H/D entre 0,5 e 1,5 (faixa de boa prática)

### 6.3 Métodos de cálculo a executar em paralelo

Para cada projeto, calcular **todas as variantes aplicáveis** e comparar:

- **API 650 — Método 1-Foot** (válido para D ≤ 60 m e t ≤ 12,5 mm)
- **API 650 — Método VDP** (válido para D > 60 m ou quando 1-Foot não atende)
- **NBR 7821 — método correspondente**
- **Variação por largura de chapa** (1.500, 2.000, 2.440 mm) — cada largura altera o número de anéis e potencialmente a massa total
- **Variação por material** (se Nilton quiser permitir comparação entre A283-C e A516-Gr.65, por exemplo)

Cada variante produz: vetor de espessuras por anel, massa do costado, custo estimado.

Para **bocais**, calcular o reforço por **dois métodos** (área de reforço por substituição e diâmetro mínimo de chapa de reforço) e adotar o mais econômico que atenda à norma.

### 6.4 Cálculo de peso e custo

- **Peso do costado:** somatório por anel de (espessura × largura × circunferência × densidade do aço 7.850 kg/m³).
- **Peso do fundo:** área do fundo × espessura × 7.850, mais anel anular se aplicável.
- **Peso do teto:** área da superfície × espessura × 7.850 + estrutura de sustentação (estimativa por tabela paramétrica).
- **Peso de bocais e flanges:** soma do pescoço (DN, espessura, comprimento) + flange (massa tabelada por DN/classe ASME B16.5) + reforço (anel calculado).
- **Peso de escadas e plataformas:** estimativa paramétrica por geometria (longarinas, degraus, piso de plataforma, guarda-corpo) — perfis comerciais comuns (cantoneiras, chapa expandida, tubo Sch 40).
- **Custo de construção:** massa total × R$/kg (parametrizável; default editável).
- A **variante recomendada** é a de **menor custo total**, com empate desempatado por **maior aproveitamento de chapas**.

### 6.5 Memória de cálculo — formato

Cada cálculo retornado pelo `calc-core` é um objeto:

```ts
{
  componente: "costado-anel-1",
  metodo: "API 650 - 1-Foot",
  itemNorma: "API 650, 5.6.3.2",
  formula: "td = (4.9 × D × (H − 0.3) × G) / (Sd × E) + CA",
  parametros: { D: 7.64, H: 12.0, G: 0.85, Sd: 137, E: 0.85, CA: 1.5 },
  substituicao: "td = (4.9 × 7.64 × (12.0 − 0.3) × 0.85) / (137 × 0.85) + 1.5",
  resultado: { valor: 4.62, unidade: "mm" },
  espessuraAdotada: { valor: 6.35, unidade: "mm", justificativa: "espessura mínima nominal por diâmetro" }
}
```

Esse formato vale para **todos os componentes** (fundo, teto, bocais, reforços, flanges, escadas) — alimenta tanto a UI quanto o gerador de PDF, e é a **base da rastreabilidade normativa**.

---

## 7. Restrições inegociáveis

### Copyright das normas
**Não reproduzir** tabelas, texto integral ou figuras de API 650, NBR 7821, ASME B16.5 ou qualquer norma. Permitido:
- Implementar fórmulas matemáticas (não há copyright em equações físicas).
- Citar item/seção da norma (ex.: "API 650, 5.6.3.2").
- Citação curta (< 15 palavras) entre aspas, **só quando estritamente necessário**.
- Tabelas internas de propriedades de materiais e flanges devem usar dados de catálogo de fornecedor ou compilação própria — **nunca cópia direta da norma**.

### Idioma
- Interface, comentários, mensagens de commit, documentação: **português brasileiro**.
- Nomes de variáveis, funções, classes: **inglês técnico**, exceto termos sem tradução consolidada (`costado`, `casco`, `bocal`).

### Identidade visual
Seguir o `CLAUDE.md` raiz da NTN: verde `#ADD91C`, preto, fontes Andromeda/Segoe UI, logos disponíveis. UI deve transmitir **robustez técnica**, não SaaS genérico. Pensar em "ferramenta de engenheiro em obra": legível em tablet, contraste alto, números grandes.

A marca **NTANK** deve aparecer com proeminência: tela de abertura, cabeçalho da UI, capa do PDF, splash do PWA. Se Nilton não tiver logo dedicado do NTANK, criar um placeholder que combine com a identidade NTN (verde + preto + tipografia Andromeda) até que a versão final seja entregue.

### Privacidade
Nenhum dado de projeto do usuário sai do dispositivo no MVP — persistência **100% local** (IndexedDB). Sem telemetria sem consentimento explícito.

---

## 8. Stack tecnológico (recomendação — confirme com Nilton)

**Recomendação inicial:** PWA com **Next.js 15 + React + TypeScript**, cálculo 100% client-side em TypeScript puro (testável e portável), persistência em **IndexedDB** via `idb`, geração de PDF com **`@react-pdf/renderer`** (componentes React → PDF, integra bem com a memória de cálculo estruturada), estilo com **Tailwind CSS** + variáveis CSS para a paleta NTN.

**Por quê:**
- Uma única base de código entrega web e mobile (PWA instalável no celular).
- Cálculo client-side = sem custo de backend no MVP, e funciona offline.
- TypeScript puro no `calc-core` = portável para futuro app nativo se necessário.
- `@react-pdf/renderer` permite controlar tipografia e identidade visual com precisão.

**Alternativas a discutir** se Nilton preferir:
- **Flutter** se o objetivo principal for app nativo iOS/Android com loja.
- **React Native + Next.js** com monorepo se houver demanda de funcionalidades de hardware (câmera, GPS de obra).

### Estrutura de pastas (monorepo simples com pnpm workspaces)

```
APP CALCULO/
├── apps/
│   └── web/                    Next.js (PWA) — produto NTANK
├── packages/
│   ├── calc-core/              Cálculos em TypeScript puro (alvo dos testes)
│   ├── materiais/              Tabela de materiais (A36, A516, etc.)
│   ├── flanges/                Tabela de flanges ASME B16.5 (massa por DN/classe)
│   └── ui/                     Componentes visuais NTN reutilizáveis
├── docs/
│   ├── exemplos-validacao/     Casos de teste com entrada e saída esperada
│   └── decisoes/               ADRs (Architecture Decision Records)
├── package.json
└── pnpm-workspace.yaml
```

A pasta-raiz hoje se chama `APP CALCULO/` por motivos históricos. Se Nilton quiser, renomear para `NTANK/` na primeira fase é trivial — perguntar antes de mover.

---

## 9. Qualidade — critérios de aceite

- **Cálculo:** cada função normativa em `calc-core` tem teste unitário com entrada e saída validadas contra exemplo conhecido (Nilton fornecerá pelo menos 2 exemplos trabalhados antes do início). Tolerância: ±0,1 mm na espessura final.
- **UI:** responsiva (mobile-first), acessível (Lighthouse Acessibilidade ≥ 90), funciona offline após o primeiro carregamento.
- **PDF:** gera em < 5 segundos para um tanque completo (6 anéis + fundo + teto + 8 bocais + escada + 2 plataformas). Visualmente limpo, com identidade NTN/NTANK, sem perda de dados do cálculo.
- **Estabilidade:** TypeScript em modo `strict`. Zero `any` no `calc-core`. ESLint + Prettier configurados.
- **Performance:** cálculo de uma variante (tanque completo) < 200 ms. Comparativo de 6 variantes < 1 s.
- **Documentação:** cada função pública em `calc-core` tem JSDoc com referência ao item normativo.

---

## 10. Plano de fases (entregáveis sequenciais)

**Fase 0 — Alinhamento (antes de codificar):**
- Confirmar stack com Nilton.
- Receber exemplos trabalhados de cálculo (costado, fundo, teto, bocal) para regressão.
- Definir tabela inicial de materiais e tensões admissíveis.
- Decidir se a pasta-raiz será renomeada para `NTANK/`.

**Fase 1 — Núcleo de cálculo do costado + testes:**
- Implementar 1-Foot, VDP e NBR 7821 em `calc-core`.
- Implementar otimizador de chapas comerciais.
- Estimador de massa do costado.
- Testes unitários verdes.
- *Entregável:* CLI ou script Node que recebe JSON de entrada e devolve JSON de saída — Nilton valida.

**Fase 2 — UI web NTANK (PWA):**
- Telas de entrada (modos A/B/C), parâmetros do bloco 1, comparativo de variantes do costado, detalhes, exportação parcial.
- Persistência em IndexedDB.
- Identidade visual NTANK aplicada.
- *Entregável:* link de produção (Vercel ou domínio NTN) que Nilton consegue usar de verdade no costado.

**Fase 3 — Fundo e teto:**
- Cálculo de fundo (espessura, anel anular).
- Cálculo de teto (cônico autoportante, cônico suportado, dome autoportante, dome suportado).
- UI dos blocos 2 de parâmetros.
- Comparativo atualizado.

**Fase 4 — Bocais, reforços e flanges:**
- Lista dinâmica de bocais com TAG, DN, classe, posição.
- Cálculo de reforço por dois métodos.
- Tabela de flanges ASME B16.5 (massa por DN/classe).
- Sugestão automática de bocais mínimos por norma.
- UI do bloco 3.

**Fase 5 — Escadas, plataformas e guarda-corpos:**
- Geometria e estimativa de peso.
- Verificação dimensional NR-12 / NR-35.
- UI do bloco 4.

**Fase 6 — Memória de cálculo em PDF:**
- Layout NTANK/NTN, capa, sumário, conteúdo estruturado por componente.
- Tabela de chapas a comprar (lista de corte).
- Lista de bocais.
- *Entregável:* PDF baixado a partir de um projeto, completo.

**Fase 7 — Polimento e instalação como PWA mobile:**
- Manifesto, ícones NTANK, instalável no Android/iOS.
- Otimização de performance.
- Splash screen com identidade NTANK.

Cada fase termina com Nilton testando e dando OK antes de avançar.

---

## 11. Antes de começar — perguntas a fazer

Faça **estas perguntas a Nilton em uma única mensagem** antes de qualquer código:

1. **Stack:** OK com Next.js 15 + TypeScript + PWA, ou prefere Flutter / React Native?
2. **Materiais iniciais:** quais materiais de chapa devo cadastrar no MVP? (A283-C, A36, A516-Gr.60/65/70 — confirmar e pedir tensões admissíveis Sd e St de cada um)
3. **Eficiência de junta:** qual valor default usar (0,85 ou 1,0)?
4. **Espessura mínima nominal por diâmetro:** existe uma tabela interna da NTN, ou devo usar a tabela genérica da API 650? (Não reproduzir o conteúdo — apenas confirmar a fonte.)
5. **Custo do aço (R$/kg):** valor default a usar no comparativo de custo? (parametrizável, mas precisa de um número inicial)
6. **Exemplos de validação:** pode me enviar exemplos trabalhados (entrada → saída esperada) para os componentes principais — costado, fundo, teto e ao menos um bocal com reforço — para eu usar como teste de regressão?
7. **Bocais mínimos por norma:** confirmar a lista de bocais que o NTANK deve sugerir automaticamente (vent, dreno, manhole costado, manhole teto, instrumentação)?
8. **Flanges:** posso usar tabela de massa de flanges de catálogo de fornecedor (ex.: Tupy, ITA), ou Nilton tem tabela própria interna?
9. **Escadas e plataformas:** quais perfis comerciais devo cadastrar como default? (Ex.: longarina UDC 200×75, piso chapa xadrez 3/16", guarda-corpo tubo Sch 40 1.1/4")
10. **Sobrespessura de corrosão (CA):** valor default? Faixa típica?
11. **Tipos de teto:** confirmar que MVP cobre cônico autoportante, cônico suportado, dome autoportante e dome suportado.
12. **Hospedagem:** Vercel (deploy fácil, Nilton acessa por link) ou prefere um domínio NTN próprio (ex.: `ntank.ntnengenharia.com.br`)?
13. **Logo NTANK:** existe identidade visual própria do NTANK ou posso criar um placeholder seguindo a paleta NTN (verde `#ADD91C` + preto + tipografia Andromeda) até a versão final?
14. **Fontes:** confirmar disponibilidade de `Andromeda Bold` como arquivo (.woff/.woff2). Se não, sugerir fallback Web (ex.: `Exo 2 Bold` é visualmente próximo).
15. **Renomear pasta:** OK renomear `APP CALCULO/` para `NTANK/` no início da Fase 1?

Espere as respostas, registre as decisões em `docs/decisoes/0001-stack-e-defaults.md`, e só então comece a Fase 1.

---

## Resumo do que você deve fazer agora

1. Ler o `CLAUDE.md` desta pasta e da pasta raiz.
2. Fazer as 15 perguntas da Seção 11 em uma única mensagem.
3. Aguardar as respostas.
4. Registrar as decisões em um ADR.
5. Começar a Fase 1.

Não ultrapasse a Fase 1 sem que Nilton tenha validado o cálculo do costado contra os exemplos que ele forneceu.
