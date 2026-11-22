const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cancionero-dev-secret-cambiar-en-produccion';
const JWT_TTL = process.env.JWT_TTL || '7d';

function auth(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { auth, JWT_SECRET, JWT_TTL };
