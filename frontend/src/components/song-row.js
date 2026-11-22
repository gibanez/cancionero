import { LitElement, html } from 'lit';

const plusIcon = html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>`;

export class SongRow extends LitElement {
  static properties = {
    index: { type: Number },
    song: { type: Object },
    menuOpen: { state: true },
    onAdd: { type: Object },
    onView: { type: Object },
    onEdit: { type: Object },
    onDelete: { type: Object }
  };

  constructor() {
    super();
    this.index = 1;
    this.song = {};
    this.menuOpen = false;
  }

  createRenderRoot() {
    return this;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  act(callback) {
    this.menuOpen = false;
    if (callback && this.song) callback(this.song);
  }

  render() {
    if (!this.song) return html``;

    return html`
      <div class="border-b border-ink-border py-3 flex items-center justify-between gap-2">
        <span class="w-8 shrink-0 font-medium text-brand-primary">${this.index}</span>
        <button type="button" class="flex-1 min-w-0 text-left" @click=${() => this.act(this.onView)}>
          <div class="font-medium text-ink-primary truncate">${this.song.title}</div>
          <div class="text-xs text-ink-secondary truncate">${this.song.author}</div>
        </button>
        <div class="relative flex items-center gap-1 shrink-0">
          <button type="button" class="flex flex-col items-center text-brand-primary hover:text-brand-hover"
                  @click=${() => this.act(this.onAdd)}>
            ${plusIcon}
            <span class="text-[10px]">Añadir</span>
          </button>
          <button type="button" aria-label="Acciones" class="px-1 text-xl leading-none text-ink-secondary"
                  @click=${this.toggleMenu}>⋮</button>
          ${this.menuOpen ? html`
            <div class="absolute right-0 top-9 z-10 w-28 bg-white rounded-lg shadow-xl border border-ink-border py-1">
              <button type="button" class="block w-full text-left px-3 py-2 text-sm hover:bg-brand-light" @click=${() => this.act(this.onView)}>Ver</button>
              <button type="button" class="block w-full text-left px-3 py-2 text-sm hover:bg-brand-light" @click=${() => this.act(this.onEdit)}>Editar</button>
              <button type="button" class="block w-full text-left px-3 py-2 text-sm text-brand-primary hover:bg-brand-light" @click=${() => this.act(this.onDelete)}>Eliminar</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('song-row', SongRow);
