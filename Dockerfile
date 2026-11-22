# --- Etapa 1: Build del Frontend (Lit + Tailwind + Vite) ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Etapa 2: Backend y servidor final ---
FROM node:22-slim

# Dependencias del sistema necesarias para compilar better-sqlite3 y ejecutar Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias del backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copiar código del backend
COPY backend/ ./

# Copiar el bundle compilado del frontend (Express lo sirve desde /app/public)
COPY --from=frontend-builder /app/frontend/dist ./public

# Directorio persistente para SQLite y modelos de Tesseract
RUN mkdir -p /data/tesseract-cache
ENV DB_PATH=/data/cancionero.db
ENV TESSERACT_CACHE_PATH=/data/tesseract-cache
# Sobrescribir en producción: docker run -e JWT_SECRET=<secreto-largo> ...
ENV JWT_SECRET=cancionero-dev-secret-cambiar-en-produccion
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]
