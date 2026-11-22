import './styles.css';

import './components/app-header.js';
import './components/bottom-nav.js';
import './views/login-view.js';
import './views/categories-view.js';
import './views/songs-list-view.js';
import './views/song-detail-view.js';
import './views/song-form-view.js';
import './views/playlists-view.js';
import './views/playlist-songs-view.js';
import './views/public-playlist-view.js';
import './views/data-view.js';

import { addRoute, configure, navigate, start } from './router.js';
import { authService } from './services/auth.service.js';

addRoute('/login', 'login', 'login-view', { title: 'CANCIONERO' });
addRoute('/', 'categories', 'categories-view', { title: 'CANCIONERO', nav: 'inicio' });
addRoute('/category/:id', 'songs', 'songs-list-view', {
  title: 'CATEGORÍA', nav: 'inicio', showBack: true, mode: 'category'
});
addRoute('/search', 'search', 'songs-list-view', {
  title: 'BUSCAR', nav: 'buscar', mode: 'search'
});
addRoute('/songs/new', 'song-new', 'song-form-view', {
  title: 'NUEVA CANCIÓN', nav: 'inicio', showBack: true
});
addRoute('/songs/edit/:id', 'song-edit', 'song-form-view', {
  title: 'EDITAR CANCIÓN', nav: 'inicio', showBack: true
});
addRoute('/songs/:id', 'song-detail', 'song-detail-view', {
  title: 'CANCIÓN', nav: 'inicio', showBack: true
});
addRoute('/playlists', 'playlists', 'playlists-view', { title: 'LISTAS', nav: 'listas' });
addRoute('/playlists/:id', 'playlist-songs', 'playlist-songs-view', {
  title: 'LISTA', nav: 'listas', showBack: true
});
addRoute('/p/:token', 'public-playlist', 'public-playlist-view', {
  title: 'LISTA COMPARTIDA', showSearch: false, showMenu: false
});
addRoute('/data', 'data', 'data-view', { title: 'DATOS', nav: 'inicio' });

const root = document.getElementById('app');

function render(view) {
  const isLogin = view.name === 'login';
  const isPublic = view.name === 'public-playlist';

  if (!authService.isLoggedIn() && !isLogin && !isPublic) {
    navigate('/login', true);
    return;
  }

  const showHeader = !isLogin;
  const showNav = showHeader && !isPublic;

  root.innerHTML = `
    <div class="max-w-md mx-auto min-h-screen bg-surface-base shadow-xl flex flex-col relative">
      ${showHeader ? '<app-header></app-header>' : ''}
      <main id="view-root" class="flex-1 ${showNav ? 'pb-16' : ''}"></main>
      ${showNav ? '<bottom-nav></bottom-nav>' : ''}
    </div>
  `;

  const header = root.querySelector('app-header');
  if (header) {
    header.title = view.options.title || 'CANCIONERO';
    header.showBack = Boolean(view.options.showBack);
    header.showSearch = view.options.showSearch !== false;
    header.showMenu = view.options.showMenu !== false;
  }

  const nav = root.querySelector('bottom-nav');
  if (nav) nav.active = view.options.nav || 'inicio';

  const viewRoot = root.querySelector('#view-root');

  if (view.name === 'not-found') {
    viewRoot.innerHTML = `
      <div class="px-4 pt-10 text-center">
        <p class="text-sm text-ink-secondary">Página no encontrada.</p>
      </div>`;
    return;
  }

  const element = document.createElement(view.tag);
  element.params = view.params;
  element.query = view.query;
  element.mode = view.options.mode || '';
  element.addEventListener('title-change', (event) => {
    if (header) header.title = event.detail;
  });
  viewRoot.appendChild(element);
}

configure(render);
start();

// El service worker sólo se registra en el bundle de producción (Docker / Vite build).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si el navegador no permite SW, la app sigue funcionando online.
    });
  });
}
