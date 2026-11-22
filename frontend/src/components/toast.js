import { LitElement, html } from 'lit';

export class ToastMessage extends LitElement {
  static properties = {
    message: { type: String },
    type: { type: String }
  };

  constructor() {
    super();
    this.message = '';
    this.type = 'success';
  }

  createRenderRoot() {
    return this;
  }

  render() {
    const color = this.type === 'error' ? 'bg-brand-primary' : 'bg-ink-primary';
    const icon = this.type === 'error' ? '!' : '✓';
    return html`
      <div class="${color} text-white text-sm rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 max-w-full">
        <span class="font-semibold">${icon}</span>
        <span class="truncate">${this.message}</span>
      </div>
    `;
  }
}

customElements.define('toast-message', ToastMessage);
