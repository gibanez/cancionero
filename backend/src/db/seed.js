const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const db = require('./database');

const categories = [
  'CANCIONES DE FOLKLORE',
  'CANCIONES DE TANGO',
  'MÚSICA LATINOAMERICANA',
  'CLÁSICOS POPULARES',
  'INFANTILES'
];

const songs = {
  'CANCIONES DE FOLKLORE': [
    ['Zamba para Olvidar', 'A. Ramirez / J. Dávalos'],
    ['Luna Tucumana', 'Atahualpa Yupanqui'],
    ['La Nochera', 'Hnos. Ábalos / J. Dávalos'],
    ['Alfonsina y el Mar', 'F. Luna / A. Ramirez'],
    ['El Arriero', 'Atahualpa Yupanqui'],
    ['Como Pájaro en el Aire', 'Peteco Carabajal']
  ],
  'CANCIONES DE TANGO': [
    ['La Cumparsita', 'Gerardo Matos Rodríguez'],
    ['El Choclo', 'Ángel Villoldo'],
    ['Por una Cabeza', 'Carlos Gardel / Alfredo Le Pera'],
    ['Adiós Muchachos', 'Julio César Sanders'],
    ['Caminito', 'Gabino Coria Peñaloza / Juan de Dios Filiberto']
  ],
  'MÚSICA LATINOAMERICANA': [
    ['Granada', 'Agustín Lara'],
    ['Cielito Lindo', 'Quirino Mendoza y Cortés'],
    ['Guantanamera', 'José Martí / Héctor Angulo'],
    ['La Bamba', 'Tradicional mexicana'],
    ['El Cóndor Pasa', 'Daniel Alomía Robles']
  ],
  'CLÁSICOS POPULARES': [
    ['Imagine', 'John Lennon'],
    ['Yesterday', 'Lennon / McCartney'],
    ['Sweet Caroline', 'Neil Diamond'],
    ['Stand by Me', 'Ben E. King'],
    ['La Bicicleta', 'Carlos Vives / Shakira']
  ],
  'INFANTILES': [
    ['La Cucaracha', 'Tradicional'],
    ['Los Elefantes', 'Tradicional'],
    ['Mari Mari', 'Tradicional'],
    ['Canción de Cuna', 'Tradicional'],
    ['El Ratón Pérez', 'Tradicional']
  ]
};

const playlists = ['FAVORITOS', 'MI ASADO', 'FIESTA CRIOLLA', 'REPERTORIO GIRA'];

function placeholderLyrics(title, author) {
  return `Letra de ejemplo para «${title}» (${author}).\n\n` +
    'Reemplazá este texto por la letra real desde el formulario de edición ' +
    'o subiendo una imagen con OCR.';
}

const DEFAULT_USERNAME = 'viriginia';
const DEFAULT_PASSWORD = 'MarVirCor';
const LEGACY_USERNAME = 'admin';

function seed() {
  const username = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  );
  const findUser = db.prepare('SELECT id FROM users WHERE username = ?');
  let user = findUser.get(username);
  if (!user) {
    const legacyUser = findUser.get(LEGACY_USERNAME);
    if (legacyUser) {
      // Migración del usuario de la demo: se conserva el id para no perder sus listas.
      const passwordHash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?')
        .run(username, passwordHash, legacyUser.id);
      user = { id: legacyUser.id };
    } else {
      const result = insertUser.run(username, bcrypt.hashSync(password, 10));
      user = { id: result.lastInsertRowid };
    }
  }

  const insertCategory = db.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
  );
  const findCategory = db.prepare('SELECT id FROM categories WHERE name = ?');
  const categoryIds = {};

  const insertSong = db.prepare(
    'INSERT INTO songs (category_id, title, author, lyrics) VALUES (?, ?, ?, ?)'
  );
  const findSong = db.prepare(
    'SELECT id FROM songs WHERE category_id = ? AND title = ?'
  );

  const insertPlaylist = db.prepare(
    'INSERT INTO playlists (user_id, name) VALUES (?, ?)'
  );
  const findPlaylist = db.prepare(
    'SELECT id FROM playlists WHERE user_id = ? AND name = ?'
  );
  const insertPlaylistSong = db.prepare(
    'INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)'
  );

  db.transaction(() => {
    categories.forEach((name, index) => {
      let category = findCategory.get(name);
      if (!category) {
        const result = insertCategory.run(name, index + 1);
        category = { id: result.lastInsertRowid };
      }
      categoryIds[name] = category.id;
    });

    Object.keys(songs).forEach((categoryName) => {
      songs[categoryName].forEach(([title, author]) => {
        if (!findSong.get(categoryIds[categoryName], title)) {
          insertSong.run(
            categoryIds[categoryName],
            title,
            author,
            placeholderLyrics(title, author)
          );
        }
      });
    });

    playlists.forEach((name) => {
      let playlist = findPlaylist.get(user.id, name);
      if (!playlist) {
        const result = insertPlaylist.run(user.id, name);
        playlist = { id: result.lastInsertRowid };
      }
      if (name === 'FAVORITOS' || name === 'MI ASADO') {
        const firstSongs = db.prepare(
          'SELECT id FROM songs WHERE category_id = ? ORDER BY id LIMIT 3'
        ).all(categoryIds['CANCIONES DE FOLKLORE']);
        firstSongs.forEach((song, position) => {
          insertPlaylistSong.run(playlist.id, song.id, position + 1);
        });
      }
    });
  })();

  return user;
}

if (require.main === module) {
  const user = seed();
  console.log(`Base de datos lista. Usuario: ${process.env.ADMIN_USERNAME || DEFAULT_USERNAME} (id ${user.id})`);
}

module.exports = seed;
