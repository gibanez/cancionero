import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { navigate } from '../router.js';

export class SongFormView extends LitElement {
  static properties = {
    params: { type: Object },
    query: { type: Object },
    categories: { state: true },
    form: { state: true },
    error: { state: true },
    busy: { state: true },
    ocrBusy: { state: true },
    ocrMessage: { state: true }
  };

  constructor() {
    super();
    this.params = {};
    this.query = new URLSearchParams();
    this.categories = [];
    this.form = { category_id: '', title: '', author: '', lyrics: '' };
    this.error = '';
    this.busy = false;
    this.ocrBusy = false;
    this.ocrMessage = '';
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.form = {
      ...this.form,
      category_id: this.query.get('categoryId') || ''
    };
    try {
      this.categories = await api.get('/categories');
      if (!this.form.category_id && this.categories.length) {
        this.form = { ...this.form, category_id: this.categories[0].id };
      }
      if (this.params.id) {
        const song = await api.get(`/songs/${this.params.id}`);
        this.form = {
          category_id: song.category_id,
          title: song.title,
          author: song.author,
          lyrics: song.lyrics
        };
      }
    } catch (err) {
      this.error = err.message;
    }
  }

  updateField(field, value) {
    this.form = { ...this.form, [field]: value };
  }

  async onFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    this.ocrBusy = true;
    this.ocrMessage = '';
    this.error = '';
    try {
      const result = await api.upload('/ocr/extract', file);
      this.form = {
        ...this.form,
        title: result.suggestedTitle || this.form.title,
        lyrics: result.lyrics || this.form.lyrics
      };
      this.ocrMessage = 'Texto extraído. Revisá los campos antes de guardar.';
    } catch (err) {
      this.error = err.message;
    } finally {
      this.ocrBusy = false;
      event.target.value = '';
    }
  }

  async save(event) {
    event.preventDefault();
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      const payload = {
        category_id: this.form.category_id,
        title: this.form.title,
        author: this.form.author,
        lyrics: this.form.lyrics
      };
      if (this.params.id) {
        await api.put(`/songs/${this.params.id}`, payload);
      } else {
        await api.post('/songs', payload);
      }
      navigate(`/category/${payload.category_id}`);
    } catch (err) {
      this.error = err.message;
    } finally {
      this.busy = false;
    }
  }

  render() {
    const editing = Boolean(this.params.id);
    return html`
      <div class="px-4 pt-4 pb-6">
        <h2 class="text-base font-semibold tracking-wide text-ink-primary">${editing ? 'EDITAR CANCIÓN' : 'NUEVA CANCIÓN'}</h2>

        <div class="mt-4 border-2 border-dashed border-brand-primary/40 rounded-lg p-4 text-center bg-brand-light">
          <p class="text-xs text-ink-secondary">Subí una foto de la letra para completar los campos con OCR.</p>
          <label class="mt-3 inline-block cursor-pointer rounded-lg border border-brand-primary text-brand-primary text-sm px-4 py-2">
            ${this.ocrBusy ? 'Procesando imagen...' : 'Subir o tomar foto de letra'}
            <input type="file" accept="image/*" class="hidden" @change=${this.onFile} />
          </label>
          ${this.ocrMessage ? html`<p class="mt-2 text-xs text-ink-secondary">${this.ocrMessage}</p>` : ''}
        </div>

        <form class="mt-5 space-y-4" @submit=${this.save}>
          <div>
            <label class="block text-xs font-medium text-ink-secondary mb-1" for="category">CATEGORÍA</label>
            <select id="category" required
                    class="w-full rounded-lg border border-ink-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand-primary"
                    .value=${String(this.form.category_id)}
                    @change=${(event) => this.updateField('category_id', event.target.value)}>
              ${this.categories.map((category) => html`<option value="${category.id}">${category.name}</option>`)}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-secondary mb-1" for="title">TÍTULO</label>
            <input id="title" type="text" required class="w-full rounded-lg border border-ink-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-primary"
                   .value=${this.form.title} @input=${(event) => this.updateField('title', event.target.value)} />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-secondary mb-1" for="author">AUTOR</label>
            <input id="author" type="text" required class="w-full rounded-lg border border-ink-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-primary"
                   .value=${this.form.author} @input=${(event) => this.updateField('author', event.target.value)} />
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-secondary mb-1" for="lyrics">LETRA / ACORDES</label>
            <textarea id="lyrics" rows="10" required class="w-full rounded-lg border border-ink-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-primary"
                      .value=${this.form.lyrics} @input=${(event) => this.updateField('lyrics', event.target.value)}></textarea>
          </div>

          ${this.error ? html`<p class="text-sm text-brand-primary">${this.error}</p>` : ''}

          <button type="submit" ?disabled=${this.busy}
                  class="w-full rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-medium py-3 disabled:opacity-60">
            GUARDAR CANCIÓN
          </button>
        </form>
      </div>
    `;
  }
}

customElements.define('song-form-view', SongFormView);
