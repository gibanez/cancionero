import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';

export class PlaylistModal extends LitElement {
  static properties = {
    open: { type: Boolean },
    song: { type: Object },
    playlists: { type: Array },
    selectedIds: { type: Array },
    creating: { state: true },
    newName: { state: true },
    error: { state: true },
    busy: { state: true },
    onCancel: { type: Object },
    onConfirm: { type: Object }
  };

  constructor() {
    super();
    this.open = false;
    this.song = null;
    this.playlists = [];
    this.selectedIds = [];
    this.creating = false;
    this.newName = '';
    this.error = '';
    this.busy = false;
  }

  createRenderRoot() {
    return this;
  }

  updated(changed) {
    if (this.open && (changed.has('open') || changed.has('song'))) {
      // Cargar fuera del ciclo de actualización para no encadenar otro update.
      queueMicrotask(() => this.load());
    }
  }

  async load() {
    this.error = '';
    this.selectedIds = [];
    this.newName = '';
    this.creating = false;
    try {
      this.playlists = await api.get('/playlists');
    } catch (err) {
      this.error = err.message;
      this.playlists = [];
    }
  }

  toggle(id) {
    this.selectedIds = this.selectedIds.includes(id)
      ? this.selectedIds.filter((item) => item !== id)
      : [...this.selectedIds, id];
  }

  async createList() {
    const name = this.newName.trim();
    if (!name || this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      const created = await api.post('/playlists', { name });
      this.playlists = [...this.playlists, created];
      this.selectedIds = [...this.selectedIds, created.id];
      this.newName = '';
      this.creating = false;
    } catch (err) {
      this.error = err.message;
    } finally {
      this.busy = false;
    }
  }

  async confirm() {
    if (!this.song || this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      for (const id of this.selectedIds) {
        await api.post(`/playlists/${id}/songs`, { songId: this.song.id });
      }
      if (this.onConfirm) this.onConfirm(this.selectedIds.length);
    } catch (err) {
      this.error = err.message;
    } finally {
      this.busy = false;
    }
  }

  cancel() {
    if (this.onCancel) this.onCancel();
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg w-full max-w-sm p-5 shadow-2xl">
          <h2 class="text-center font-semibold text-ink-primary text-sm tracking-wide">AGREGAR A LISTA DE REPRODUCCIÓN</h2>
          <p class="mt-2 text-xs text-ink-secondary text-center">
            Seleccione una lista para añadir: "${this.song ? this.song.title : ''}" (${this.song ? this.song.author : ''})
          </p>

          <div class="mt-4 max-h-52 overflow-y-auto divide-y divide-ink-border border-y border-ink-border">
            ${this.playlists.length === 0 ? html`
              <p class="py-4 text-sm text-ink-secondary text-center">No tenés listas todavía.</p>
            ` : this.playlists.map((playlist) => html`
              <button type="button" class="w-full flex items-center justify-between py-3 text-left"
                      @click=${() => this.toggle(playlist.id)}>
                <span class="text-sm text-ink-primary">${playlist.name}</span>
                <span class="${this.selectedIds.includes(playlist.id) ? 'text-brand-primary' : 'text-transparent'} text-lg">✓</span>
              </button>
            `)}
          </div>

          ${this.creating ? html`
            <div class="mt-3 flex gap-2">
              <input class="flex-1 border border-ink-border rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                     placeholder="Nombre de la lista" .value=${this.newName}
                     @input=${(event) => { this.newName = event.target.value; }} />
              <button type="button" class="px-3 py-2 rounded bg-brand-primary text-white text-sm" @click=${this.createList}>Guardar</button>
            </div>
          ` : html`
            <button type="button" class="mt-4 w-full border border-ink-border rounded-lg py-2.5 text-sm text-ink-primary hover:bg-brand-light"
                    @click=${() => { this.creating = true; }}>CREAR NUEVA LISTA</button>
          `}

          ${this.error ? html`<p class="mt-3 text-xs text-brand-primary">${this.error}</p>` : ''}

          <div class="mt-5 flex items-center justify-end gap-4">
            <button type="button" class="text-sm text-ink-secondary" @click=${this.cancel}>CANCELAR</button>
            <button type="button" class="bg-brand-primary hover:bg-brand-hover text-white text-sm font-medium rounded-lg px-5 py-2 disabled:opacity-50"
                    ?disabled=${this.busy} @click=${this.confirm}>CONFIRMAR</button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('playlist-modal', PlaylistModal);
