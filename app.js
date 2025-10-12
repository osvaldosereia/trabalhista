// app.js completo (corrigido)
import { FFP, PRELIMINARES } from './data/fatos-fundamentos-pedidos.js';

(() => {
  'use strict';

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));

  // ===== Estado =====
  const trechos = {};                 // HTML por seção
  const fatosSelecionados = [];       // lista de fatos adicionados
  const fundamentosSelecionados = []; // itens clicados para incluir
  const pedidosSelecionados = [];     // itens clicados para incluir
  const provasCatalogo = [
    'CTPS', 'Holerites', 'Contrato de Trabalho', 'Comunicações internas',
    'Escalas e cartões de ponto', 'CAT', 'ASO/PPP/LTCAT', 'Mensagens e e-mails',
    'Testemunhas', 'Extratos do FGTS', 'TRCT e guias', 'Laudos e atestados'
  ];
  const STORAGE_KEY = 'editorTrabalhista:v2';

  // ===== Orientação base para a IA =====
  const ORIENTACAO_IA =
    "Atue como ADVOGADO TRABALHISTA experiente. Redija em linguagem forense, clara, coesa e impessoal, " +
    "citando CLT, CF/88, CPC e súmulas/OJs do TST quando cabível. " +
    "Use APENAS as informações fornecidas (sem criar fatos). Estruture por tópicos com títulos, " +
    "alinhe pedidos e cálculos às regras trabalhistas e mantenha português do Brasil.";

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

  // ===== Inicialização FFP (Fatos no <select>) =====
  function carregarFFP() {
    if (!Array.isArray(FFP) || !FFP.length) {
      console.error('FFP não carregado.');
      return;
    }
    const sel = $('#select-fato');
    if (!sel) return;

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

  // ===== Fundamentos & Pedidos derivados dos Fatos =====
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
      li.title = 'Clique para incluir/remover no editor';
      li.addEventListener('click', () => toggleItem(li, fundamentosSelecionados, txt));
      fundUL.appendChild(li);
    });

    // Render pedidos
    Array.from(itensPed).forEach(txt => {
      const li = document.createElement('li');
      li.textContent = txt;
      li.title = 'Clique para incluir/remover no editor';
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
      if (sectionId === 'qualificacao') gerarQualificacao();
      else if (sectionId === 'contrato') gerarContrato();

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

    sel.innerHTML = '<option value="">Selecione…</option>';
    PRELIMINARES.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${p.titulo} — ${p.fundamentoCurto}`;
      sel.appendChild(opt);
    });

    btn.addEventListener('click', () => {
      const idx = parseInt(sel.value, 10);
      if (isNaN(idx)) return;
      const item = PRELIMINARES[idx];

      const li = document.createElement('li');
      li.textContent = `${item.titulo} — ${item.fundamentoCurto}`;
      li.style.cursor = 'pointer';
      li.title = 'Clique para inserir/remover no editor';
      lista.appendChild(li);

      const bloco = `<p><strong>${item.titulo}.</strong> ${item.modelo}</p>`;
      editor.innerHTML += bloco;
      trechos['preliminares'] = editor.innerHTML;
      atualizarFinal();
      persist();

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

  // ===== Builders de texto (Qualificação e Contrato) =====
  function gerarQualificacao() {
    const ed = sectionEditor('qualificacao');
    if (!ed) return;

    const f = $('#form-qualificacao');
    if (!f) return;

    const get = (name) => f.querySelector(`[name="${name}"]`)?.value?.trim() || '';

    // Reclamante
    const rc = {
      nome: get('reclamante_nome') || get('reclamante'),
      cpf: get('reclamante_cpf') || get('cpf'),
      rg: get('reclamante_rg'),
      ctps: get('reclamante_ctps'),
      serie: get('reclamante_ctps_serie'),
      prof: get('reclamante_profissao') || get('profissao'),
      end: get('reclamante_endereco') || get('endereco'),
      bairro: get('reclamante_bairro'),
      cidade: get('reclamante_cidade'),
      uf: get('reclamante_uf'),
      cep: get('reclamante_cep'),
      fone: get('reclamante_fone'),
      email: get('reclamante_email')
    };

    // Reclamada
    const rd = {
      nome: get('reclamada_nome') || get('reclamada'),
      cnpj: get('reclamada_cnpj') || get('cnpj'),
      end: get('reclamada_endereco') || get('endereco_reclamada'),
      bairro: get('reclamada_bairro'),
      cidade: get('reclamada_cidade'),
      uf: get('reclamada_uf'),
      cep: get('reclamada_cep'),
      fone: get('reclamada_fone'),
      email: get('reclamada_email')
    };

    const reclamanteTxt = `
      <p><strong>Reclamante:</strong> ${rc.nome || '[NOME]'}, ${rc.prof || '[PROFISSÃO]'},
      portador do CPF ${rc.cpf || '[CPF]'}${rc.rg ? `, RG ${rc.rg}` : ''}${rc.ctps ? `, CTPS ${rc.ctps}${rc.serie ? `, série ${rc.serie}` : ''}` : ''},
      residente na ${rc.end || '[ENDEREÇO]'}${rc.bairro ? `, ${rc.bairro}` : ''}, ${rc.cidade || ''}-${rc.uf || ''}${rc.cep ? `, CEP ${rc.cep}` : ''}${rc.fone ? `, Tel. ${rc.fone}` : ''}${rc.email ? `, E-mail: ${rc.email}` : ''}.</p>
    `.trim();

    const reclamadaTxt = `
      <p><strong>Reclamada:</strong> ${rd.nome || '[RAZÃO SOCIAL]'}, inscrita no CNPJ ${rd.cnpj || '[CNPJ]'},
      com endereço na ${rd.end || '[ENDEREÇO]'}${rd.bairro ? `, ${rd.bairro}` : ''}, ${rd.cidade || ''}-${rd.uf || ''}${rd.cep ? `, CEP ${rd.cep}` : ''}${rd.fone ? `, Tel. ${rd.fone}` : ''}${rd.email ? `, E-mail: ${rd.email}` : ''}.</p>
    `.trim();

    ed.innerHTML = `<div>${reclamanteTxt}${reclamadaTxt}</div>`;
    trechos['qualificacao'] = ed.innerHTML;
    atualizarFinal();
    persist();
  }

  function gerarContrato() {
    const ed = sectionEditor('contrato');
    if (!ed) return;

    const f = $('#form-contrato');
    if (!f) return;

    const get = (name) => f.querySelector(`[name="${name}"]`)?.value?.trim() || '';
    const adm = get('admissao');
    const sai = get('saida');
    const funcao = get('funcao');
    const salario = get('salario');
    const tipo = get('tipo_contrato');
    const jornada = get('jornada');
    const local = get('local_trabalho');

    const contratoTxt = `
      <p><strong>Contrato de Trabalho:</strong> Admissão em ${adm || '[DATA ADMISSÃO]'}${sai ? `, desligamento em ${sai}` : ''}.
      Função exercida: ${funcao || '[FUNÇÃO]'}, salário mensal de R$ ${salario || '[0,00]'}.
      Regime contratual: ${tipo || '[TIPO]'}, jornada: ${jornada || '[JORNADA]'}${local ? `, local de trabalho: ${local}` : ''}.</p>
    `.trim();

    ed.innerHTML = contratoTxt;
    trechos['contrato'] = ed.innerHTML;
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

  // ===== Botão "Abrir no Google IA" (prompt base restaurado) =====
  $('#btn-google-ia')?.addEventListener('click', () => {
    const texto = $('#editor-final').textContent.trim();
    const contexto =
      `${ORIENTACAO_IA}\n\n` +
      `TAREFA: Redija a PETIÇÃO INICIAL TRABALHISTA completa, pronta para protocolo, a partir do conteúdo a seguir.\n\n` +
      `CONTEÚDO:\n${texto}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
    window.open(url, '_blank');
  });

  // ===== Botões "Gerar com IA" das ações de cada aba =====
  $$('.tab-content .btn-ia').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.tab-content')?.id;
      if (!sec) return;
      const ed = sectionEditor(sec);
      openGoogleIAForSection(sec, ed || { innerText: '' });
    });
  });

  // ===== Botões "Salvar Trecho" das ações de cada aba =====
  $$('.tab-content .btn-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.tab-content')?.id;
      if (!sec) return;

      if (sec === 'qualificacao') gerarQualificacao();
      if (sec === 'contrato') gerarContrato();

      const ed = sectionEditor(sec);
      if (!ed) return;
      trechos[sec] = ed.innerHTML;
      atualizarFinal();
      persist();
      alert('Trecho salvo.');
    });
  });

  // ===== Google IA por seção (com prompt base) =====
  function openGoogleIAForSection(sectionId, editorEl) {
    const titulo = document.getElementById(sectionId).querySelector('h2').textContent;
    const inputs = document.getElementById(sectionId).querySelectorAll('input, textarea, select');
    const dados = Array.from(inputs)
      .map(el => `${el.name || el.id}: ${el.value}`)
      .filter(s => !s.endsWith(': '))
      .join(' | ');
    const texto = editorEl.innerText?.trim?.() || '';

    const contexto =
      `${ORIENTACAO_IA}\n\n` +
      `TAREFA: Redigir o trecho "${titulo}" de uma Reclamação Trabalhista.\n` +
      `DADOS ESTRUTURADOS: ${dados || '[sem dados adicionais]'}\n` +
      `TEXTO ATUAL (se houver): ${texto || '[vazio]'}\n`;

    const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
    window.open(url, '_blank');
  }

  // ===== Persistência =====
  function collectProvasSelecionadas() {
    return Array.from($('#provas-box').querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
  }

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

      // aplicar seleção de listas após rebuild
      setTimeout(() => {
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

      // repintar editores já salvos
      const ids = ['qualificacao','preliminares','contrato','fatos','fundamentos','pedidos','calculos','provas','valor'];
      ids.forEach(id => {
        if (trechos[id]) {
          const ed = sectionEditor(id);
          if (ed) ed.innerHTML = trechos[id];
        }
      });

      atualizarFinal();
      recalcTabela();
    } catch(e) {
      console.warn('Falha ao restaurar', e);
    }
  }

  // ===== Provas e inicialização =====
  buildProvas();
  carregarFFP();
  popularPreliminares();
  restore();
  recalcTabela();

  // ===== Dica de estilo (adicione ao style.css) =====
  // #fundamentos-box li.ativo, #pedidos-box li.ativo { background:#eef; }

})();
