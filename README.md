# Cancionero

Aplicación web mobile-first para gestionar un cancionero digital: categorías, letras, listas de reproducción, extracción de letras con OCR y enlaces públicos para compartir listas sin login. Es instalable como PWA: guarda el repertorio en caché para consultarlo sin conexión y permite exportar/importar datos en JSON o CSV.

Especificación de origen: [`project.md`](./project.md).

## Stack

- **Backend:** Node.js, Express, SQLite (`better-sqlite3`), JWT, bcrypt, multer, Tesseract.js.
- **Frontend:** Lit Element, Tailwind CSS, Vite, router propio con History API.

## Estructura

```
backend/   API REST + SQLite (seed automático al arrancar)
frontend/  SPA con Lit + Tailwind
```

## Puesta en marcha

Requiere Node.js 22 o superior (probado con Node 26).

Todo en uno (instala dependencias y levanta API y Vite; Ctrl+C detiene ambos):

```bash
chmod +x start.sh
./start.sh
```

En Windows ejecutalo desde **Git Bash** (no WSL): los módulos nativos están compilados para Windows.

Si ya tenés `node_modules`, podés saltear la instalación con `./start.sh --skip-install`.

Manualmente, en dos terminales:

```bash
cd backend
npm install
npm start          # http://localhost:3001
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Vite proxya `/api` al backend, así que no hace falta configurar CORS.

- Usuario de demostración: **virginia / MarVirCor** (configurable en `backend/.env`).
- El backend siembra categorías, canciones y listas la primera vez que arranca (`npm run seed` para forzar la carga).
- Para generar el bundle: `cd frontend && npm run build` (sale en `frontend/dist`).

## Docker

El `Dockerfile` compila el frontend y sirve la API y la SPA juntas desde Express en el puerto 3001:

```bash
docker build -t cancionero .
docker run --rm -p 3001:3001 \
  -e JWT_SECRET=<secreto-largo-y-aleatorio> \
  -v cancionero_data:/data \
  cancionero
```

Abrir `http://localhost:3001`. El volumen `cancionero_data` conserva la SQLite y el modelo de Tesseract entre reinicios; sin él, los datos viven sólo dentro del contenedor. `.dockerignore` evita copiar al contexto `node_modules`, `.env`, la base SQLite y los `*.traineddata` de Windows.

### Persistencia en Portainer

Montá un volumen con nombre en `/data`; un **Recreate** solo cambia el contenedor, no crea el volumen:

1. Containers → tu contenedor → **Duplicate/Edit**.
2. En **Volumes**, agregá `cancionero_data` como origen (o un bind mount del host) y `/data` como destino.
3. Redeploy.

Sin ese mount, cada contenedor nuevo arranca con una SQLite vacía y se vuelven a cargar los datos de ejemplo. Con él, tus canciones y listas sobreviven a recreaciones y a actualizaciones de imagen.

Los datos iniciales se cargan una sola vez (queda registrado en `app_meta`): borrar una categoría, canción o lista **no** se revierte al reiniciar.

## Deploy automático

Para no volver a tener el problema de una imagen vieja en Portainer, el deploy usa un tag por commit en vez de `latest` mutable y verifica el bundle antes de terminar.

Archivos nuevos:

- `docker-compose.yml`: construye y levanta el contenedor con `image: cancionero:<commit>` y el volumen `/data`.
- `deploy.sh`: hace `git pull`, build sin caché, reemplaza el contenedor y comprueba que el JS que sirve coincida con el de la imagen. Antes de tocar nada valida que el volumen exista y contenga `cancionero.db`, y guarda un backup en `backups/` (ignorado por git).
- `.github/workflows/deploy.yml`: ejecuta `deploy.sh` por SSH en cada push a `main`.

Configuración única en el servidor:

```bash
cd /srv/apps/cancionero
cp .env.example .env
# Editá .env: JWT_SECRET largo y aleatorio. Si tu volumen no se llama cancionero_data,
# poné su nombre real en VOLUME_NAME.
chmod +x deploy.sh
./deploy.sh
```

El script detecta un contenedor viejo llamado `cancionero`, verifica que su montaje `/data` apunte al mismo volumen y recién entonces lo reemplaza. Si el volumen no existe o no tiene `cancionero.db`, **aborta en vez de crear uno vacío**: así evita que el seed vuelva a cargar las canciones de ejemplo y parezca que se borraron los datos. Antes de reemplazar el contenedor copia la base a `backups/cancionero-<fecha>.db`.

