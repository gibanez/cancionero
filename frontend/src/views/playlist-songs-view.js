import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { navigate } from '../router.js';

export class PlaylistSongsView extends LitElement {
  static properties = {
    params: { type: Object },
    songs: { state: true },
    error: { state: true }
  };

  constructor() {
    super();
    this.params = {};
    this.songs = [];
    this.error = '';
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      const [songs, playlists] = await Promise.all([
        api.get(`/playlists/${this.params.id}/songs`),
        api.get('/playlists')
      ]);
      this.songs = songs;
      const playlist = playlists.find((item) => String(item.id) === String(this.params.id));
      if (playlist) {
        this.dispatchEvent(new CustomEvent('title-change', {
          detail: playlist.name,
          bubbles: true,
          composed: true
        }));
      }
    } catch (err) {
      this.error = err.message;
    }
  }

  render() {
    return html`
      <div class="px-4 pt-4 pb-6">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold tracking-wide text-ink-primary">CANCIONES DE LA LISTA</h2>
          <button type="button" class="text-brand-primary text-sm" @click=${() => navigate('/search')}>+ Agregar canciones</button>
        </div>
        ${this.error ? html`<p class="mt-3 text-sm text-brand-primary">${this.error}</p>` : ''}
        <div class="mt-3">
          ${this.songs.length === 0 ? html`
            <p class="py-8 text-center text-sm text-ink-secondary">Esta lista está vacía.</p>
          ` : this.songs.map((song, index) => html`
            <button type="button" class="w-full border-b border-ink-border py-3 flex items-center gap-3 text-left"
                    @click=${() => navigate(`/songs/${song.id}`)}>
              <span class="w-8 shrink-0 font-medium text-brand-primary">${index + 1}</span>
              <span class="min-w-0">
                <span class="block font-medium text-ink-primary truncate">${song.title}</span>
                <span class="block text-xs text-ink-secondary truncate">${song.author}</span>
              </span>
            </button>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('playlist-songs-view', PlaylistSongsView);
