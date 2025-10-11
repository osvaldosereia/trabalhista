/* ui.js — navegação do wizard, ações globais e tela de resultado
   - Agora é possível clicar diretamente nas pílulas (Juízo/Partes/...) para trocar de aba
   - Botões Avançar/Voltar continuam funcionando
   - Geração/visualização/cópia/print do resultado
*/
(function () {
  const { $, $$, copy, toast } = window.Clara;

  // --------------- Estado ---------------
  let current = 0; // índice do passo visível (0..n-1)

  // --------------- Helpers de UI ---------------
  const stepsEls = () => $$('#stepsList li');
  const panes    = () => $$('.step');
  const progress = () => $('#progress span');

  function setActiveStep(idx) {
    const tabs = stepsEls();
    const fs   = panes();
    if (!tabs.length || !fs.length) return;

    current = Math.max(0, Math.min(idx, fs.length - 1));

    // ativa pílula
    tabs.forEach((el, i) => el.classList.toggle('active', i === current));
    // mostra fieldset correspondente
    fs.forEach((el, i) => el.classList.toggle('hidden', i !== current));

    // barra de progresso
    const pct = ((current) / (fs.length - 1)) * 100;
    if (progress()) progress().style.width = `${pct}%`;

    // dispara evento para outros módulos (review recalcula, etc.)
    window.dispatchEvent(new Event('step:changed'));
  }

  // --------------- Navegação (clique e botões) ---------------
  function bindStepClicks() {
    stepsEls().forEach((li, i) => {
      li.style.cursor = 'pointer';
      li.setAttribute('title', 'Ir para esta etapa');
      li.addEventListener('click', () => setActiveStep(i)); // << livre, sem bloqueios
    });
  }

  function bindPrevNext() {
    $('#btnPrev')?.addEventListener('click', () => setActiveStep(current - 1));
    $('#btnNext')?.addEventListener('click', () => setActiveStep(current + 1));
  }

  // --------------- Fluxo inicial (Intro → Wizard) ---------------
  function bindIntro() {
    $('#btnIniciar')?.addEventListener('click', () => {
      $('#intro')?.classList.add('hidden');
      $('#wizard')?.classList.remove('hidden');
      setActiveStep(0);
      toast('Novo caso iniciado');
    });

    $('#btnReset')?.addEventListener('click', () => {
      try { localStorage.clear(); } catch {}
      location.reload();
    });

    $('#btnLoadDraft')?.addEventListener('click', () => {
      $('#intro')?.classList.add('hidden');
      $('#wizard')?.classList.remove('hidden');
      window.Clara.form?.loadDraft?.();
      setActiveStep(0);
    });
  }

  // --------------- Resultado (prompt/preview) ---------------
  function showResultado() {
    $('#wizard')?.classList.add('hidden');
    $('#resultado')?.classList.remove('hidden');
    // garante que review está atualizado e joga no textarea
    const { prompt } = window.Clara.review?.updateReview?.() || {};
    if (prompt) $('#saida') && ($('#saida').value = prompt);
  }

  function showWizard() {
    $('#resultado')?.classList.add('hidden');
    $('#wizard')?.classList.remove('hidden');
  }

  function bindResultado() {
    $('#voltar')?.addEventListener('click', showWizard);

    $('#copiar')?.addEventListener('click', () => {
      copy($('#saida')?.value || '');
    });

    $('#copyHtml')?.addEventListener('click', () => {
      copy($('#previewDoc')?.innerHTML || '');
    });

    $('#printDoc')?.addEventListener('click', () => {
      const w = window.open('', '_blank');
      if (!w) return toast('Pop-up bloqueado', 'warn');
      const html = `
        <html><head>
          <meta charset="utf-8">
          <title>Prévia forense</title>
          <link rel="stylesheet" href="style.css">
        </head>
        <body class="print-doc">
          ${$('#previewDoc')?.innerHTML || '<p>(vazio)</p>'}
          <script>window.onload = () => window.print();<\/script>
        </body></html>`;
      w.document.open(); w.document.write(html); w.document.close();
    });

    $('#btnGerar')?.addEventListener('click', showResultado);
  }

  // --------------- Export/Import proxies (já existem em export.js) ---------------
  function bindToolbarCopies() {
    // nada adicional aqui; os botões do footer já são ligados em main.js/export.js
  }

  // --------------- Boot ---------------
  function init() {
    bindIntro();
    bindPrevNext();
    bindStepClicks();
    bindResultado();
    bindToolbarCopies();
    // exibe wizard direto se intro não existir (deploys antigos)
    if (!$('#intro')) { $('#wizard')?.classList.remove('hidden'); setActiveStep(0); }
  }

  // Expose
  window.Clara = Object.assign(window.Clara || {}, {
    ui: { setActiveStep, showResultado, showWizard }
  });

  // inicializa após carregar partials
  window.addEventListener('app:ready', init);
})();
