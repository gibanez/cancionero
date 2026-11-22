import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';

export class PublicPlaylistView extends LitElement {
  static properties = {
    params: { type: Object },
    playlist: { state: true },
    openSongId: { state: true },
    error: { state: true }
  };

  constructor() {
    super();
    this.params = {};
    this.playlist = null;
    this.openSongId = null;
    this.error = '';
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      this.playlist = await api.get(`/public/playlists/${this.params.token}`);
      this.dispatchEvent(new CustomEvent('title-change', {
        detail: this.playlist.name,
        bubbles: true,
        composed: true
      }));
    } catch (err) {
      this.error = err.message;
    }
  }

  toggle(id) {
    this.openSongId = this.openSongId === id ? null : id;
  }

  render() {
    if (this.error) {
      return html`<div class="min-h-screen flex items-center justify-center px-6">
        <div class="bg-white rounded-lg border border-ink-border p-6 text-center">
          <h1 class="text-lg font-semibold text-brand-primary">CANCIONERO</h1>
          <p class="mt-3 text-sm text-ink-secondary">${this.error}</p>
        </div>
      </div>`;
    }
    if (!this.playlist) {
      return html`<div class="min-h-screen flex items-center justify-center text-sm text-ink-secondary">Cargando...</div>`;
    }

    return html`
      <div class="px-4 pt-4 pb-8">
        <h2 class="text-base font-semibold tracking-wide text-ink-primary">${this.playlist.name}</h2>
        <p class="text-xs text-ink-secondary mt-0.5">${this.playlist.songs.length} canciones</p>

        <div class="mt-4 divide-y divide-ink-border border-t border-ink-border">
          ${this.playlist.songs.map((song, index) => html`
            <div>
              <button type="button" class="w-full py-3 flex items-center gap-3 text-left"
                      @click=${() => this.toggle(song.id)}>
                <span class="w-8 shrink-0 font-medium text-brand-primary">${index + 1}</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-medium text-ink-primary truncate">${song.title}</span>
                  <span class="block text-xs text-ink-secondary truncate">${song.author}</span>
                </span>
                <span class="text-ink-secondary text-sm">${this.openSongId === song.id ? '−' : '+'}</span>
              </button>
              ${this.openSongId === song.id ? html`
                <pre class="whitespace-pre-wrap font-sans text-sm leading-7 text-ink-primary bg-brand-light rounded-lg p-4 mb-3">${song.lyrics}</pre>
              ` : ''}
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('public-playlist-view', PublicPlaylistView);
