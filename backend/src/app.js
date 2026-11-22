const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const seed = require('./db/seed');
const { auth } = require('./middlewares/auth.middleware');
const authRoutes = require('./routes/auth.routes');
const categoriesRoutes = require('./routes/categories.routes');
const songsRoutes = require('./routes/songs.routes');
const playlistsRoutes = require('./routes/playlists.routes');
const dataRoutes = require('./routes/data.routes');
const ocrRoutes = require('./routes/ocr.routes');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const HAS_FRONTEND = fs.existsSync(path.join(PUBLIC_DIR, 'index.html'));

seed();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/public/playlists', playlistsRoutes.publicRouter);

app.use('/api/categories', auth, categoriesRoutes);
app.use('/api/songs', auth, songsRoutes);
app.use('/api/playlists', auth, playlistsRoutes.router);
app.use('/api/data', auth, dataRoutes);
app.use('/api/ocr', auth, ocrRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));

if (HAS_FRONTEND) {
  // En Docker el bundle de Vite se copia a /app/public; el router SPA usa History API.
  app.use(express.static(PUBLIC_DIR));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
} else {
  app.use((req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));
}

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'La imagen supera el límite de 10 MB' });
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: 'El archivo es demasiado grande (máximo 10 MB)' });
  }
  if (err.message === 'El archivo debe ser una imagen') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cancionero API escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;
