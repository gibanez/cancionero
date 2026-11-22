import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { navigate } from '../router.js';
import '../components/song-row.js';
import '../components/playlist-modal.js';
import '../components/confirm-modal.js';

export class SongsListView extends LitElement {
  static properties = {
    params: { type: Object },
    query: { type: Object },
    mode: { type: String },
    songs: { state: true },
    searchTerm: { state: true },
    modalOpen: { state: true },
    selectedSong: { state: true },
    deleteTarget: { state: true },
    deleting: { state: true },
    error: { state: true }
  };

  constructor() {
    super();
    this.params = {};
    this.query = new URLSearchParams();
    this.mode = 'category';
    this.songs = [];
    this.searchTerm = '';
    this.modalOpen = false;
    this.selectedSong = null;
    this.deleteTarget = null;
    this.deleting = false;
    this.error = '';
    this.searchTimer = null;
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.searchTerm = this.query.get('q') || '';
    await this.loadCategoryName();
    await this.loadSongs();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.searchTimer);
  }

  async loadCategoryName() {
    if (this.mode !== 'category' || !this.params.id) return;
    try {
      const categories = await api.get('/categories');
      const category = categories.find((item) => String(item.id) === String(this.params.id));
      if (category) {
        const title = category.name.replace(/^CANCIONES DE /, '');
        this.dispatchEvent(new CustomEvent('title-change', {
          detail: title,
          bubbles: true,
          composed: true
        }));
      }
    } catch (err) {
      this.error = err.message;
    }
  }

  async loadSongs() {
    this.error = '';
    const filters = new URLSearchParams();
    if (this.mode === 'category' && this.params.id) {
      filters.set('categoryId', this.params.id);
    }
    if (this.mode === 'search' && this.searchTerm.trim()) {
      filters.set('q', this.searchTerm.trim());
    }
    const suffix = filters.toString() ? `?${filters.toString()}` : '';
    try {
      this.songs = await api.get(`/songs${suffix}`);
    } catch (err) {
      this.error = err.message;
      this.songs = [];
    }
  }

  onSearchInput(event) {
    this.searchTerm = event.target.value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadSongs(), 250);
  }

  view(song) {
    navigate(`/songs/${song.id}`);
  }

  edit(song) {
    navigate(`/songs/edit/${song.id}`);
  }

  add(song) {
    this.selectedSong = song;
    this.modalOpen = true;
  }

  closePicker() {
    this.modalOpen = false;
    this.selectedSong = null;
  }

  askDelete(song) {
    this.error = '';
    this.deleteTarget = song;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async confirmDelete() {
    const song = this.deleteTarget;
    if (!song || this.deleting) return;

    this.deleting = true;
    this.error = '';
    try {
      await api.delete(`/songs/${song.id}`);
      this.deleteTarget = null;
      await this.loadSongs();
    } catch (err) {
      this.error = err.message;
    } finally {
      this.deleting = false;
    }
  }

  get deleteMessage() {
    if (!this.deleteTarget) return '';
    return `¿Eliminar la canción "${this.deleteTarget.title}"?\n\nEsta acción no se puede deshacer.`;
  }

  newSong() {
    const categoryId = this.mode === 'category' ? `?categoryId=${this.params.id}` : '';
    navigate(`/songs/new${categoryId}`);
  }

  render() {
    const isSearch = this.mode === 'search';
    const heading = isSearch ? 'RESULTADOS DE BÚSQUEDA' : 'LISTA DE CANCIONES';

    return html`
      <div class="px-4 pt-4 pb-6">
        ${isSearch ? html`
          <input type="search" placeholder="Buscar canción o autor..."
                 class="w-full rounded-lg border border-ink-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-primary"
                 .value=${this.searchTerm} @input=${this.onSearchInput} />
        ` : ''}

        <div class="mt-4 flex items-end justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold tracking-wide text-ink-primary">${heading}</h2>
            <p class="text-xs text-ink-secondary mt-0.5">Subtitulo: ${this.songs.length} canciones</p>
          </div>
          <button type="button" class="shrink-0 text-brand-primary text-sm font-medium" @click=${this.newSong}>+ Nueva Canción</button>
        </div>

        ${this.error ? html`<p class="mt-3 text-sm text-brand-primary">${this.error}</p>` : ''}

        <div class="mt-3">
          ${this.songs.length === 0 ? html`
            <p class="py-8 text-center text-sm text-ink-secondary">No hay canciones para mostrar.</p>
          ` : this.songs.map((song, index) => html`
            <song-row .index=${index + 1} .song=${song}
                      .onAdd=${(item) => this.add(item)}
                      .onView=${(item) => this.view(item)}
                      .onEdit=${(item) => this.edit(item)}
                      .onDelete=${(item) => this.askDelete(item)}></song-row>
          `)}
        </div>

        <playlist-modal .open=${this.modalOpen} .song=${this.selectedSong}
                        .onCancel=${() => this.closePicker()}
                        .onConfirm=${() => this.closePicker()}></playlist-modal>

        <confirm-modal
          .open=${Boolean(this.deleteTarget)}
          .title=${'ELIMINAR CANCIÓN'}
          .message=${this.deleteMessage}
          .confirmLabel=${'ELIMINAR'}
          .busy=${this.deleting}
          .error=${this.error}
          .onCancel=${() => this.cancelDelete()}
          .onConfirm=${() => this.confirmDelete()}
        ></confirm-modal>
      </div>
    `;
  }
}

customElements.define('songs-list-view', SongsListView);
