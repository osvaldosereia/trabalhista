/* main.js — bootstrap geral, modais, atalhos e pequenos binds (fluxo 100% manual) */
(function () {
  const { $, $$, toast } = window.Clara;

  // -------------------- Overlay de loading (genérico) --------------------
  function showLoading(on = true) {
    const el = $('#loading');
    if (!el) return;
    el.classList.toggle('hidden', !on);
  }
  window.Clara = Object.assign(window.Clara || {}, { showLoading });

  // -------------------- Modais genéricos (com rolagem interna) --------------------
  function bindModals() {
    document.addEventListener('click', (e) => {
      const trg = e.target;
      const openSel = trg?.getAttribute?.('data-open');
      const closeSel = trg?.getAttribute?.('data-close');
      if (openSel) $(openSel)?.classList?.remove('hidden');
      if (closeSel) $(closeSel)?.classList?.add('hidden');
      if (trg?.classList?.contains('modal-close')) trg.closest('.modal')?.classList?.add('hidden');
    });

    // Esc fecha modal focado
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.modal').forEach(m => m.classList.add('hidden'));
    });
  }

  // -------------------- Atalhos de teclado --------------------
  function bindShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S -> salvar rascunho
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.Clara.form?.saveDraft?.();
        toast('Rascunho salvo (Ctrl/Cmd+S)');
      }
      // Ctrl/Cmd + Enter -> gerar prompt (manual)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const { prompt } = window.Clara.review?.updateReview?.() || {};
        if (!prompt) return toast('Nada para gerar', 'warn');
        const out = $('#saida'); if (out) out.value = prompt;
        // abrir resultado
        window.Clara.ui?.showResultado?.();
      }
    });
  }

  // -------------------- Observadores úteis --------------------
  function observeDirty() {
    let t;
    window.addEventListener('form:dirty', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        window.Clara.review?.updateReview?.();
      }, 200);
    });

    // Atualiza revisão quando mudar tema (carrega novas sugestões)
    $('#temaSelect')?.addEventListener('change', () => {
      window.Clara.catalog?.updateFatosSug?.();
      window.Clara.review?.updateReview?.();
    });
  }

  // -------------------- Export/Import (atalhos do toolbar) --------------------
  function bindExportImport() {
    $('#btnExportJson')?.addEventListener('click', () => window.Clara.exporter?.exportJSON?.());
    $('#btnImportJson')?.addEventListener('click', () => window.Clara.exporter?.importJSONDialog?.());
    $('#exportPdf')?.addEventListener('click', () => window.Clara.exporter?.exportPDF?.());
    $('#exportDocx')?.addEventListener('click', () => window.Clara.exporter?.exportDOCX?.());
  }

  // -------------------- Drag & Drop — REMOVIDO (sem upload) --------------------
  // (Intencionalmente sem binds de upload/ingestão)

  // -------------------- Boot --------------------
  function init() {
    bindModals();
    bindShortcuts();
    bindExportImport();
    observeDirty();

    // snapshot inicial opcional
    setTimeout(() => window.Clara.history?.saveVersion?.('snapshot_inicial'), 200);

    // sinaliza pronto para qualquer módulo pendente
    window.dispatchEvent(new Event('main:ready'));
  }

  // roda quando include.js terminar de carregar tudo
  window.addEventListener('app:ready', init);
})();
