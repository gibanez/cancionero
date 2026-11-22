import { LitElement, html } from 'lit';
import { authService } from '../services/auth.service.js';
import { navigate } from '../router.js';

export class LoginView extends LitElement {
  static properties = {
    username: { state: true },
    password: { state: true },
    error: { state: true },
    busy: { state: true }
  };

  constructor() {
    super();
    this.username = '';
    this.password = '';
    this.error = '';
    this.busy = false;
  }

  createRenderRoot() {
    return this;
  }

  async submit(event) {
    event.preventDefault();
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      await authService.login(this.username.trim(), this.password);
      navigate('/', true);
    } catch (err) {
      this.error = err.message;
    } finally {
      this.busy = false;
    }
  }

  render() {
    return html`
      <div class="min-h-screen flex items-center justify-center px-6 bg-surface-base">
        <div class="w-full max-w-sm">
          <h1 class="text-center text-3xl font-bold tracking-wide text-brand-primary">CANCIONERO</h1>
          <p class="mt-2 text-center text-sm text-ink-secondary">Tus canciones, siempre a mano</p>

          <form class="mt-8 space-y-4" @submit=${this.submit}>
            <div>
              <label class="block text-xs font-medium text-ink-secondary mb-1" for="username">USUARIO</label>
              <input id="username" type="text" autocomplete="username" required
                     class="w-full rounded-lg border border-ink-border px-3 py-3 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                     .value=${this.username}
                     @input=${(event) => { this.username = event.target.value; }} />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-secondary mb-1" for="password">CONTRASEÑA</label>
              <input id="password" type="password" autocomplete="current-password" required
                     class="w-full rounded-lg border border-ink-border px-3 py-3 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                     .value=${this.password}
                     @input=${(event) => { this.password = event.target.value; }} />
            </div>

            ${this.error ? html`<p class="text-sm text-brand-primary">${this.error}</p>` : ''}

            <button type="submit" ?disabled=${this.busy}
                    class="w-full rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-medium tracking-wide py-3 disabled:opacity-60">
              INGRESAR
            </button>
          </form>
          <p class="mt-6 text-center text-xs text-ink-secondary">Demo: admin / 123</p>
        </div>
      </div>
    `;
  }
}

customElements.define('login-view', LoginView);
