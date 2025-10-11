// app.js completo
import { FFP, PRELIMINARES } from './data/fatos-fundamentos-pedidos.js';

(() => {
  'use strict';

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));

  // ===== Estado =====
  const trechos = {};                // HTML por seção
  const fatosSelecionados = [];      // lista de fatos adicionados
  const fundamentosSelecionados = []; // itens clicados para incluir
  const pedidosSelecionados = [];     // itens clicados para incluir
  const provasCatalogo = [
    'CTPS', 'Holerites', 'Contrato de Trabalho', 'Comunicações internas',
    'Escalas e cartões de ponto', 'CAT', 'ASO/PPP/LTCAT', 'Mensagens e e-mails',
    'Testemunhas', 'Extratos do FGTS', 'TRCT e guias', 'Laudos e atestados'
  ];
  const STORAGE_KEY = 'editorTrabalhista:v2';

  // ===== Abas =====
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

  // ===== Inicialização FFP =====
  function carregarFFP() {
    if (!Array.isArray(FFP) || !FFP.length) {
      console.error('FFP não carregado.');
      return;
    }
    const sel = $('#select-fato');
    sel.innerHTML = '<option value="">Selecione um fato</option>';
    FFP.filter(x => x.fato).forEach(item => {
      const op = document.createElement('option');
      op.value = item.fato;
      op.textContent = item.fato;
      sel.appendChild(op);
    });
  }

  // ===== Adicionar múltiplos Fatos =====
  function uiAddFato(nomeFato) {
    if (!nomeFato) return;
    if (fatosSelecionados.includes(nomeFato)) return;
    fatosSelecionados.push(nomeFato);

    const wrap = $('#fatos-list');
    const box = document.createElement('div');
    box.className = 'fato-bloco';
    box.dataset.fato = nomeFato;
    box.innerHTML = `<span class="titulo">${nomeFato}</span><button class="remover" title="remover">✖</button>`;
    wrap.appendChild(box);

    box.querySelector('.remover').addEventListener('click', () => {
      const idx = fatosSelecionados.indexOf(nomeFato);
      if (idx >= 0) fatosSelecionados.splice(idx, 1);
      box.remove();
      rebuildFundamentosPedidos();
      syncFatosEditor();
      atualizarFinal();
      persist();
    });

    rebuildFundamentosPedidos();
    syncFatosEditor();
    atualizarFinal();
    persist();
  }

  $('#add-fato').addEventListener('click', () => {
    const val = $('#select-fato').value;
    uiAddFato(val);
  });

  function rebuildFundamentosPedidos() {
    const fundUL = $('#fundamentos-box');
    const pedUL = $('#pedidos-box');
    fundUL.innerHTML = '';
    pedUL.innerHTML = '';

    const itensFund = new Set();
    const itensPed = new Set();

    fatosSelecionados.forEach(f => {
      const row = FFP.find(x => x.fato === f);
      if (row) {
        (row.fundamentos || []).forEach(it => itensFund.add(it));
        (row.pedidos || []).forEach(it => itensPed.add(it));
      }
    });

    // Render fundamentos
    Array.from(itensFund).forEach(txt => {
      const li = document.createElement('li');
      li.textContent = txt;
      li.title = 'Clique para incluir no editor';
      li.addEventListener('click', () => toggleItem(li, fundamentosSelecionados, txt));
      fundUL.appendChild(li);
    });

    // Render pedidos
    Array.from(itensPed).forEach(txt => {
      const li = document.createElement('li');
      li.textContent = txt;
      li.title = 'Clique para incluir no editor';
      li.addEventListener('click', () => toggleItem(li, pedidosSelecionados, txt));
      pedUL.appendChild(li);
    });
  }

  function toggleItem(li, bucket, value) {
    const i = bucket.indexOf(value);
    if (i >= 0) {
      bucket.splice(i, 1);
      li.classList.remove('ativo');
    } else {
      bucket.push(value);
      li.classList.add('ativo');
    }
    syncFundamentosEditor();
    syncPedidosEditor();
    atualizarFinal();
    persist();
  }

  // ===== Mini editores por seção =====
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
      <button class="btn-ia-local" title="Gerar com Google IA">🌐 IA</button>
      <button class="btn-save-local" title="Salvar trecho">💾</button>
    `;
    const editor = document.createElement('div');
    editor.className = 'editor-mini';
    editor.contentEditable = true;
    const sectionId = view.closest('.tab-content').id;
    editor.dataset.section = sectionId;

    wrapper.appendChild(toolbar);
    wrapper.appendChild(editor);
    view.replaceWith(wrapper);

    toolbar.addEventListener('click', e => {
      const cmd = e.target.dataset.cmd;
      if (cmd) document.execCommand(cmd, false, null);
    });

    // IA local por aba
    toolbar.querySelector('.btn-ia-local').addEventListener('click', () => openGoogleIAForSection(sectionId, editor));

    // salvar manual por aba
    toolbar.querySelector('.btn-save-local').addEventListener('click', () => {
      trechos[sectionId] = editor.innerHTML;
      atualizarFinal();
      persist();
      alert('Trecho salvo.');
    });

    // salvar e sincronizar ao digitar
    editor.addEventListener('input', () => {
      trechos[sectionId] = editor.innerHTML;
      if (sectionId === 'calculos') recalcTabela();
      atualizarFinal();
      persist();
    });
  });

  // ===== Sincronizações específicas =====
  function syncFatosEditor() {
    const editor = sectionEditor('fatos');
    if (!editor) return;
    editor.innerHTML = fatosSelecionados.map(f => `<p><strong>${f}:</strong> [Descrever fatos com base nos documentos anexados]</p>`).join('');
    trechos['fatos'] = editor.innerHTML;
  }

  function syncFundamentosEditor() {
    const editor = sectionEditor('fundamentos');
    if (!editor) return;
    editor.innerHTML = '<ul>' + fundamentosSelecionados.map(x => `<li>${x}</li>`).join('') + '</ul>';
    trechos['fundamentos'] = editor.innerHTML;
  }

  function syncPedidosEditor() {
    const editor = sectionEditor('pedidos');
    if (!editor) return;
    editor.innerHTML = '<ol>' + pedidosSelecionados.map(x => `<li>${x}</li>`).join('') + '</ol>';
    trechos['pedidos'] = editor.innerHTML;
    ensurePedidoOnTabela();
  }

  function sectionEditor(id) {
    const sec = document.getElementById(id);
    return sec ? sec.querySelector('.editor-mini') : null;
  }
// ================== PRELIMINARES (popular e adicionar) ==================
function popularPreliminares() {
  const sel   = document.getElementById('preliminares-select');
  const btn   = document.getElementById('add-preliminar');
  const lista = document.getElementById('preliminares-list');
  const editor = sectionEditor('preliminares');
  if (!sel || !btn || !lista || !editor || !Array.isArray(PRELIMINARES)) return;

  // preenche o select
  sel.innerHTML = '<option value="">Selecione…</option>';
  PRELIMINARES.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${p.titulo} — ${p.fundamentoCurto}`;
    sel.appendChild(opt);
  });

  // adiciona a preliminar ao clicar no botão
  btn.addEventListener('click', () => {
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx)) return;
    const item = PRELIMINARES[idx];

    // cria linha clicável na lista (toggle no editor)
    const li = document.createElement('li');
    li.textContent = `${item.titulo} — ${item.fundamentoCurto}`;
    li.style.cursor = 'pointer';
    li.title = 'Clique para inserir/remover no editor';
    lista.appendChild(li);

    const bloco = `<p><strong>${item.titulo}.</strong> ${item.modelo}</p>`;
    // insere no editor ao adicionar
    editor.innerHTML += bloco;
    trechos['preliminares'] = editor.innerHTML;
    atualizarFinal();
    persist();

    // toggle por clique na linha
    li.addEventListener('click', () => {
      if (editor.innerHTML.includes(bloco)) {
        editor.innerHTML = editor.innerHTML.replace(bloco, '');
      } else {
        editor.innerHTML += bloco;
      }
      trechos['preliminares'] = editor.innerHTML;
      atualizarFinal();
      persist();
    });

    sel.value = '';
  });
}

  // ===== Provas catálogo =====
  function buildProvas() {
    const box = $('#provas-box');
    box.innerHTML = '';
    provasCatalogo.forEach(nome => {
      const id = 'pv_' + nome.replace(/\W+/g, '_');
      const wrap = document.createElement('label');
      wrap.innerHTML = `<input type="checkbox" id="${id}" value="${nome}"> ${nome}`;
      box.appendChild(wrap);
    });
  }

  // ===== Tabela de cálculos =====
  function ensurePedidoOnTabela() {
    const tbody = $('#tabela-calculos tbody');
    const rowKeys = Array.from(tbody.querySelectorAll('tr')).map(r => r.dataset.key);
    pedidosSelecionados.forEach(p => {
      const key = 'p_' + p.slice(0, 40);
      if (!rowKeys.includes(key)) {
        const tr = document.createElement('tr');
        tr.dataset.key = key;
        tr.innerHTML = `
          <td contenteditable="true">${p}</td>
          <td><input type="number" step="0.01" value="0"></td>
          <td><input type="number" step="0.01" value="1"></td>
          <td><input type="number" step="0.01" value="0"></td>
          <td class="total">0,00</td>
        `;
        tbody.appendChild(tr);
        tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
      }
    });
    recalcTabela();
  }

  $('#btn-add-linha').addEventListener('click', () => {
    const tbody = $('#tabela-calculos tbody');
    const tr = document.createElement('tr');
    tr.dataset.key = 'manual_' + Date.now();
    tr.innerHTML = `
      <td contenteditable="true">Item manual</td>
      <td><input type="number" step="0.01" value="0"></td>
      <td><input type="number" step="0.01" value="1"></td>
      <td><input type="number" step="0.01" value="0"></td>
      <td class="total">0,00</td>
    `;
    tbody.appendChild(tr);
    tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
    recalcTabela();
  });

  function recalcTabela() {
    const tbody = $('#tabela-calculos tbody');
    let totalGeral = 0;
    tbody.querySelectorAll('tr').forEach(tr => {
      const base = parseFloat(tr.children[1].querySelector('input').value || '0');
      const qtd  = parseFloat(tr.children[2].querySelector('input').value || '0');
      const perc = parseFloat(tr.children[3].querySelector('input').value || '0');
      const total = base * qtd * (1 + perc/100);
      tr.querySelector('.total').textContent = total.toFixed(2).replace('.', ',');
      totalGeral += total;
    });
    $('#total-geral').textContent = totalGeral.toFixed(2).replace('.', ',');
    const vc = $('#valorCausa');
    if (vc && !vc.matches(':focus')) vc.value = totalGeral.toFixed(2);
    trechos['calculos'] = $('#tabela-wrap').outerHTML;
    trechos['valor'] = `<p><strong>Valor da Causa: R$ ${totalGeral.toFixed(2).replace('.', ',')}</strong></p>`;
    atualizarFinal();
    persist();
  }

  // ===== Visualizador Final =====
  function atualizarFinal() {
    const editorFinal = $('#editor-final');
    const ordem = ['qualificacao','preliminares','contrato','fatos','fundamentos','pedidos','calculos','provas','valor'];
    const partes = ordem
      .filter(id => trechos[id])
      .map(id => `<h3>${capitalize(id)}</h3>${trechos[id]}`)
      .join('<hr>');
    editorFinal.innerHTML = partes || '<p>Nenhum trecho adicionado ainda.</p>';
  }

  function capitalize(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ===== Ações finais =====
  $('#btn-gerar-final').addEventListener('click', () => {
    const editor = $('#editor-final');
    const plain = editor.innerText.trim();
    editor.textContent = plain; // garante texto limpo para copiar
  });

  $('#btn-copiar').addEventListener('click', () => {
    const text = $('#editor-final').textContent;
    navigator.clipboard.writeText(text);
    alert('Prompt copiado.');
  });

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

  // Google IA no FINAL
  $('#btn-google-ia').addEventListener('click', () => {
    const texto = $('#editor-final').textContent.trim();
    const contexto = `Redija a PETIÇÃO INICIAL TRABALHISTA completa, pronta para protocolo, a partir do seguinte conteúdo estruturado: ${texto}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
    window.open(url, '_blank');
  });

  // ===== Provas salvar =====
  function collectProvasSelecionadas() {
    return Array.from($('#provas-box').querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
  }

  // ===== Persistência =====
  function persist() {
    const payload = {
      trechos,
      fatosSelecionados,
      fundamentosSelecionados,
      pedidosSelecionados,
      tabela: $('#tabela-wrap').innerHTML,
      provas: collectProvasSelecionadas(),
      valorCausa: $('#valorCausa')?.value || ''
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      // fatos
      (data.fatosSelecionados || []).forEach(uiAddFato);

      // listas selecionadas não renderizam OK antes do rebuild, então aplicar após rebuild
      setTimeout(() => {
        // marcar fundamentos e pedidos antigos como ativos
        $$('ul#fundamentos-box li').forEach(li => {
          if ((data.fundamentosSelecionados || []).includes(li.textContent)) {
            li.classList.add('ativo');
            if (!fundamentosSelecionados.includes(li.textContent)) fundamentosSelecionados.push(li.textContent);
          }
        });
        $$('ul#pedidos-box li').forEach(li => {
          if ((data.pedidosSelecionados || []).includes(li.textContent)) {
            li.classList.add('ativo');
            if (!pedidosSelecionados.includes(li.textContent)) pedidosSelecionados.push(li.textContent);
          }
        });
        syncFundamentosEditor();
        syncPedidosEditor();
      }, 100);

      // trechos HTML
      Object.assign(trechos, data.trechos || {});
      // recarregar tabela e valor
      if (data.tabela) $('#tabela-wrap').innerHTML = data.tabela;
      $('#valorCausa').value = data.valorCausa || '';

      // religar eventos da tabela
      $('#tabela-calculos tbody').querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));

      // provas
      (data.provas || []).forEach(v => {
        const id = 'pv_' + v.replace(/\W+/g, '_');
        const el = document.getElementById(id);
        if (el) el.checked = true;
      });

      atualizarFinal();
      recalcTabela();
    } catch(e) {
      console.warn('Falha ao restaurar', e);
    }
  }

  // ===== Botões .btn-save genéricos de cada seção =====
  $$('.tab-content .btn-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.tab-content').id;
      const editor = sectionEditor(sec);
      if (editor) {
        trechos[sec] = editor.innerHTML;
        atualizarFinal();
        persist();
        alert('Trecho salvo.');
      }
    });
  });

  // ===== Google IA por seção =====
  function openGoogleIAForSection(sectionId, editorEl) {
    const titulo = document.getElementById(sectionId).querySelector('h2').textContent;
    const inputs = document.getElementById(sectionId).querySelectorAll('input, textarea, select');
    const dados = Array.from(inputs).map(el => `${el.name || el.id}: ${el.value}`).filter(s => !s.endsWith(': ')).join(' | ');
    const texto = editorEl.innerText.trim();
    const contexto = `Redija o trecho "${titulo}" de uma Reclamação Trabalhista. Use linguagem técnica forense. Dados: ${dados}. Texto atual: ${texto}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
    window.open(url, '_blank');
  }

  // ===== Provas e inicialização =====
  buildProvas();
  carregarFFP();
  popularPreliminares();   // <— adicione esta linha
  restore();
  recalcTabela();

})();
