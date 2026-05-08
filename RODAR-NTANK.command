#!/bin/bash
# RODAR-NTANK.command
# Duplo-clique no Finder (ou rodar com `bash RODAR-NTANK.command`).
# Faz tudo: instala deps (se preciso), compila e roda o exemplo da planilha.

set -e

# Vai para a pasta deste script (resolve o caminho com espaços corretamente)
cd "$(dirname "$0")"

echo "================================================="
echo "  NTANK — Calculadora de Tanques (NTN Engenharia)"
echo "================================================="
echo ""
echo "Diretório:"
echo "  $(pwd)"
echo ""

# Confere Node
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js não está instalado. Instale em https://nodejs.org/ (versão 20+)."
  read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
  exit 1
fi
echo "Node.js: $(node --version)"
echo ""

# Instala dependências se ainda não instalou
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependências (uma só vez, demora ~30 s)..."
  npm install
  echo ""
fi

# Compila o calc-core se ainda não tem dist/
if [ ! -f "packages/calc-core/dist/cli.js" ]; then
  echo "🔨 Compilando calc-core..."
  (cd packages/calc-core && npx tsc)
  echo ""
fi

echo "🧪 Rodando os 27 testes..."
(cd packages/calc-core && npx vitest run 2>&1 | tail -8)
echo ""

echo "📊 Calculando o tanque da planilha (D=11.460 mm, H=19.000 mm)..."
echo ""
node packages/calc-core/dist/cli.js docs/exemplos-validacao/01-entrada.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('  ENTRADA:')
e = d['entrada']
print(f'    Diâmetro: {e[\"D_mm\"]} mm')
print(f'    Altura:   {e[\"H_mm\"]} mm')
print(f'    Material: {e[\"material\"]}')
print(f'    G={e[\"G\"]}, CA={e[\"CA_mm\"]} mm, E={e[\"E\"]}')
print(f'    Chapa:    {e[\"larguraChapa_mm\"]} × {e[\"comprimentoChapa_mm\"]} mm')
print()
print('  COMPARATIVO DOS MÉTODOS:')
for v in d['variantes']:
    print(f'    {v[\"metodo\"]:30s}  {v[\"pesoTotal_kg\"]:>10,.2f} kg   R\$ {v[\"custo_R\$\"]:>12,.2f}')
print()
r = d['recomendada']
print(f'  ✅ RECOMENDADA: {r[\"metodo\"]}')
print(f'     Peso: {r[\"pesoTotal_kg\"]:,.2f} kg   |   Custo: R\$ {r[\"custo_R\$\"]:,.2f}')
print()
print('  Para ver o JSON completo (anel por anel):')
print('    cat /tmp/ntank-saida.json')
"

# Salva saída completa para inspeção posterior
node packages/calc-core/dist/cli.js docs/exemplos-validacao/01-entrada.json > /tmp/ntank-saida.json
echo ""
echo "================================================="
echo "  Saída JSON completa salva em /tmp/ntank-saida.json"
echo "================================================="
echo ""
read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
