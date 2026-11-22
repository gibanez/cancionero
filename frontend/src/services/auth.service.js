const TOKEN_KEY = 'cancionero_token';
const USER_KEY = 'cancionero_user';

export const authService = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (err) {
      return null;
    }
  },

  isLoggedIn() {
    return Boolean(this.getToken());
  },

  async login(username, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      let message = 'No se pudo iniciar sesión';
      try {
        const data = await response.json();
        message = data.error || message;
      } catch (err) {
        // Respuesta sin cuerpo JSON.
      }
      throw new Error(message);
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};
