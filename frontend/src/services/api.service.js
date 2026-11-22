import { authService } from './auth.service.js';
import { navigate } from '../router.js';

async function request(method, path, data) {
  const headers = {};
  const token = authService.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (data instanceof FormData) {
    body = data;
  } else if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const response = await fetch(`/api${path}`, { method, headers, body });

  if (response.status === 401 && !path.startsWith('/auth/')) {
    authService.logout();
    navigate('/login', true);
    throw new Error('Sesión expirada, iniciá sesión nuevamente');
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.error || payload.message || message;
    } catch (err) {
      // Respuesta sin cuerpo JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data),
  delete: (path) => request('DELETE', path),
  upload(path, file) {
    const formData = new FormData();
    formData.append('image', file);
    return request('POST', path, formData);
  }
};
