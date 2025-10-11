// include.js — carrega os partials (portials/*) e, SÓ DEPOIS, injeta os módulos JS na ordem correta.
// Compatível com GitHub Pages (100% estático). Evita duplicar scripts e dispara eventos quando tudo estiver pronto.
(function () {
  // ---- util ---------------------------------------------------------------
  const loaded = new Set(); // evita reinjetar scripts
  function log(...a) { console.log('[include]', ...a); }
  function failUI(msg) {
    const box = document.createElement('div');
    box.className = 'muted';
    box.style.cssText = 'padding:12px;margin:12px;border-radius:8px;background:#fff3f3;border:1px solid #ffd6d6;color:#b00020';
    box.textContent = 'Falha ao carregar a interface: ' + msg;
    document.body.appendChild(box);
  }

  // ---- loader de partials -------------------------------------------------
  async function loadNode(el) {
    const url = el.getAttribute('data-include');
    if (!url) return;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} → ${url}`);
    el.innerHTML = await res.text();
    // carregar partials aninhados, se houver
    const nested = el.querySelectorAll('[data-include]');
    for (const n of nested) await loadNode(n);
  }

  async function loadAllPartials() {
    // pega todos os nós com data-include (ex.: portials/header.html etc.)
    const nodes = Array.from(document.querySelectorAll('[data-include]'));
    for (const n of nodes) await loadNode(n);
    log('partials carregados');
    // avisa que as seções/IDs já existem no DOM
    window.dispatchEvent(new Event('partials:loaded'));
  }

  // ---- injeção ordenada de scripts ---------------------------------------
  function injectScript(src) {
    if (loaded.has(src)) return Promise.resolve(); // já injetado
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false; // mantém ordem
      s.onload = () => { loaded.add(src); resolve(); };
      s.onerror = () => reject(new Error('Falha ao carregar ' + src));
      document.body.appendChild(s);
    });
  }

  function injectScriptsInOrder(list) {
    return list.reduce((p, src) => p.then(() => injectScript(src)), Promise.resolve());
  }

  // ---- bootstrap ----------------------------------------------------------
  (async function boot() {
    try {
      // 1) carrega todos os partials primeiro
      await loadAllPartials();

      // 2) injeta os módulos do app (ordem é importante)
      await injectScriptsInOrder([
        'js/core.js',
        'js/catalog.js',
        'js/jurisprudencia.js',
        'js/ui.js',
        'js/form.js',
        'js/ia.js',
        'js/export.js',
        'js/history.js',
        'js/calc.js',
        'js/review.js',
        'js/main.js'
      ]);

      // 3) sinaliza que tudo está pronto
      window.dispatchEvent(new Event('app:ready'));
      log('módulos carregados');
    } catch (e) {
      console.error('include.js error', e);
      failUI(e.message || String(e));
    }
  })();
})();
