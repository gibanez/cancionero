# Blueprint de Desarrollo: App Web "Cancionero"

## 1. Visión General del Proyecto
Aplicación web Mobile-First para gestionar un cancionero digital con categorías, letras, listas de reproducción personales, extracción de letras mediante imágenes (OCR) y enlaces públicos para compartir listas sin requerir inicio de sesión.

### Stack Tecnológico
* **Backend:** Node.js, Express, SQLite (`better-sqlite3`), JWT (`jsonwebtoken`), `bcrypt`, `multer`, `tesseract.js` (OCR).
* **Frontend:** Lit Element (Web Components), Tailwind CSS, Vite, Router ligero (Navigo o routing nativo con History API).

---

## 2. Sistema de Diseño & UI/UX (Basado en Referencia Visual)

### Paleta de Colores (`tailwind.config.js`)
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#A92626',   // Rojo carmesí (Header, tarjetas, botones primarios)
          hover: '#8B1E1E',     // Estado hover/active
          light: '#FDF2F2',     // Tinte suave para selecciones
        },
        surface: {
          base: '#FFFFFF',      // Fondo principal
          nav: '#F8F9FA',       // Barra de navegación inferior
        },
        ink: {
          primary: '#1A1A1A',   // Títulos y nombres de canciones
          secondary: '#666666', // Autores y subtítulos
          border: '#E5E7EB',    // Líneas divisorias
        }
      }
    }
  }
}
```

### Reglas de Layout
* **Contenedor Principal:** Diseño centrado estilo app móvil (`max-w-md mx-auto min-h-screen bg-surface-base shadow-xl flex flex-col relative`).
* **Top App Bar:** Fija arriba (`sticky top-0 z-20 bg-brand-primary text-white px-4 h-14 flex items-center justify-between`). Título centrado en mayúsculas (`tracking-wide font-medium`), botón izquierdo (menú hamburguesa o flecha atrás) y botón derecho (lupa de búsqueda).
* **Bottom Navigation Bar:** Fija abajo (`fixed bottom-0 w-full max-w-md bg-surface-nav border-t border-ink-border h-16 grid grid-cols-3`). Ítems con ícono superior + etiqueta:
  1. **Inicio** (Categorías)
  2. **Listas** (Playlists)
  3. **Buscar** (Buscador global)
  * *Estado activo:* Texto e ícono en `#A92626`. *Inactivo:* `#666666`.

---

## 3. Estructura de Directorios

```text
cancionero-app/
├── PROJECT.md
├── backend/
│   ├── package.json
│   ├── .env
│   ├── cancionero.db
│   └── src/
│       ├── app.js
│       ├── db/
│       │   ├── database.js
│       │   └── seed.js
│       ├── middlewares/
│       │   └── auth.middleware.js
│       └── routes/
│           ├── auth.routes.js
│           ├── categories.routes.js
│           ├── songs.routes.js
│           ├── playlists.routes.js
│           └── ocr.routes.js
└── frontend/
    ├── package.json
    ├── index.html
    ├── tailwind.config.js
    └── src/
        ├── main.js
        ├── router.js
        ├── services/
        │   ├── api.service.js
        │   └── auth.service.js
        ├── components/
        │   ├── app-header.js
        │   ├── bottom-nav.js
        │   ├── song-row.js
        │   └── playlist-modal.js
        └── views/
            ├── login-view.js
            ├── categories-view.js
            ├── songs-list-view.js
            ├── song-detail-view.js
            ├── song-form-view.js
            ├── playlists-view.js
            └── public-playlist-view.js
```

---

## 4. Arquitectura Backend & Base de Datos

### Esquema SQLite (`database.js`)
```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  public_token TEXT UNIQUE,
  is_public INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);
```

### Contratos de API REST

#### Autenticación
* `POST /api/auth/login`
  * **Body:** `{ "username": "viriginia", "password": "MarVirCor" }`
  * **Response:** `{ "token": "jwt_token", "user": { "id": 1, "username": "viriginia" } }`

#### Categorías (Requiere Auth)
* `GET /api/categories`
  * **Response:** `[{ "id": 1, "name": "CANCIONES DE FOLKLORE", "songCount": 35 }, ...]`

#### Canciones (Requiere Auth)
* `GET /api/songs?categoryId=1&q=zamba` -> Lista filtrada por categoría o búsqueda.
* `GET /api/songs/:id` -> Detalle completo incluyendo `lyrics`.
* `POST /api/songs` -> Crea canción (`{ category_id, title, author, lyrics }`).
* `PUT /api/songs/:id` -> Edita canción existente.
* `DELETE /api/songs/:id` -> Elimina canción.

#### OCR - Imagen a Texto (Requiere Auth)
* `POST /api/ocr/extract`
  * **Content-Type:** `multipart/form-data` (campo `image`).
  * **Proceso:** Procesa buffer en memoria con `Tesseract.recognize(buffer, 'spa')`.
  * **Response:** `{ "rawText": "...", "suggestedTitle": "Primera línea", "lyrics": "Resto del texto" }`

