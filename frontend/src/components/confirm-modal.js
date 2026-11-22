import { LitElement, html } from 'lit';

const trashIcon = html`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>`;

export class ConfirmModal extends LitElement {
  static properties = {
    open: { type: Boolean },
    title: { type: String },
    message: { type: String },
    confirmLabel: { type: String },
    busy: { type: Boolean },
    error: { type: String },
    onCancel: { type: Object },
    onConfirm: { type: Object }
  };

  constructor() {
    super();
    this.open = false;
    this.title = 'CONFIRMAR';
    this.message = '';
    this.confirmLabel = 'ELIMINAR';
    this.busy = false;
    this.error = '';
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onKeydown);
  }

  onKeydown = (event) => {
    if (this.open && event.key === 'Escape') this.cancel();
  };

  cancel() {
    if (this.busy) return;
    this.open = false;
    if (this.onCancel) this.onCancel();
  }

  confirm() {
    if (this.busy || !this.onConfirm) return;
    this.onConfirm();
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
           role="presentation" @click=${() => this.cancel()}>
        <div class="bg-white rounded-lg w-full max-w-sm p-5 shadow-2xl"
             role="alertdialog" aria-modal="true" aria-label=${this.title}
             @click=${(event) => event.stopPropagation()}>
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-brand-light text-brand-primary flex items-center justify-center">
              ${trashIcon}
            </div>
            <h2 class="mt-3 text-sm font-semibold tracking-wide text-ink-primary">${this.title}</h2>
            <p class="mt-2 text-sm text-ink-secondary whitespace-pre-line">${this.message}</p>
          </div>

          ${this.error ? html`<p class="mt-4 text-xs text-brand-primary text-center">${this.error}</p>` : ''}

          <div class="mt-6 flex items-center justify-end gap-4">
            <button type="button" class="text-sm text-ink-secondary disabled:opacity-50"
                    ?disabled=${this.busy} @click=${() => this.cancel()}>CANCELAR</button>
            <button type="button" class="bg-brand-primary hover:bg-brand-hover text-white text-sm font-medium rounded-lg px-5 py-2 disabled:opacity-50"
                    ?disabled=${this.busy} @click=${() => this.confirm()}>
              ${this.busy ? 'ELIMINANDO...' : this.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('confirm-modal', ConfirmModal);
