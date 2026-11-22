import '../components/toast.js';

let host = null;

function ensureHost() {
  host = document.getElementById('toast-root');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-root';
    document.body.appendChild(host);
  }
  host.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] flex w-full max-w-md flex-col items-center gap-2 px-4 pointer-events-none';
}

export function showToast(message, type = 'success', duration = 3200) {
  if (!message) return;
  ensureHost();

  const element = document.createElement('toast-message');
  element.message = message;
  element.type = type;
  element.style.opacity = '0';
  element.style.transform = 'translateY(8px)';
  element.style.transition = 'opacity 180ms ease, transform 180ms ease';
  host.appendChild(element);

  requestAnimationFrame(() => {
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(8px)';
    setTimeout(() => element.remove(), 220);
  }, duration);
}
