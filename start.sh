#!/usr/bin/env bash
set -euo pipefail

# Instala dependencias y levanta la API (Express) y Vite en paralelo.
# Uso: ./start.sh [--skip-install]

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_INSTALL=0

if [ -r /proc/version ] && grep -qi microsoft /proc/version 2>/dev/null; then
  echo "Error: ejecutá este script desde Git Bash en Windows, no desde WSL." >&2
  echo "Los módulos nativos (better-sqlite3, bcrypt) están compilados para Windows." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
  echo "Error: se requiere Node.js 20 o superior (detectado: ${NODE_MAJOR})." >&2
  exit 1
fi

usage() {
  echo "Uso: $0 [--skip-install]"
  echo "  --skip-install  no ejecuta npm install (usa node_modules existente)"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --skip-install) SKIP_INSTALL=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

install_deps() {
  local dir="$1"
  if [ "$SKIP_INSTALL" -eq 1 ]; then
    echo "==> Omitiendo npm install en $(basename "$dir")"
    return
  fi
  echo "==> npm install en $(basename "$dir")"
  (cd "$dir" && npm install)
}

install_deps "$ROOT/backend"
install_deps "$ROOT/frontend"

PIDS=()
CLEANED=0

cleanup() {
  [ "$CLEANED" -eq 1 ] && return 0
  CLEANED=1
  printf '\n==> Deteniendo servicios...\n'
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "==> Iniciando API en http://localhost:3001"
(cd "$ROOT/backend" && exec node src/app.js) &
PIDS+=("$!")

echo "==> Iniciando Vite en http://localhost:5173"
(cd "$ROOT/frontend" && exec node node_modules/vite/bin/vite.js) &
PIDS+=("$!")

echo "==> Listo. Ctrl+C para detener ambos servicios."
wait
