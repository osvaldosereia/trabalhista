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

    /* ==========================================================
     Botão "Abrir no Google Modo IA"
     ========================================================== */
  $$('.btn-ia').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.tab-content');
      const viewer = parent.querySelector('.viewer');
      const texto = viewer.textContent.trim();

      // Captura dados extras dos formulários da aba
      const inputs = parent.querySelectorAll('input, textarea');
      const dados = Array.from(inputs)
        .map(el => `${el.name || el.id}: ${el.value}`)
        .filter(x => !x.endsWith(': '))
        .join(' | ');

      // Define contexto da aba
      const titulo = parent.querySelector('h2')?.textContent || 'Trecho da Petição';
      const contexto = `Redija o trecho "${titulo}" de uma Reclamação Trabalhista com base nos seguintes dados: ${dados}. 
O texto atual é: ${texto}. 
Use linguagem técnica e padrão forense.`;

      // Monta link para Google modo IA
      const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
      window.open(url, '_blank');
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
  /* ==========================================================
     Salvamento automático (localStorage)
     ========================================================== */

  const STORAGE_KEY = 'editorTrabalhista:trechos';

  // Carregar automaticamente ao iniciar
  window.addEventListener('load', () => {
    try {
      const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.assign(trechos, dados);
      console.log('Trechos carregados:', trechos);
    } catch (e) {
      console.warn('Falha ao carregar localStorage', e);
    }
  });

  // Salvar automaticamente a cada 5s
  setInterval(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trechos));
  }, 5000);

  // Botão limpar (opcional)
  const finalSection = $('#final .actions');
  const btnClear = document.createElement('button');
  btnClear.textContent = '🧹 Limpar Tudo';
  btnClear.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja apagar todos os trechos salvos?')) {
      localStorage.removeItem(STORAGE_KEY);
      Object.keys(trechos).forEach(k => delete trechos[k]);
      $('#editor-final').textContent = '';
      alert('Dados limpos.');
    }
  });
  finalSection.appendChild(btnClear);

})();