#### Playlists & Compartir (ABM + Acceso Público)
* `GET /api/playlists` (Auth) -> Lista de playlists del usuario con conteo de canciones.
* `POST /api/playlists` (Auth) -> Crea nueva playlist (`{ "name": "MI ASADO" }`).
* `PUT /api/playlists/:id` (Auth) -> Renombra playlist o cambia estado `is_public`.
* `DELETE /api/playlists/:id` (Auth) -> Elimina playlist.
* `POST /api/playlists/:id/songs` (Auth) -> Sincroniza o agrega canción (`{ "songId": 2 }`).
* `POST /api/playlists/:id/share` (Auth) -> Genera `public_token` (UUID v4) si no existe, activa `is_public = 1` y devuelve `{ "publicUrl": "/p/<token>" }`.
* `GET /api/public/playlists/:token` (**PÚBLICO - Sin Auth**) -> Devuelve `{ "name": "MI ASADO", "songs": [...] }` solo si `is_public = 1`.

---

## 5. Especificación de Vistas y Componentes (Lit Element)

> **Nota técnica:** En los componentes de página/vista, sobrescribir `createRenderRoot() { return this; }` para utilizar directamente las clases utilitarias de Tailwind CSS sin fricción con Shadow DOM.

### 1. `login-view.js` (`/login`)
* Logo/Título "CANCIONERO" en `#A92626`.
* Inputs de usuario y contraseña con borde enfocado en `#A92626`.
* Botón ancho completo `INGRESAR` en `#A92626`.

### 2. `categories-view.js` (`/`) - Pantalla 1
* Encabezado sección: `EXPLORAR CATEGORÍAS`.
* Lista vertical (`space-y-3`) de tarjetas rojas (`bg-brand-primary text-white p-4 rounded-lg flex justify-between items-center`):
  * Izquierda: Título en mayúsculas (`font-semibold`) + Subtítulo (`Subtitle: X canciones` en `text-xs text-white/80`).
  * Derecha: Ícono chevron `>`.

### 3. `songs-list-view.js` (`/category/:id`) - Pantalla 2
* Header muestra flecha volver `<-` y nombre de la categoría (ej. `FOLKLORE`).
* Subheader con título `LISTA DE CANCIONES`, subtítulo y botón flotante o superior `+ Nueva Canción`.
* Filas (`song-row.js`) separadas por `border-b border-ink-border py-3 flex items-center justify-between`:
  * **Izquierda:** Índice numérico en color `#A92626` (`w-8 font-medium`).
  * **Centro (Clickeable para "Ver"):** Título en `text-ink-primary font-medium` + Autor abajo en `text-xs text-ink-secondary`.
  * **Derecha (Acciones):**
    * Botón rápido `+ Añadir` (ícono `+` rojo arriba, texto `Añadir` abajo) -> Abre `<playlist-modal>`.
    * Botón menú `⋮` -> Despliega popover con opciones: **Ver**, **Editar**, **Eliminar**.

### 4. `playlist-modal.js` - Pantalla 3
* Overlay oscuro (`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4`).
* Caja blanca (`bg-white rounded-lg w-full max-w-sm p-5 shadow-2xl`):
  * Título centrado: `AGREGAR A LISTA DE REPRODUCCIÓN`.
  * Subtítulo: `Seleccione una lista para añadir: "<Título>" (<Autor>)`.
  * Lista de playlists con divisores horizontales. Las listas seleccionadas muestran un check `✓` en `#A92626`.
  * Botón ancho completo con borde gris: `CREAR NUEVA LISTA` (despliega input rápido + botón guardar).
  * Footer con dos botones: `CANCELAR` (texto gris) y `CONFIRMAR` (botón rojo `#A92626` texto blanco).

### 5. `song-form-view.js` (`/songs/new` y `/songs/edit/:id`)
* **Bloque OCR superior:** Caja punteada (`border-2 border-dashed border-brand-primary/40 rounded-lg p-4 text-center`) con botón **"Subir o tomar foto de letra"**.
  * Al seleccionar imagen, envía a `/api/ocr/extract` y rellena automáticamente los campos `Título` y `Letra`.
* Campos del formulario: Select de Categoría, Input Título, Input Autor, Textarea Letra/Acordes.
* Botón `GUARDAR CANCIÓN`.

### 6. `playlists-view.js` (`/playlists`) y `public-playlist-view.js` (`/p/:token`)
* **Privada:** ABM de listas. Cada tarjeta tiene botones: *Ver canciones*, *Renombrar*, *Eliminar* y *Compartir* (copia enlace `/p/:token` al portapapeles con feedback visual).
* **Pública (`/p/:token`):** No muestra `bottom-nav` ni acciones de edición. Muestra el nombre de la playlist en la barra roja superior y el listado limpio de canciones; al tocar una canción despliega su letra en un modal o acordeón de lectura.

---

## 6. Plan de Ejecución por Fases

- [ ] **Fase 1: Inicialización y Base de Datos**
  - Configurar `backend/` con Express y `better-sqlite3`.
