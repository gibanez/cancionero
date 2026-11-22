import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { navigate } from '../router.js';

const chevron = html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>`;

export class CategoriesView extends LitElement {
  static properties = {
    categories: { state: true },
    creating: { state: true },
    newName: { state: true },
    error: { state: true }
  };

  constructor() {
    super();
    this.categories = [];
    this.creating = false;
    this.newName = '';
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
    } catch (err) {
      this.error = err.message;
    }
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
        <div class="mt-4 space-y-3">
          ${this.categories.map((category) => html`
            <button type="button" class="w-full bg-brand-primary hover:bg-brand-hover text-white p-4 rounded-lg flex justify-between items-center text-left"
                    @click=${() => this.open(category.id)}>
              <span>
                <span class="block font-semibold tracking-wide">${category.name}</span>
                <span class="block text-xs text-white/80 mt-1">Subtitle: ${category.songCount} canciones</span>
              </span>
              ${chevron}
            </button>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('categories-view', CategoriesView);
