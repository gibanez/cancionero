import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { navigate } from '../router.js';
import '../components/playlist-modal.js';

export class SongDetailView extends LitElement {
  static properties = {
    params: { type: Object },
    song: { state: true },
    error: { state: true },
    modalOpen: { state: true }
  };

  constructor() {
    super();
    this.params = {};
    this.song = null;
    this.error = '';
    this.modalOpen = false;
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      this.song = await api.get(`/songs/${this.params.id}`);
      this.dispatchEvent(new CustomEvent('title-change', {
        detail: this.song.title,
        bubbles: true,
        composed: true
      }));
    } catch (err) {
      this.error = err.message;
    }
  }

  render() {
    if (this.error) {
      return html`<div class="px-4 pt-6"><p class="text-sm text-brand-primary">${this.error}</p></div>`;
    }
    if (!this.song) {
      return html`<div class="px-4 pt-6"><p class="text-sm text-ink-secondary">Cargando...</p></div>`;
    }

    return html`
      <div class="px-4 pt-5 pb-6">
        <h2 class="text-xl font-semibold text-ink-primary">${this.song.title}</h2>
        <p class="mt-1 text-sm text-ink-secondary">${this.song.author}</p>
        <p class="mt-1 text-xs text-ink-secondary">${this.song.category_name}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="flex-1 rounded-lg bg-brand-primary text-white py-2.5 text-sm font-medium"
                  @click=${() => { this.modalOpen = true; }}>Añadir a lista</button>
          <button type="button" class="flex-1 rounded-lg border border-ink-border py-2.5 text-sm text-ink-primary"
                  @click=${() => navigate(`/songs/edit/${this.song.id}`)}>Editar</button>
        </div>

        <div class="mt-6 border-t border-ink-border pt-5">
          <h3 class="text-xs font-semibold tracking-wide text-ink-secondary mb-3">LETRA / ACORDES</h3>
          <pre class="whitespace-pre-wrap font-sans text-sm leading-7 text-ink-primary">${this.song.lyrics}</pre>
        </div>

        <playlist-modal .open=${this.modalOpen} .song=${this.song}></playlist-modal>
      </div>
    `;
  }
}

customElements.define('song-detail-view', SongDetailView);
