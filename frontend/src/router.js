const routes = [];
let renderCallback = () => {};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function addRoute(pattern, name, tag, options = {}) {
  const keys = [];
  const source = pattern.split('/').map((part) => {
    if (part.startsWith(':')) {
      keys.push(part.slice(1));
      return '([^/]+)';
    }
    return escapeRegex(part);
  }).join('/');

  routes.push({
    regex: new RegExp(`^${source}/?$`),
    keys,
    name,
    tag,
    options
  });
}

export function navigate(path, replace = false) {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  renderCallback(resolve());
}

export function resolve() {
  const pathname = window.location.pathname;
  const query = new URLSearchParams(window.location.search);
  const match = routes.map((route) => {
    const result = route.regex.exec(pathname);
    if (!result) return null;
    const params = {};
    route.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(result[index + 1]);
    });
    return { ...route, params, query };
  }).find(Boolean);

  return match || {
    name: 'not-found',
    tag: 'not-found-view',
    params: {},
    query,
    options: { title: 'NO ENCONTRADO', showHeader: true, showNav: false }
  };
}

export function configure(callback) {
  renderCallback = callback;
  window.addEventListener('popstate', () => renderCallback(resolve()));
}

export function start() {
  renderCallback(resolve());
}
