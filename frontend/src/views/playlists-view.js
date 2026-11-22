import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { navigate } from '../router.js';
import '../components/confirm-modal.js';

export class PlaylistsView extends LitElement {
  static properties = {
    playlists: { state: true },
    creating: { state: true },
    newName: { state: true },
    renamingId: { state: true },
    renameValue: { state: true },
    feedback: { state: true },
    deleteTarget: { state: true },
    deleting: { state: true },
    error: { state: true }
  };

  constructor() {
    super();
    this.playlists = [];
    this.creating = false;
    this.newName = '';
    this.renamingId = null;
    this.renameValue = '';
    this.feedback = '';
    this.deleteTarget = null;
    this.deleting = false;
    this.error = '';
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.load();
  }

  async load() {
    this.error = '';
    try {
      this.playlists = await api.get('/playlists');
    } catch (err) {
      this.error = err.message;
    }
  }

  async create() {
    const name = this.newName.trim();
    if (!name) return;
    try {
      await api.post('/playlists', { name });
      this.newName = '';
      this.creating = false;
      await this.load();
    } catch (err) {
      this.error = err.message;
    }
  }

  startRename(playlist) {
    this.renamingId = playlist.id;
    this.renameValue = playlist.name;
  }

  async saveRename() {
    const name = this.renameValue.trim();
    if (!name || !this.renamingId) return;
    try {
      await api.put(`/playlists/${this.renamingId}`, { name });
      this.renamingId = null;
      await this.load();
    } catch (err) {
      this.error = err.message;
    }
  }

  askDelete(playlist) {
    this.error = '';
    this.deleteTarget = playlist;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async confirmDelete() {
    const playlist = this.deleteTarget;
    if (!playlist || this.deleting) return;

    this.deleting = true;
    this.error = '';
    try {
      await api.delete(`/playlists/${playlist.id}`);
      this.deleteTarget = null;
      await this.load();
      this.feedback = 'Lista eliminada.';
    } catch (err) {
      this.error = err.message;
      this.feedback = '';
    } finally {
      this.deleting = false;
    }
  }

  get deleteMessage() {
    if (!this.deleteTarget) return '';
    const detail = this.deleteTarget.is_public
      ? '\n\nEl enlace público dejará de funcionar.'
      : '';
    return `¿Eliminar la lista "${this.deleteTarget.name}"?${detail}\n\nEsta acción no se puede deshacer.`;
  }

  async share(playlist) {
    try {
      const result = await api.post(`/playlists/${playlist.id}/share`);
      const url = `${window.location.origin}${result.publicUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Cancionero',
            text: `Mirá mi lista "${playlist.name}"`,
            url
          });
          this.feedback = 'Lista compartida.';
        } catch (err) {
          if (err && err.name === 'AbortError') {
            this.feedback = 'Compartir cancelado.';
          } else {
            this.error = err.message || 'No se pudo compartir la lista';
          }
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          this.feedback = `Enlace copiado: ${url}`;
        } catch (err) {
          this.feedback = `Enlace público: ${url}`;
        }
      }

      await this.load();
    } catch (err) {
      this.error = err.message;
    }
  }

  render() {
    return html`
      <div class="px-4 pt-4 pb-6">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold tracking-wide text-ink-primary">MIS LISTAS</h2>
          <button type="button" class="text-brand-primary text-sm font-medium" @click=${() => { this.creating = true; }}>+ Nueva lista</button>
        </div>

        ${this.creating ? html`
          <div class="mt-4 flex gap-2">
            <input class="flex-1 rounded-lg border border-ink-border px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                   placeholder="Nombre de la lista" .value=${this.newName}
                   @input=${(event) => { this.newName = event.target.value; }} />
            <button type="button" class="rounded-lg bg-brand-primary text-white px-4 text-sm" @click=${this.create}>Guardar</button>
          </div>
        ` : ''}

        ${this.error ? html`<p class="mt-3 text-sm text-brand-primary">${this.error}</p>` : ''}
        ${this.feedback ? html`<p class="mt-3 text-xs text-ink-secondary break-all">${this.feedback}</p>` : ''}

        <div class="mt-4 space-y-3">
          ${this.playlists.length === 0 ? html`
            <p class="py-8 text-center text-sm text-ink-secondary">Todavía no tenés listas.</p>
          ` : this.playlists.map((playlist) => html`
            <div class="rounded-lg border border-ink-border p-4">
              ${this.renamingId === playlist.id ? html`
                <div class="flex gap-2">
                  <input class="flex-1 rounded border border-ink-border px-2 py-1.5 text-sm"
                         .value=${this.renameValue}
                         @input=${(event) => { this.renameValue = event.target.value; }} />
                  <button type="button" class="text-sm text-brand-primary" @click=${this.saveRename}>OK</button>
                </div>
              ` : html`
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-ink-primary">${playlist.name}</p>
                    <p class="text-xs text-ink-secondary mt-0.5">${playlist.songCount} canciones${playlist.is_public ? ' · pública' : ''}</p>
                  </div>
                  <button type="button" class="text-brand-primary text-sm" @click=${() => navigate(`/playlists/${playlist.id}`)}>Ver</button>
                </div>
              `}
              <div class="mt-3 flex flex-wrap gap-4 text-xs text-ink-secondary">
                <button type="button" class="hover:text-brand-primary" @click=${() => this.startRename(playlist)}>Renombrar</button>
                <button type="button" class="hover:text-brand-primary" @click=${() => this.share(playlist)}>Compartir</button>
                <button type="button" class="text-brand-primary hover:underline" @click=${() => this.askDelete(playlist)}>Eliminar</button>
              </div>
            </div>
          `)}
        </div>
      </div>

      <confirm-modal
        .open=${Boolean(this.deleteTarget)}
        .title=${'ELIMINAR LISTA'}
        .message=${this.deleteMessage}
        .confirmLabel=${'ELIMINAR'}
        .busy=${this.deleting}
        .error=${this.error}
        .onCancel=${() => this.cancelDelete()}
        .onConfirm=${() => this.confirmDelete()}
      ></confirm-modal>
    `;
  }
}

customElements.define('playlists-view', PlaylistsView);
