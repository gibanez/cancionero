import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { navigate } from '../router.js';
import '../components/confirm-modal.js';

const chevron = html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>`;
const trashIcon = html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>`;

export class CategoriesView extends LitElement {
  static properties = {
    categories: { state: true },
    creating: { state: true },
    newName: { state: true },
    feedback: { state: true },
    deleteTarget: { state: true },
    deleting: { state: true },
    error: { state: true }
  };

  constructor() {
    super();
    this.categories = [];
    this.creating = false;
    this.newName = '';
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
    try {
      this.categories = await api.get('/categories');
    } catch (err) {
      this.error = err.message;
    }
  }

  open(id) {
    navigate(`/category/${id}`);
  }

  async create() {
    const name = this.newName.trim();
    if (!name) return;
    this.error = '';
    try {
      const created = await api.post('/categories', { name });
      this.categories = [...this.categories, created];
      this.newName = '';
      this.creating = false;
      this.feedback = 'Categoría creada.';
    } catch (err) {
      this.error = err.message;
    }
  }

  askDelete(category) {
    this.error = '';
    this.deleteTarget = category;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async confirmDelete() {
    const category = this.deleteTarget;
    if (!category || this.deleting) return;

    this.deleting = true;
    this.error = '';
    try {
      await api.delete(`/categories/${category.id}`);
      this.categories = this.categories.filter((item) => item.id !== category.id);
      this.feedback = 'Categoría eliminada.';
      this.deleteTarget = null;
    } catch (err) {
      this.error = err.message;
      this.feedback = '';
    } finally {
      this.deleting = false;
    }
  }

  get deleteMessage() {
    if (!this.deleteTarget) return '';
    const detail = this.deleteTarget.songCount
      ? `\n\nSe eliminarán también sus ${this.deleteTarget.songCount} canción(es). Esta acción no se puede deshacer.`
      : '\n\nEsta acción no se puede deshacer.';
    return `¿Eliminar la categoría "${this.deleteTarget.name}"?${detail}`;
  }

  render() {
    return html`
      <div class="px-4 pt-5 pb-6">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold tracking-wide text-ink-primary">EXPLORAR CATEGORÍAS</h2>
          <button type="button" class="shrink-0 text-brand-primary text-sm font-medium"
                  @click=${() => { this.creating = !this.creating; }}>
            ${this.creating ? 'Cancelar' : '+ Nueva categoría'}
          </button>
        </div>

        ${this.creating ? html`
          <div class="mt-4 flex gap-2">
            <input class="flex-1 rounded-lg border border-ink-border px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                   placeholder="Nombre de la categoría" .value=${this.newName}
                   @input=${(event) => { this.newName = event.target.value; }} />
            <button type="button" class="rounded-lg bg-brand-primary text-white px-4 text-sm"
                    @click=${this.create}>Guardar</button>
          </div>
        ` : ''}

        ${this.error ? html`<p class="mt-4 text-sm text-brand-primary">${this.error}</p>` : ''}
        ${this.feedback ? html`<p class="mt-4 text-xs text-ink-secondary">${this.feedback}</p>` : ''}
        <div class="mt-4 space-y-3">
          ${this.categories.map((category) => html`
            <div class="bg-brand-primary hover:bg-brand-hover text-white rounded-lg flex items-center">
              <button type="button" class="flex-1 min-w-0 p-4 text-left flex justify-between items-center gap-2"
                      @click=${() => this.open(category.id)}>
                <span class="min-w-0">
                  <span class="block font-semibold tracking-wide truncate">${category.name}</span>
                  <span class="block text-xs text-white/80 mt-1">Subtitle: ${category.songCount} canciones</span>
                </span>
                ${chevron}
              </button>
              <button type="button" aria-label="Eliminar categoría" title="Eliminar categoría"
                      class="shrink-0 p-4 pl-1 text-white/80 hover:text-white"
                      @click=${() => this.askDelete(category)}>
                ${trashIcon}
              </button>
            </div>
          `)}
        </div>
      </div>

      <confirm-modal
        .open=${Boolean(this.deleteTarget)}
        .title=${'ELIMINAR CATEGORÍA'}
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

customElements.define('categories-view', CategoriesView);
