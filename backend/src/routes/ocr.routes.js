const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');

const router = express.Router();

// En Docker apunta a /data para que el modelo de español persista entre reinicios.
const CACHE_PATH = process.env.TESSERACT_CACHE_PATH
  ? path.resolve(process.env.TESSERACT_CACHE_PATH)
  : path.join(os.tmpdir(), 'cancionero-tesseract');
fs.mkdirSync(CACHE_PATH, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return callback(null, true);
    }
    return callback(new Error('El archivo debe ser una imagen'));
  }
});

router.post('/extract', upload.single('image'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Se requiere una imagen en el campo "image"' });
  }

  try {
    const { data } = await Tesseract.recognize(req.file.buffer, 'spa', {
      cachePath: CACHE_PATH
    });
    const rawText = (data.text || '').replace(/\r/g, '');
    const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean);
    const suggestedTitle = lines.shift() || '';

    return res.json({
      rawText,
      suggestedTitle,
      lyrics: lines.join('\n')
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
