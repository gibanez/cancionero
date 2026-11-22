import { LitElement, html } from 'lit';
import { navigate } from '../router.js';
import { authService } from '../services/auth.service.js';

const menuIcon = html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>`;
const backIcon = html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7" /></svg>`;
const searchIcon = html`<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>`;

export class AppHeader extends LitElement {
  static properties = {
    title: { type: String },
    showBack: { type: Boolean },
    showSearch: { type: Boolean },
    showMenu: { type: Boolean },
    menuOpen: { state: true }
  };

  constructor() {
    super();
    this.title = 'CANCIONERO';
    this.showBack = false;
    this.showSearch = true;
    this.showMenu = true;
    this.menuOpen = false;
  }

  createRenderRoot() {
    return this;
  }

  toggleMenu() {
    if (this.showBack) {
      window.history.back();
      return;
    }
    this.menuOpen = !this.menuOpen;
  }

  goPlaylists() {
    this.menuOpen = false;
    navigate('/playlists');
  }

  goData() {
    this.menuOpen = false;
    navigate('/data');
  }

  logout() {
    this.menuOpen = false;
    authService.logout();
    navigate('/login', true);
  }

  search() {
    this.menuOpen = false;
    navigate('/search');
  }

  render() {
    return html`
      <header class="sticky top-0 z-20 bg-brand-primary text-white px-4 h-14 flex items-center justify-between">
        <div class="relative w-8">
          ${this.showMenu || this.showBack ? html`
            <button type="button" aria-label=${this.showBack ? 'Volver' : 'Menú'}
                    class="flex items-center justify-start w-8 h-8" @click=${this.toggleMenu}>
              ${this.showBack ? backIcon : menuIcon}
            </button>
          ` : ''}
          ${!this.showBack && this.menuOpen ? html`
            <div class="absolute left-0 top-9 z-30 w-44 bg-white text-ink-primary rounded-lg shadow-xl border border-ink-border py-1">
              <button type="button" class="block w-full text-left px-4 py-2 text-sm hover:bg-brand-light" @click=${this.goPlaylists}>Mis listas</button>
              <button type="button" class="block w-full text-left px-4 py-2 text-sm hover:bg-brand-light" @click=${this.search}>Buscar</button>
              <button type="button" class="block w-full text-left px-4 py-2 text-sm hover:bg-brand-light" @click=${this.goData}>Datos</button>
              <button type="button" class="block w-full text-left px-4 py-2 text-sm hover:bg-brand-light" @click=${this.logout}>Cerrar sesión</button>
            </div>
          ` : ''}
        </div>
        <h1 class="flex-1 min-w-0 text-center text-sm font-medium tracking-wide uppercase truncate px-2">${this.title}</h1>
        <div class="w-8 flex items-center justify-end h-8">
          ${this.showSearch ? html`<button type="button" aria-label="Buscar" class="flex items-center" @click=${this.search}>${searchIcon}</button>` : ''}
        </div>
      </header>
    `;
  }
}

customElements.define('app-header', AppHeader);