En una instalación nueva (todavía no hay base) el primer deploy necesita habilitar explícitamente la creación:

```bash
ALLOW_EMPTY_VOLUME=1 ./deploy.sh
```

Usalo **solo** la primera vez: si lo usás sobre una instalación existente, se creará una base vacía. Si tu contenedor anterior usaba otro volumen o un bind mount, poné ese nombre real en `VOLUME_NAME` de `.env` antes de deployar; el script se niega a seguir si el montaje no coincide.

Para que se dispare solo al hacer `git push`, agregá estos secrets en GitHub → Settings → Secrets and variables → Actions:

| Secret | Valor |
| --- | --- |
| `DEPLOY_HOST` | IP o dominio del servidor |
| `DEPLOY_USER` | usuario SSH (ej. `root`) |
| `DEPLOY_KEY` | clave privada SSH con acceso al servidor |

Si el path del repo en el servidor no es `/srv/apps/cancionero`, cambiá la línea `cd ...` en `.github/workflows/deploy.yml`.

Cada deploy imprime el bundle verificado, por ejemplo `OK: cancionero:97cc385 sirve index-KkI3T9ET.js y /api/health responde`. Si la imagen y el contenedor no coinciden, el script falla y muestra los logs en vez de dejar una versión vieja corriendo.

Si preferís no usar GitHub Actions, podés correr `./deploy.sh` a mano o con un cron; el script es el mismo.

## API

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | no | Devuelve `{ token, user }` |
| GET | `/api/categories` | sí | Categorías con `songCount` |
| POST | `/api/categories` | sí | Crea categoría (`{ "name": "..." }`) |
| DELETE | `/api/categories/:id` | sí | Elimina la categoría y sus canciones |
| GET | `/api/songs?categoryId=&q=` | sí | Lista filtrada |
| GET/PUT/DELETE | `/api/songs/:id` | sí | Detalle / edición / baja |
| POST | `/api/songs` | sí | Alta de canción |
| POST | `/api/ocr/extract` | sí | Imagen (`image`) → `{ rawText, suggestedTitle, lyrics }` |
| GET/POST/PUT/DELETE | `/api/playlists` | sí | ABM de listas; `GET ?songId=` agrega `hasSong` por lista |
| GET | `/api/playlists/:id/songs` | sí | Canciones de una lista, en orden |
| POST | `/api/playlists/:id/songs` | sí | Agrega `songId` (o `songIds`) |
| PUT | `/api/playlists/:id/songs/reorder` | sí | Mueve `songId` con `direction: "up"\|"down"` |
| POST | `/api/playlists/:id/share` | sí | Genera token público y devuelve `/p/<token>` |
| GET | `/api/data/export?format=json\|csv` | sí | Devuelve `{ filename, contentType, content }` |
| POST | `/api/data/import` | sí | Importa `{ format, content }` y devuelve un resumen |
| GET | `/api/public/playlists/:token` | **no** | Lista pública para compartir |

## Notas

- «Compartir» usa la API nativa `navigator.share` cuando está disponible; si no, copia el enlace al portapapeles.
- El primer OCR descarga el modelo de español (`spa.traineddata`); requiere conexión la primera vez.
- Cambiar `JWT_SECRET` en `backend/.env` (o con `-e JWT_SECRET=...` en Docker) antes de exponer el proyecto.
- La base SQLite se crea en `backend/cancionero.db` (configurable con `DB_PATH`).
- Borrar una categoría también borra sus canciones (FK `ON DELETE CASCADE`).
- Los borrados de categorías, listas y canciones usan un modal de confirmación propio (`confirm-modal`), no el `confirm` del navegador. Se cierra con CANCELAR, Escape o haciendo clic fuera.
- El modal para agregar canciones marca con **YA ESTÁ** las listas que ya contienen esa canción y muestra un toast con el resultado; el toast vive fuera del `#app` para sobrevivir a los cambios de ruta.
- Desde el menú **Datos** se descarga un JSON completo (categorías, canciones y listas con sus canciones) o un CSV para planillas (`categoria,titulo,autor,letra,listas`, separando los nombres de listas con `|`). Importar **agrega** lo que falta: no borra ni sobrescribe canciones existentes, y las listas nuevas quedan privadas.
- Las canciones dentro de una lista se reordenan con las flechas ↑/↓; el backend reescribe `position` de forma ordenada dentro de una transacción.
- El service worker (`public/sw.js`) cachea el shell y los assets, pero **nunca** cachea `/api/*`. Se registra sólo en el bundle de producción; en `npm run dev` no se activa.
