# Cancionero

Aplicación web mobile-first para gestionar un cancionero digital: categorías, letras, listas de reproducción, extracción de letras con OCR y enlaces públicos para compartir listas sin login.

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

- Usuario de demostración: **admin / 123** (configurable en `backend/.env`).
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
| GET/POST/PUT/DELETE | `/api/playlists` | sí | ABM de listas |
| GET | `/api/playlists/:id/songs` | sí | Canciones de una lista |
| POST | `/api/playlists/:id/songs` | sí | Agrega `songId` (o `songIds`) |
| POST | `/api/playlists/:id/share` | sí | Genera token público y devuelve `/p/<token>` |
| GET | `/api/public/playlists/:token` | **no** | Lista pública para compartir |

## Notas

- «Compartir» usa la API nativa `navigator.share` cuando está disponible; si no, copia el enlace al portapapeles.
- El primer OCR descarga el modelo de español (`spa.traineddata`); requiere conexión la primera vez.
- Cambiar `JWT_SECRET` en `backend/.env` (o con `-e JWT_SECRET=...` en Docker) antes de exponer el proyecto.
- La base SQLite se crea en `backend/cancionero.db` (configurable con `DB_PATH`).
- Borrar una categoría también borra sus canciones (FK `ON DELETE CASCADE`); la UI pide confirmación.
