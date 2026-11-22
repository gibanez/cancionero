import { LitElement, html } from 'lit';
import { api } from '../services/api.service.js';
import { showToast } from '../services/toast.service.js';

export class DataView extends LitElement {
  static properties = {
    file: { state: true },
    busy: { state: true },
    message: { state: true },
    error: { state: true }
  };

  constructor() {
    super();
    this.file = null;
    this.busy = false;
    this.message = '';
    this.error = '';
  }

  createRenderRoot() {
    return this;
  }

  async export(format) {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.message = '';
    try {
      const payload = await api.get(`/data/export?format=${format}`);
      const blob = new Blob([payload.content], { type: payload.contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.filename || `cancionero.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const label = format === 'csv' ? 'CSV' : 'JSON';
      this.message = `Descarga de ${label} iniciada.`;
      showToast(`Exportación ${label} lista`);
    } catch (err) {
      this.error = err.message;
      showToast(err.message, 'error');
    } finally {
      this.busy = false;
    }
  }

  onFileChange(event) {
    this.file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    this.error = '';
    this.message = '';
  }

  async importFile() {
    if (!this.file || this.busy) return;
    this.busy = true;
    this.error = '';
    this.message = '';
    try {
      const name = this.file.name.toLowerCase();
      const format = name.endsWith('.csv') ? 'csv' : 'json';
      const content = await this.file.text();
      const result = await api.post('/data/import', { format, content });
      this.message = result.mensaje;
      showToast(result.mensaje);
      this.file = null;
      const input = this.querySelector('input[type="file"]');
      if (input) input.value = '';
    } catch (err) {
      this.error = err.message;
      showToast(err.message, 'error');
    } finally {
      this.busy = false;
    }
  }

  render() {
    return html`
      <div class="px-4 pt-4 pb-8 space-y-6">
        <section>
          <h2 class="text-sm font-semibold tracking-wide text-ink-primary">EXPORTAR DATOS</h2>
          <p class="mt-1 text-xs text-ink-secondary">
            Guardá una copia de tus categorías, canciones y listas.
          </p>
          <div class="mt-3 flex gap-3">
            <button type="button" class="flex-1 rounded-lg bg-brand-primary text-white py-2.5 text-sm font-medium disabled:opacity-50"
                    ?disabled=${this.busy} @click=${() => this.export('json')}>
              Descargar JSON
            </button>
            <button type="button" class="flex-1 rounded-lg border border-ink-border text-ink-primary py-2.5 text-sm font-medium disabled:opacity-50"
                    ?disabled=${this.busy} @click=${() => this.export('csv')}>
              Descargar CSV
            </button>
          </div>
          <p class="mt-2 text-[11px] text-ink-secondary">
            El JSON conserva las listas y sus canciones. El CSV es ideal para editar en una planilla.
          </p>
        </section>

        <section class="border-t border-ink-border pt-5">
          <h2 class="text-sm font-semibold tracking-wide text-ink-primary">IMPORTAR DATOS</h2>
          <p class="mt-1 text-xs text-ink-secondary">
            Elegí un archivo <strong>.json</strong> o <strong>.csv</strong> para agregar canciones a tu repertorio.
          </p>
          <input type="file" accept=".json,.csv,application/json,text/csv"
                 class="mt-3 block w-full text-xs text-ink-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                 @change=${this.onFileChange} />
          ${this.file ? html`<p class="mt-2 text-xs text-ink-primary truncate">Archivo: ${this.file.name}</p>` : ''}
          <button type="button" class="mt-3 w-full rounded-lg bg-brand-primary text-white py-2.5 text-sm font-medium disabled:opacity-50"
                  ?disabled=${!this.file || this.busy} @click=${() => this.importFile()}>
            ${this.busy ? 'Importando...' : 'Importar archivo'}
          </button>
          <p class="mt-2 text-[11px] text-ink-secondary">
            La importación agrega lo que falta y no borra ni sobrescribe lo que ya tenés. Las listas se importan como privadas.
          </p>
          ${this.message ? html`<p class="mt-3 text-xs text-ink-primary">${this.message}</p>` : ''}
          ${this.error ? html`<p class="mt-3 text-xs text-brand-primary">${this.error}</p>` : ''}
        </section>

        <section class="rounded-lg bg-surface-nav p-4">
          <h3 class="text-xs font-semibold tracking-wide text-ink-secondary">CONSEJO</h3>
          <p class="mt-2 text-xs text-ink-secondary leading-5">
            Usá el JSON para migrar entre dispositivos o el CSV para cargar muchas canciones a la vez.
            En el CSV las columnas son: <code>categoria, titulo, autor, letra, listas</code>.
            En <code>listas</code> separá los nombres con <code>|</code>.
          </p>
        </section>
      </div>
    `;
  }
}

customElements.define('data-view', DataView);
