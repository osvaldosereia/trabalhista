/* core.js — utilitários base, storage, toasts e estado global */
(function () {
  // --------------- Helpers de DOM ---------------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // --------------- UID ---------------
  function uid(prefix = 'id') {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  }

  // --------------- Storage seguro (localStorage) ---------------
  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch {}
    }
  };

  // --------------- Formatação BRL ---------------
  const br = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function fmtBRL(n) {
    const v = Number(n || 0);
    if (!Number.isFinite(v)) return 'R$ 0,00';
    return br.format(v);
  }

  // --------------- Toasts ---------------
  function ensureToastStyles() {
    if (document.getElementById('clara-toast-style')) return;
    const css = `
    .toast-wrap{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;gap:8px}
    .toast{min-width:260px;max-width:480px;padding:10px 12px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.12);
           background:#fff;border:1px solid #e9e9ef;font:14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial}
    .toast.good{border-color:#c8e6c9;background:#f1fbf2}
    .toast.warn{border-color:#ffe9a6;background:#fff8e1}
    .toast.bad{border-color:#ffcdd2;background:#fff1f2}
    .toast .t-close{margin-left:8px;cursor:pointer;font-weight:600;opacity:.6}
    `;
    const s = document.createElement('style');
    s.id = 'clara-toast-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function toast(msg, type = 'good', ms = 3500) {
    ensureToastStyles();
    let wrap = document.getElementById('toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toasts';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `<span>${msg}</span><span class="t-close" title="Fechar">×</span>`;
    wrap.appendChild(el);

    const kill = () => { el.remove(); };
    el.querySelector('.t-close')?.addEventListener('click', kill);
    setTimeout(kill, Math.max(1500, ms));
  }

  // --------------- Estado Global ---------------
  const state = {
    docsText: '' // buffer com textos extraídos de anexos (ingestor/docUpload)
  };

  // --------------- Expose ---------------
  window.Clara = Object.assign(window.Clara || {}, {
    $, $$, uid, storage, fmtBRL, toast, state
  });
})();
