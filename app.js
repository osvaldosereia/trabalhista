/* ==========================================================
   Editor de Peças Trabalhistas – app.js
   ========================================================== */
;(() => {
  'use strict';

  /* ===== Seletores rápidos ===== */
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));

  /* ===== Estado ===== */
  const trechos = {};
  let FFP = [];

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
   Carregar base de fatos-fundamentos-pedidos.js
   ========================================================== */
async function carregarFFP() {
  try {
    const res = await fetch('./data/fatos-fundamentos-pedidos.js');
    const text = await res.text();
    const data = text.match(/\{[\s\S]*\}/);
    if (data) {
      FFP = eval(text); // carrega o conteúdo do arquivo
      popularFatos();
    }
  } catch (e) {
    console.error('Erro ao carregar FFP:', e);
  }
}


  function popularFatos() {
    const sel = $('#select-fato');
    if (!sel || !FFP.length) return;
    FFP.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.fato;
      opt.textContent = f.fato;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      const fatoSel = FFP.find(f => f.fato === sel.value);
      const fundBox = $('#fundamentos-box');
      const pedBox = $('#pedidos-box');
      fundBox.innerHTML = '';
      pedBox.innerHTML = '';
      if (fatoSel) {
        fatoSel.fundamentos.forEach(f => {
          const li = document.createElement('li');
          li.textContent = f;
          fundBox.appendChild(li);
        });
        fatoSel.pedidos.forEach(p => {
          const li = document.createElement('li');
          li.textContent = p;
          pedBox.appendChild(li);
        });
      }
    });
  }

  carregarFFP();

  /* ==========================================================
     Botão "Abrir no Google Modo IA"
     ========================================================== */
  $$('.btn-ia').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.tab-content');
      const viewer = parent.querySelector('.viewer');
      const texto = viewer?.textContent?.trim() || '';

      const inputs = parent.querySelectorAll('input, textarea');
      const dados = Array.from(inputs)
        .map(el => `${el.name || el.id}: ${el.value}`)
        .filter(x => !x.endsWith(': '))
        .join(' | ');

      const titulo = parent.querySelector('h2')?.textContent || 'Trecho da Petição';
      const contexto = `Redija o trecho "${titulo}" de uma Reclamação Trabalhista com base nos seguintes dados: ${dados}. 
O texto atual é: ${texto}. 
Use linguagem técnica e padrão forense.`;

      const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
      window.open(url, '_blank');
    });
  });

  /* ==========================================================
     Editor formatado + sincronização com o final
     ========================================================== */
  $$('.viewer').forEach(view => {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-area';
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
      <button data-cmd="bold"><b>B</b></button>
      <button data-cmd="italic"><i>I</i></button>
      <button data-cmd="insertUnorderedList">• Lista</button>
      <button data-cmd="removeFormat">🧹 Limpar</button>
    `;
    const editor = document.createElement('div');
    editor.className = 'editor-mini';
    editor.contentEditable = true;
    editor.dataset.section = view.closest('.tab-content').id;

    wrapper.appendChild(toolbar);
    wrapper.appendChild(editor);
    view.replaceWith(wrapper);

    toolbar.addEventListener('click', e => {
      if (e.target.dataset.cmd) {
        document.execCommand(e.target.dataset.cmd, false, null);
      }
    });

    editor.addEventListener('input', () => {
      const id = editor.dataset.section;
      trechos[id] = editor.innerHTML;
      atualizarFinal();
    });
  });

  function atualizarFinal() {
    const editorFinal = $('#editor-final');
    const ordem = [
      'qualificacao', 'preliminares', 'contrato', 'fatos',
      'fundamentos', 'pedidos', 'calculos', 'provas', 'valor'
    ];
    const partes = ordem
      .filter(id => trechos[id])
      .map(id => `<h3>${capitalizar(id)}</h3>${trechos[id]}`)
      .join('<hr>');
    editorFinal.innerHTML = partes || '<p>Nenhum trecho adicionado ainda.</p>';
  }

  /* ===== Gerar prompt final ===== */
  $('#btn-gerar-final').addEventListener('click', () => {
    const editor = $('#editor-final');
    const ordem = [
      'qualificacao', 'preliminares', 'contrato', 'fatos',
      'fundamentos', 'pedidos', 'calculos', 'provas', 'valor'
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
  window.addEventListener('load', () => {
    try {
      const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.assign(trechos, dados);
    } catch (e) {
      console.warn('Falha ao carregar localStorage', e);
    }
  });

  setInterval(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trechos));
  }, 5000);

  const finalSection = $('#final .actions');
  const btnClear = document.createElement('button');
  btnClear.textContent = '🧹 Limpar Tudo';
  btnClear.addEventListener('click', () => {
    if (confirm('Apagar todos os trechos salvos?')) {
      localStorage.removeItem(STORAGE_KEY);
      Object.keys(trechos).forEach(k => delete trechos[k]);
      $('#editor-final').textContent = '';
      alert('Dados limpos.');
    }
  });
  finalSection.appendChild(btnClear);

  /* ==========================================================
     Exportar PDF com Folha de Rosto
     ========================================================== */
  $('#btn-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'portrait' });

    const reclamante = $('[name="reclamante"]').value || 'NOME DO RECLAMANTE';
    const reclamada = $('[name="reclamada"]').value || 'NOME DA RECLAMADA';
    const vara = '___ª VARA DO TRABALHO DE __________ / UF';

    doc.setFont('Times', 'Bold');
    doc.setFontSize(13);
    doc.text('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA', 20, 30);
    doc.text(vara, 20, 38);

    doc.setFont('Times', 'Roman');
    doc.setFontSize(12);
    doc.text(`\n\n${reclamante.toUpperCase()}, Reclamante, em face de ${reclamada.toUpperCase()}, Reclamada, apresenta:`, 20, 55);

    doc.setFont('Times', 'Bold');
    doc.setFontSize(14);
    doc.text('RECLAMAÇÃO TRABALHISTA', 70, 80);

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(20, 85, 190, 85);

    const content = $('#editor-final').innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    const margin = 20;
    const lineHeight = 7;
    const maxWidth = 170;
    let y = 95;

    const splitText = (text, doc) => doc.splitTextToSize(text.replace(/<[^>]+>/g, ''), maxWidth);
    const allBlocks = tempDiv.querySelectorAll('h3, p, div, li');

    doc.setFont('Times', 'Roman');
    doc.setFontSize(12);

    allBlocks.forEach(block => {
      const text = block.textContent.trim();
      if (!text) return;
      const lines = splitText(text, doc);
      lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += 2;
    });

    doc.setFont('Times', 'Italic');
    doc.setFontSize(10);
    doc.text('Gerado pelo Editor de Peças Trabalhistas', 70, 290);

    doc.save('peticao_trabalhista.pdf');
  });
})();
