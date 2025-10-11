/* core.js — utilitários base, namespace Clara, toasts e helpers DOM */
(function () {
  // -------------------- Namespace --------------------
  window.Clara = window.Clara || {};

  // -------------------- Selectors --------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // -------------------- Formatter helpers --------------------
  const fmtBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const currency = (n) => fmtBR.format(Number(n || 0));

  // -------------------- Toast system --------------------
  let toastHost;
  function ensureToastHost() {
    if (toastHost) return toastHost;
    toastHost = document.createElement('div');
    toastHost.id = 'toast-host';
    Object.assign(toastHost.style, {
      position: 'fixed', right: '16px', top: '16px', zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: '8px'
    });
    document.body.appendChild(toastHost);
    return toastHost;
  }

  function toast(msg = '', type = 'ok', ms = 2800) {
    ensureToastHost();
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.textContent = msg;
    const base = {
      background: '#ffffff', color: '#0f172a', border: '1px solid #e5e7eb',
      padding: '10px 12px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(15,23,42,.08)',
      fontWeight: 700, maxWidth: '420px'
    };
    Object.assign(el.style, base);
    if (type === 'warn') el.style.borderColor = '#f59e0b';
    if (type === 'bad') { el.style.borderColor = '#ef4444'; el.style.background = '#fff1f2'; }
    if (type === 'ok') el.style.borderColor = '#10b981';

    toastHost.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s ease, transform .25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(() => el.remove(), 260);
    }, ms);
  }

  // -------------------- Copy helper --------------------
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      toast('Copiado');
    } catch {
      toast('Falha ao copiar', 'bad');
    }
  }

  // -------------------- Debounce --------------------
  function debounce(fn, wait = 200) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  // -------------------- Expose --------------------
  Object.assign(window.Clara, { $, $$, toast, currency, copy, debounce });

  // Sinalizar que o core está pronto (para quem ouvir)
  window.dispatchEvent(new Event('core:ready'));
})();
