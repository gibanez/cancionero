#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

export COMPOSE_PROJECT_NAME=cancionero
VOLUME_NAME="${VOLUME_NAME:-cancionero_data}"
export VOLUME_NAME

if [ ! -f .env ]; then
  echo "ERROR: falta .env en $(pwd). Copiá .env.example y configurá JWT_SECRET." >&2
  exit 1
fi

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

OLD="$(docker ps -aq --filter 'name=^/cancionero$' || true)"
if [ -n "$OLD" ]; then
  MOUNT_NAME="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$OLD" 2>/dev/null || true)"
  MOUNT_SOURCE="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}' "$OLD" 2>/dev/null || true)"
  if [ "$MOUNT_NAME" != "$VOLUME_NAME" ]; then
    echo "ERROR: el contenedor actual monta /data desde '$MOUNT_SOURCE' (volumen '$MOUNT_NAME')," >&2
    echo "       pero Compose usaría '$VOLUME_NAME'. Configurá VOLUME_NAME en .env." >&2
    exit 1
  fi
  echo "==> Quitando contenedor anterior $OLD (el volumen $VOLUME_NAME se conserva)"
  docker stop "$OLD" >/dev/null
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
