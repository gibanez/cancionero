#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: falta .env en $(pwd). Copiá .env.example y configurá JWT_SECRET." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

export COMPOSE_PROJECT_NAME=cancionero
VOLUME_NAME="${VOLUME_NAME:-cancionero_data}"
export VOLUME_NAME

git fetch --all --prune
git checkout main
git pull --ff-only origin main

IMAGE_TAG="$(git rev-parse --short HEAD)"
export IMAGE_TAG
IMAGE="cancionero:${IMAGE_TAG}"

echo "==> Build de $IMAGE"
docker compose build --pull --no-cache

EXPECTED="$(docker run --rm --entrypoint sh "$IMAGE" -c 'grep -o "index-[A-Za-z0-9_-]*\.js" /app/public/index.html | head -n1')"
if [ -z "$EXPECTED" ]; then
  echo "ERROR: no se pudo leer el bundle del index.html de la imagen" >&2
  exit 1
fi
echo "==> Bundle esperado: $EXPECTED"

# No crear volúmenes nuevos en silencio: eso fue lo que dejó una base vacía.
if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  HAS_DB="$(docker run --rm -v "$VOLUME_NAME":/data --entrypoint sh "$IMAGE" \
    -c '[ -f /data/cancionero.db ] && echo yes || echo no' 2>/dev/null || true)"
  if [ "$HAS_DB" != yes ] && [ "${ALLOW_EMPTY_VOLUME:-0}" != 1 ]; then
    echo "ERROR: el volumen $VOLUME_NAME existe pero no contiene cancionero.db." >&2
    echo "       Aborto para no pisar datos. Si es una instalación nueva:" >&2
    echo "       ALLOW_EMPTY_VOLUME=1 ./deploy.sh" >&2
    exit 1
  fi
else
  if [ "${ALLOW_EMPTY_VOLUME:-0}" != 1 ]; then
    echo "ERROR: el volumen $VOLUME_NAME no existe. No lo voy a crear automáticamente." >&2
    echo "       Si es una instalación nueva: ALLOW_EMPTY_VOLUME=1 ./deploy.sh" >&2
    exit 1
  fi
fi

OLD="$(docker ps -aq --filter 'name=^/cancionero$' || true)"
if [ -n "$OLD" ]; then
  MOUNT_NAME="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$OLD" 2>/dev/null || true)"
  MOUNT_SOURCE="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}' "$OLD" 2>/dev/null || true)"
  if [ "$MOUNT_NAME" != "$VOLUME_NAME" ]; then
    echo "ERROR: el contenedor actual monta /data desde '$MOUNT_SOURCE' (volumen '$MOUNT_NAME')," >&2
    echo "       pero Compose usaría '$VOLUME_NAME'. Configurá VOLUME_NAME en .env." >&2
    exit 1
  fi
  echo "==> Deteniendo contenedor anterior $OLD (volumen $VOLUME_NAME se conserva)"
  docker stop "$OLD" >/dev/null
fi

if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  BACKUP_DIR="$(pwd)/backups"
  mkdir -p "$BACKUP_DIR"
  STAMP="$(date +%Y%m%d-%H%M%S)"
  docker run --rm -v "$VOLUME_NAME":/data -v "$BACKUP_DIR":/backup --entrypoint sh "$IMAGE" \
    -c "cp /data/cancionero.db /backup/cancionero-$STAMP.db"
  echo "==> Backup previo: $BACKUP_DIR/cancionero-$STAMP.db"
fi

if [ -n "$OLD" ]; then
  docker rm "$OLD" >/dev/null
fi

echo "==> Levantando $IMAGE"
docker compose up -d --force-recreate --remove-orphans

echo "==> Verificando contenedor..."
for _ in $(seq 1 30); do
  ACTUAL="$(docker compose exec -T cancionero sh -c 'grep -o "index-[A-Za-z0-9_-]*\.js" /app/public/index.html | head -n1' 2>/dev/null || true)"
  if [ "$ACTUAL" = "$EXPECTED" ]; then
    if docker compose exec -T cancionero node -e 'fetch("http://127.0.0.1:3001/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; then
      echo "OK: $IMAGE sirve $EXPECTED y /api/health responde"
      exit 0
    fi
  fi
  sleep 1
done

echo "ERROR: el contenedor no sirve $EXPECTED" >&2
docker compose logs --tail=50 cancionero >&2 || true
exit 1
