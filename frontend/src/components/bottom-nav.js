import { LitElement, html } from 'lit';
import { navigate } from '../router.js';

const homeIcon = html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>`;
const listIcon = html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>`;
const searchIcon = html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>`;

export class BottomNav extends LitElement {
  static properties = {
    active: { type: String }
  };

  constructor() {
    super();
    this.active = 'inicio';
  }

  createRenderRoot() {
    return this;
  }

  go(path) {
    navigate(path);
  }

  item(key, label, icon, path) {
    const active = this.active === key;
    return html`
      <button type="button" class="flex flex-col items-center justify-center gap-0.5 ${active ? 'text-brand-primary' : 'text-ink-secondary'}"
              @click=${() => this.go(path)}>
        ${icon}
        <span class="text-[11px] ${active ? 'font-semibold' : ''}">${label}</span>
      </button>
    `;
  }

  render() {
    return html`
      <nav class="fixed bottom-0 w-full max-w-md bg-surface-nav border-t border-ink-border h-16 grid grid-cols-3 z-20">
        ${this.item('inicio', 'Inicio', homeIcon, '/')}
        ${this.item('listas', 'Listas', listIcon, '/playlists')}
        ${this.item('buscar', 'Buscar', searchIcon, '/search')}
      </nav>
    `;
  }
}

customElements.define('bottom-nav', BottomNav);
