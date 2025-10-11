/* main.js — bootstrap geral, modais, atalhos, leitura de anexos auxiliares, pdf.js e pequenos binds */
(function () {
  const { $, $$, toast, state } = window.Clara;

  // -------------------- PDF.js (worker) --------------------
  // Garante pdf.js funcional para módulos que precisem (ingestor, etc.)
  try {
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      // CDN estável (mantenha em sincronia com a versão importada no index.html)
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  } catch (e) {
    console.warn('[pdfjs] worker não configurado:', e);
  }

  // -------------------- Overlay de loading --------------------
  function showLoading(on = true) {
    const el = $('#loading');
    if (!el) return;
    el.classList.toggle('hidden', !on);
  }
  window.Clara = Object.assign(window.Clara || {}, { showLoading });

  // -------------------- Modais genéricos --------------------
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

  // -------------------- Drag & Drop (qualquer área) --------------------
  function bindDragDrop() {
    ['dragenter','dragover','dragleave','drop'].forEach(evt => {
      document.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    document.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      // prioridade: usa a ingestão (até 10 arquivos)
      const bulk = $('#bulkUpload');
      if (bulk) {
        const dt = new DataTransfer();
        Array.from(files).slice(0,10).forEach(f => dt.items.add(f));
        bulk.files = dt.files;
        toast('Arquivos adicionados — use "Gerar relatório e proposta"', 'good');
      }
    });
  }

  // -------------------- Leitura de anexos de Provas (docUpload) -> state.docsText --------------------
  // Observação: a ingestão principal já preenche state.docsText; aqui somamos quando o usuário usa o upload auxiliar.
  async function readFileToText(file) {
    if (!file) return '';
    try {
      if (file.type === 'application/pdf' && window.pdfjsLib) {
        const uint8 = new Uint8Array(await file.arrayBuffer());
        const pdf = await window.pdfjsLib.getDocument({ data: uint8 }).promise;
        let out = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          out += content.items.map(it => it.str).join(' ') + '\n';
        }
        return out;
      }
      // txt/csv ou desconhecido (fallback para texto)
      return await file.text();
    } catch (e) {
      console.warn('[docUpload] erro lendo', file.name, e);
      return '';
    }
  }

  function bindDocUpload() {
    $('#docUpload')?.addEventListener('change', async (e) => {
      const files = Array.from(e.target?.files || []);
      if (!files.length) return;

      showLoading(true);
      let added = 0;
      try {
        for (const f of files) {
          const txt = await readFileToText(f);
          if (!txt) continue;
          state.docsText = (state.docsText || '') + `\n\n=== PROVA: ${f.name} ===\n` + txt;
          added++;
        }
        if (added) toast(`Provas adicionadas ao contexto da IA (${added})`);
        else toast('Nenhum texto extraído dos arquivos', 'warn');
      } finally {
        showLoading(false);
      }
    });
  }

  // -------------------- Atalhos de teclado --------------------
  function bindShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S -> salvar rascunho
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.Clara.form?.saveDraft?.();
      }
      // Ctrl/Cmd + Enter -> gerar com IA
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const atResultado = !$('#resultado')?.classList?.contains('hidden');
        if (!atResultado) {
          window.Clara.ui?.showResultado?.();
        }
        // dispara geração
        (async ()=> { 
          try { await (window.Clara.ui?.gerarComIA ? window.Clara.ui.gerarComIA() : window.Clara.ui?.showResultado?.()); }
          catch { /* silencioso */ }
        })();
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

  // -------------------- Boot --------------------
  function init() {
    bindModals();
    bindDragDrop();
    bindDocUpload();
    bindShortcuts();
    bindExportImport();
    observeDirty();

    // sinaliza pronto para qualquer módulo pendente
    window.dispatchEvent(new Event('main:ready'));
  }

  // roda quando include.js terminar de carregar tudo
  window.addEventListener('app:ready', init);
})();
