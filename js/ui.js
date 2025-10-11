/* ui.js — navegação, tema e ações principais (somente fluxo manual) */
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
    if (bar && items.length) bar.style.width = `${Math.round(((cur + 1) / items.length) * 100)}%`;
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

  // -------------------- GERAR PROMPT (manual) --------------------
  function gerarPrompt() {
    const { prompt } = window.Clara.review?.updateReview?.() || {};
    if (!prompt) return toast('Nada para gerar', 'warn');
    const out = $('#saida');
    if (out) out.value = prompt;
    showResultado();
    toast('Prompt montado');
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
    if (!w) return toast('Pop-up bloqueado pelo navegador', 'warn');
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
    $('#copiar')?.addEventListener('click', () => copiar('#saida'));
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

    $$('#formPeticao input, #formPeticao textarea, #formPeticao select').forEach(el=>{
      el.addEventListener('change', () => window.dispatchEvent(new Event('form:dirty')));
    });
  }

  // -------------------- Inicialização --------------------
  function init() {
    enforceLightTheme();
    collectSteps();
    setStep(0);
    bindNav();
    bindToolbar();
  }

  window.addEventListener('app:ready', init);
})();
