/* include.js — carrega partials e inicializa o app (fluxo 100% manual) */
(function () {
  const ROOT = window.PORTIALS_ROOT || '.'; // defina no index se necessário

  async function loadText(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Falha ao carregar ${url}: ${res.status}`);
    return await res.text();
  }

  async function inject(id, html) {
    const host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = html;
  }

  async function boot() {
    try {
      // Carrega a área principal (sections.html)
      const sections = await loadText(`${ROOT}/portials/sections.html`);
      await inject('app', sections);

      // (Opcional) Cabeçalho / rodapé, se presentes
      try {
        const head = await loadText(`${ROOT}/portials/header.html`);
        await inject('header', head);
      } catch { /* opcional */ }

      try {
        const foot = await loadText(`${ROOT}/portials/footer.html`);
        await inject('footer', foot);
      } catch { /* opcional */ }

      // Sinaliza para módulos dependentes (catalog, form, ui…)
      window.dispatchEvent(new Event('partials:loaded'));
      window.dispatchEvent(new Event('app:ready'));
    } catch (e) {
      console.error('[include] erro:', e);
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = `
          <div class="card" style="border-color:#fecaca;background:#fff1f2">
            <strong>Erro ao carregar a interface</strong>
            <p style="margin:8px 0 0">${e.message || e}</p>
            <p class="muted" style="margin:6px 0 0">Verifique o caminho de <code>portials/sections.html</code> e a variável <code>PORTIALS_ROOT</code> (se usada).</p>
          </div>`;
      }
    }
  }

  // Inicia quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
