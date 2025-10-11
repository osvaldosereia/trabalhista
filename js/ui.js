/* ui.js — navegação, tema, toolbar e ações principais (Gerar Prompt / Gerar com IA) */
(function () {
  const { $, $$, toast } = window.Clara;

  // -------------------- TEMA (sempre claro) --------------------
  function enforceLightTheme() {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // -------------------- WIZARD --------------------
  let steps = [];
  let cur = 0;

  function collectSteps() {
    steps = Array.from($$('.step')); // fieldsets na ordem
  }

  function paintProgress() {
    const items = $$('#stepsList li');
    items.forEach((li, i) => {
      li.classList.toggle('active', i === cur);
      li.classList.toggle('done', i < cur);
    });
    const bar = $('#progress span');
    if (bar) bar.style.width = `${Math.round(((cur + 1) / items.length) * 100)}%`;
  }

  function showWizard() {
    $('#intro')?.classList.add('hidden');
    $('#wizard')?.classList.remove('hidden');
    $('#resultado')?.classList.add('hidden');
  }

  function showResultado() {
    $('#wizard')?.classList.add('hidden');
    $('#resultado')?.classList.remove('hidden');
  }

  function setStep(n) {
    if (!steps.length) collectSteps();
    n = Math.max(0, Math.min(n, steps.length - 1));
    steps.forEach((s, i) => s.classList.toggle('hidden', i !== n));
    cur = n;
    paintProgress();
    window.dispatchEvent(new CustomEvent('step:changed', { detail: { step: n } }));
  }

  function next() { setStep(cur + 1); }
  function prev() { setStep(cur - 1); }

  // exposição global p/ outros módulos
  window.Clara = Object.assign(window.Clara || {}, { ui: { setStep, next, prev, showWizard, showResultado } });

  // -------------------- GERAR PROMPT / IA --------------------
  function gerarPrompt() {
    const { prompt } = window.Clara.review?.updateReview?.() || {};
    if (!prompt) return toast('Nada para gerar', 'warn');
    $('#saida') && ($('#saida').value = prompt);
    showResultado();
    toast('Prompt montado');
  }

  async function gerarComIA() {
    const { prompt } = window.Clara.review?.updateReview?.() || {};
    if (!prompt) return toast('Nada para enviar à IA', 'warn');

    const cfg = window.Clara.ia?.loadCfg?.();
    if (!cfg?.apiKey) {
      toast('Cole sua OpenAI API key em Configurar IA', 'bad');
      $('#modal')?.classList.remove('hidden');
      return;
    }

    $('#saida') && ($('#saida').value = prompt);
    showResultado();

    try {
      $('#loading')?.classList.remove('hidden');
      const sys = 'Você é um advogado trabalhista brasileiro. Redija a petição inicial completa, citando base legal quando cabível. Onde faltarem dados, marque (XXX) sem inventar.';
      const out = await window.Clara.ia.callOpenAI({ prompt, cfg, system: sys });
      $('#saidaIa') && ($('#saidaIa').value = out || '');
      toast('Texto gerado pela IA');
    } catch (e) {
      console.error(e);
      toast('Falha ao gerar com IA', 'bad');
    } finally {
      $('#loading')?.classList.add('hidden');
    }
  }

  // -------------------- COPIAR / IMPRIMIR / HTML --------------------
  async function copiar(elId) {
    const el = $(elId);
    if (!el || !el.value) return toast('Nada para copiar', 'warn');
    await navigator.clipboard.writeText(el.value);
    toast('Copiado para a área de transferência');
  }

  async function copiarHTMLPreview() {
    const host = $('#previewDoc');
    if (!host) return toast('Prévia indisponível', 'warn');
    const html = host.innerHTML;
    await navigator.clipboard.writeText(html);
    toast('HTML copiado');
  }

  function imprimirPreview() {
    const host = $('#previewDoc');
    if (!host) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Prévia</title><meta charset="utf-8">
      <style>body{font-family:serif;margin:24px} h2,h3{margin:12px 0} .doc{max-width:800px;margin:0 auto}</style>
      </head><body>${host.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  // -------------------- Binds da Toolbar --------------------
  function bindToolbar() {
    $('#btnGerar')?.addEventListener('click', gerarPrompt);
    $('#btnGerarIA')?.addEventListener('click', gerarComIA);
    $('#copiar')?.addEventListener('click', () => copiar('#saida'));
    $('#copiarIa')?.addEventListener('click', () => copiar('#saidaIa'));
    $('#copyHtml')?.addEventListener('click', copiarHTMLPreview);
    $('#printDoc')?.addEventListener('click', imprimirPreview);
    $('#voltar')?.addEventListener('click', () => { showWizard(); setStep(cur); });
  }

  // -------------------- Navegação / Ações gerais --------------------
  function bindNav() {
    $('#btnIniciar')?.addEventListener('click', () => { showWizard(); setStep(0); });
    $('#btnLoadDraft')?.addEventListener('click', () => { window.Clara.form?.loadDraft?.(); showWizard(); setStep(0); });
    $('#btnReset')?.addEventListener('click', () => {
      if (!confirm('Limpar todos os dados e voltar ao início?')) return;
      localStorage.clear();
      location.reload();
    });

    $('#btnNext')?.addEventListener('click', next);
    $('#btnPrev')?.addEventListener('click', prev);

    // Avança automaticamente ao terminar um passo obrigatório simples
    $$('#formPeticao input, #formPeticao textarea, #formPeticao select').forEach(el=>{
      el.addEventListener('change', () => window.dispatchEvent(new Event('form:dirty')));
    });
  }

  // -------------------- Template (habilitar botões) --------------------
  function bindTemplate() {
    const tpl = $('#tplPdf');
    const btnApply = $('#aplicarTemplate');
    const btnClear = $('#limparTemplate');

    function update() {
      const has = !!tpl?.files?.length;
      btnApply && (btnApply.disabled = !has);
      btnClear && (btnClear.disabled = !has);
    }
    tpl?.addEventListener('change', update);
    update();

    btnApply?.addEventListener('click', () => {
      toast('Template pronto para ser aplicado pela IA (use o gerador).');
    });
    btnClear?.addEventListener('click', () => {
      tpl.value = '';
      update();
      toast('Template limpo');
    });
  }

  // -------------------- Inicialização --------------------
  function init() {
    enforceLightTheme();
    collectSteps();
    setStep(0);
    bindNav();
    bindToolbar();
    bindTemplate();
  }

  // Espera include.js sinalizar que os partials existem
  window.addEventListener('app:ready', init);
})();
