/* ==========================================================
   Editor de Peças Trabalhistas – app.js (versão 2025-10-11)
   ========================================================== */

// 🔹 Importa a base de dados FFP
import { FFP } from './data/fatos-fundamentos-pedidos.js';

(() => {
  'use strict';

  /* ===== Utilitários ===== */
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));
  const trechos = JSON.parse(localStorage.getItem('editorTrabalhista:trechos') || '{}');

  function capitalizar(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function salvar() { localStorage.setItem('editorTrabalhista:trechos', JSON.stringify(trechos)); }
  function atualizarFinal() {
    const editorFinal = $('#editor-final');
    const ordem = [
      'qualificacao','preliminares','contrato','fatos','fundamentos',
      'pedidos','calculos','provas','valor'
    ];
    editorFinal.innerHTML = ordem
      .filter(id => trechos[id])
      .map(id => `<h3>${capitalizar(id)}</h3>${trechos[id]}`)
      .join('<hr>') || '<p>Nenhum trecho adicionado ainda.</p>';
  }

  /* ===== Controle de Abas ===== */
  $$('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tabs button').forEach(b => b.classList.remove('active'));
      $$('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      $('#' + btn.dataset.tab).classList.add('active');
    });
  });

  /* ==========================================================
     Fatos, Fundamentos e Pedidos Dinâmicos
     ========================================================== */
  const selFato = $('#select-fato');
  const listaFatos = $('#fatos .viewer');
  const fundBox = $('#fundamentos-box');
  const pedBox = $('#pedidos-box');
  let fatosSelecionados = [];

  function popularFatos() {
    selFato.innerHTML = '<option value="">Selecione um fato</option>';
    FFP.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.fato;
      opt.textContent = f.fato;
      selFato.appendChild(opt);
    });
  }

  selFato?.addEventListener('change', () => {
    const valor = selFato.value;
    if (!valor) return;
    const fatoSel = FFP.find(f => f.fato === valor);
    if (fatoSel && !fatosSelecionados.includes(valor)) {
      fatosSelecionados.push(valor);
      const bloco = document.createElement('div');
      bloco.className = 'fato-bloco';
      bloco.innerHTML = `<strong>${valor}</strong> <button class="remover-fato">❌</button>`;
      listaFatos.appendChild(bloco);

      bloco.querySelector('.remover-fato').onclick = () => {
        fatosSelecionados = fatosSelecionados.filter(f => f !== valor);
        bloco.remove();
        atualizarFundamentosPedidos();
      };
      atualizarFundamentosPedidos();
    }
  });

  function atualizarFundamentosPedidos() {
    fundBox.innerHTML = '';
    pedBox.innerHTML = '';
    const selecionados = FFP.filter(f => fatosSelecionados.includes(f.fato));
    selecionados.forEach(f => {
      const titulo = document.createElement('h4');
      titulo.textContent = f.fato;
      fundBox.appendChild(titulo);
      (f.fundamentos || []).forEach(fu => {
        const li = document.createElement('li');
        li.textContent = fu;
        li.onclick = () => toggleInclusao('fundamentos', fu, li);
        fundBox.appendChild(li);
      });

      const t2 = document.createElement('h4');
      t2.textContent = f.fato;
      pedBox.appendChild(t2);
      (f.pedidos || []).forEach(p => {
        const li = document.createElement('li');
        li.textContent = p;
        li.onclick = () => toggleInclusao('pedidos', p, li);
        pedBox.appendChild(li);
      });
    });
  }

  function toggleInclusao(tipo, texto, li) {
    li.classList.toggle('ativo');
    const atuais = trechos[tipo] ? trechos[tipo] : '';
    if (li.classList.contains('ativo'))
      trechos[tipo] = atuais + `<p>${texto}</p>`;
    else
      trechos[tipo] = atuais.replace(`<p>${texto}</p>`, '');
    salvar();
    atualizarFinal();
  }

  popularFatos();

  /* ==========================================================
     Provas Selecionáveis
     ========================================================== */
  const provas = [
    'Carteira de Trabalho (CTPS)',
    'Contracheques / Holerites',
    'Comprovantes de FGTS',
    'Testemunhas',
    'Emails / Conversas de WhatsApp',
    'Atestados Médicos',
    'Contratos ou Termos de Admissão / Rescisão'
  ];
  const provasBox = $('#provas .viewer');
  provas.forEach(p => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${p}"> ${p}`;
    provasBox.appendChild(label);
  });
  provasBox.addEventListener('change', () => {
    const marcadas = Array.from(provasBox.querySelectorAll('input:checked')).map(i => i.value);
    trechos.provas = marcadas.map(m => `<p>${m}</p>`).join('');
    salvar();
    atualizarFinal();
  });

  /* ==========================================================
     Cálculos Automáticos
     ========================================================== */
  const tabela = $('#tabela');
  tabela?.addEventListener('input', () => {
    trechos.calculos = `<pre>${tabela.value}</pre>`;
    salvar();
    atualizarValor();
    atualizarFinal();
  });

  function atualizarValor() {
    const linhas = tabela.value.split('\n');
    let total = 0;
    linhas.forEach(l => {
      const num = parseFloat(l.replace(/[^\d,.-]/g, '').replace(',', '.'));
      if (!isNaN(num)) total += num;
    });
    $('#valorCausa').value = total.toFixed(2);
    trechos.valor = `<p>Valor da causa: R$ ${total.toFixed(2)}</p>`;
    salvar();
    atualizarFinal();
  }

  /* ==========================================================
     Editor mini (para todas as abas)
     ========================================================== */
  $$('.viewer').forEach(view => {
    if (view.closest('#fatos, #fundamentos, #pedidos, #provas')) return;
    const wrap = document.createElement('div');
    wrap.className = 'editor-area';
    const editor = document.createElement('div');
    editor.className = 'editor-mini';
    editor.contentEditable = true;
    const id = view.closest('.tab-content').id;
    editor.innerHTML = trechos[id] || '';
    wrap.appendChild(editor);
    view.replaceWith(wrap);
    editor.addEventListener('input', () => {
      trechos[id] = editor.innerHTML;
      salvar();
      atualizarFinal();
    });
  });

  /* ==========================================================
     Visualizador Final + IA
     ========================================================== */
  $('#btn-gerar-final')?.addEventListener('click', () => {
    const texto = $('#editor-final').innerText.trim();
    if (!texto) return alert('Nada para enviar à IA.');
    const contexto = `
Redija a PETIÇÃO INICIAL TRABALHISTA completa,
com base nos dados e trechos abaixo.
Use linguagem técnica e padrão forense.

${texto}
    `.trim();
    const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
    window.open(url, '_blank');
  });

  /* ==========================================================
     Salvamento periódico e inicialização
     ========================================================== */
  window.addEventListener('load', () => atualizarFinal());
  setInterval(salvar, 5000);
})();
