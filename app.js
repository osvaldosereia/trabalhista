/* ==========================================================
   Editor de Peças Trabalhistas – app.js
   ========================================================== */

;(() => {
  'use strict';

  /* ===== Seletores rápidos ===== */
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));

  /* ===== Estado ===== */
  const trechos = {}; // armazena texto final por aba

  /* ===== Controle de abas ===== */
  const tabs = $$('.tabs button');
  const sections = $$('.tab-content');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.tab;
      sections.forEach(s => s.classList.toggle('active', s.id === id));
    });
  });

  /* ===== Botões IA (placeholders) ===== */
  $$('.btn-ia').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.tab-content');
      const viewer = parent.querySelector('.viewer');
      viewer.textContent =
        '⚙️ [IA simulada] O texto será gerado aqui com base nas informações desta aba...';
    });
  });

  /* ===== Salvar trechos ===== */
  $$('.btn-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.tab-content');
      const id = section.id;
      const viewer = section.querySelector('.viewer');
      const texto = viewer.textContent.trim();
      if (!texto) return alert('Nada para salvar.');
      trechos[id] = texto;
      alert('Trecho salvo!');
    });
  });

  /* ===== Gerar prompt final ===== */
  $('#btn-gerar-final').addEventListener('click', () => {
    const editor = $('#editor-final');
    const ordem = [
      'qualificacao','preliminares','contrato','fatos','fundamentos',
      'pedidos','calculos','provas','valor'
    ];
    const partes = ordem
      .filter(id => trechos[id])
      .map(id => `### ${capitalizar(id)}\n${trechos[id]}`)
      .join('\n\n');
    const prompt =
      `Você é ADVOGADO ESPECIALISTA EM DIREITO DO TRABALHO no Brasil.\n` +
      `Redija a PETIÇÃO INICIAL completa com base nas informações a seguir:\n\n` +
      partes;
    editor.textContent = prompt || 'Nenhum trecho salvo ainda.';
  });

  /* ===== Copiar texto ===== */
  $('#btn-copiar').addEventListener('click', () => {
    const text = $('#editor-final').textContent;
    navigator.clipboard.writeText(text);
    alert('Prompt copiado!');
  });

  /* ===== Baixar .txt ===== */
  $('#btn-baixar').addEventListener('click', () => {
    const text = $('#editor-final').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'peticao_trabalhista.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ===== Utilitário ===== */
  function capitalizar(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

})();
