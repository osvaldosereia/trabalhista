// app.js completo (v3 final)
import { FFP, PRELIMINARES } from './data/fatos-fundamentos-pedidos.js';

(() => {
  'use strict';

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));

  // ===== Estado =====
  const trechos = {};                 // HTML por seção
  const fatosSelecionados = [];       // lista de fatos adicionados
  // seleção categorizada por fato
  const selecaoPorFato = {
    fundamentos: {}, // { [fato]: Set<string> }
    pedidos: {}      // { [fato]: Set<string> }
  };

  const provasCatalogo = [
    'CTPS', 'Holerites', 'Contrato de Trabalho', 'Comunicações internas',
    'Escalas e cartões de ponto', 'CAT', 'ASO/PPP/LTCAT', 'Mensagens e e-mails',
    'Testemunhas', 'Extratos do FGTS', 'TRCT e guias', 'Laudos e atestados'
  ];
  const STORAGE_KEY = 'editorTrabalhista:v3';

  // ===== Orientação base para a IA =====
  const ORIENTACAO_IA =
    "Atue como ADVOGADO TRABALHISTA experiente. Redija trechos fiéis à prática forense da JT, " +
    "fundamente com CLT, CF/88, leis correlatas, Súmulas/OJs do TST e precedentes. " +
    "Se necessário, pesquise em fontes oficiais (Planalto, LexML, CNJ, TST, TRTs, INSS, Gov.br) " +
    "e em fonte consolidada (JusBrasil). Mantenha linguagem técnica, concisa e estruturada.";

  // ===== Tabs =====
  const tabs = $$('.tabs .tab');
  const sections = $$('.tab-content');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const id = t.dataset.tab;
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
    FFP.forEach(grupo => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = grupo.categoria;
      grupo.itens.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.nome;
        opt.textContent = f.nome;
        optgroup.appendChild(opt);
      });
      sel.appendChild(optgroup);
    });

    $('#btn-add-fato')?.addEventListener('click', () => {
      const nome = sel.value;
      if (!nome) return;
      if (fatosSelecionados.includes(nome)) return;
      fatosSelecionados.push(nome);
      addFatoUI(nome);
    });
  }

  function addFatoUI(nomeFato) {
    const wrap = $('#fatos-list');
    if (!wrap) return;

    const box = document.createElement('div');
    box.className = 'fato-bloco';
    box.dataset.fato = nomeFato;
    box.innerHTML = `<span class="titulo">${nomeFato}</span><button class="remover" title="Remover fato">✖</button>`;
    wrap.appendChild(box);

    box.querySelector('.remover').addEventListener('click', () => {
      const idx = fatosSelecionados.indexOf(nomeFato);
      if (idx >= 0) fatosSelecionados.splice(idx, 1);
      // limpar seleções relacionadas a este fato
      delete selecaoPorFato.fundamentos[nomeFato];
      delete selecaoPorFato.pedidos[nomeFato];
      box.remove();
      rebuildFundamentosPedidos();
      syncFatosEditor();
      syncFundamentosEditor();
      syncPedidosEditor();
      recalcTabela();
      atualizarFinal();
      persist();
    });

    rebuildFundamentosPedidos();
    syncFatosEditor();
    atualizarFinal();
    persist();
  }

  // ===== Montagem Fundamentos/Pedidos por fato =====
  function rebuildFundamentosPedidos() {
    const fundBox = $('#fundamentos-box');
    const pedBox  = $('#pedidos-box');
    if (!fundBox || !pedBox) return;

    fundBox.innerHTML = '';
    pedBox.innerHTML  = '';

    fatosSelecionados.forEach(fato => {
      const f = acharFato(fato);
      if (!f) return;

      if (!selecaoPorFato.fundamentos[fato]) selecaoPorFato.fundamentos[fato] = new Set();
      if (!selecaoPorFato.pedidos[fato])     selecaoPorFato.pedidos[fato]     = new Set();

      // Fundamentos
      const detF = document.createElement('details');
      detF.open = true;
      detF.innerHTML = `<summary><strong>${fato}</strong></summary>`;
      const ulF = document.createElement('ul');
      f.fundamentos.forEach(txt => {
        const li = document.createElement('li');
        li.textContent = txt;
        li.dataset.fato = fato;
        li.dataset.tipo = 'fund';
        if (selecaoPorFato.fundamentos[fato].has(txt)) li.classList.add('ativo');
        li.addEventListener('click', () => {
          toggleCategorizado('fund', fato, txt, li);
        });
        ulF.appendChild(li);
      });
      detF.appendChild(ulF);
      fundBox.appendChild(detF);

      // Pedidos
      const detP = document.createElement('details');
      detP.open = true;
      detP.innerHTML = `<summary><strong>${fato}</strong></summary>`;
      const ulP = document.createElement('ul');
      f.pedidos.forEach(txt => {
        const li = document.createElement('li');
        li.textContent = txt;
        li.dataset.fato = fato;
        li.dataset.tipo = 'ped';
        if (selecaoPorFato.pedidos[fato].has(txt)) li.classList.add('ativo');
        li.addEventListener('click', () => {
          toggleCategorizado('ped', fato, txt, li);
        });
        ulP.appendChild(li);
      });
      detP.appendChild(ulP);
      pedBox.appendChild(detP);
    });
  }

  function toggleCategorizado(tipo, fato, valor, li) {
    const bucket = tipo === 'fund' 
      ? selecaoPorFato.fundamentos : selecaoPorFato.pedidos;
    if (!bucket[fato]) bucket[fato] = new Set();
    if (bucket[fato].has(valor)) {
      bucket[fato].delete(valor);
      li.classList.remove('ativo');
    } else {
      bucket[fato].add(valor);
      li.classList.add('ativo');
    }
    syncFundamentosEditor();
    syncPedidosEditor();
    ensurePedidoOnTabela();
    recalcTabela();
    atualizarFinal();
    persist();
  }

  function acharFato(nome) {
    for (const g of FFP) {
      for (const f of g.itens) {
        if (f.nome === nome) return f;
      }
    }
    return null;
  }

  // ===== Sincronizações específicas =====
  function sectionEditor(id) {
    const sec = document.getElementById(id);
    return sec ? sec.querySelector('.editor-mini') : null;
  }

  function syncFatosEditor() {
    const editor = sectionEditor('fatos');
    if (!editor) return;
    editor.innerHTML = fatosSelecionados
      .map(f => `<p><strong>${f}:</strong> [Descrever fatos com base nos documentos anexados]</p>`).join('');
    trechos['fatos'] = editor.innerHTML;
  }

  function syncFundamentosEditor() {
    const editor = sectionEditor('fundamentos');
    if (!editor) return;
    const html = fatosSelecionados.map(f => {
      const itens = Array.from(selecaoPorFato.fundamentos[f] || []);
      if (!itens.length) return '';
      return `<h4>${f}</h4><ul>${itens.map(x => `<li>${x}</li>`).join('')}</ul>`;
    }).filter(Boolean).join('');
    editor.innerHTML = html || '<p>[Selecione fundamentos]</p>';
    trechos['fundamentos'] = editor.innerHTML;
  }

  function syncPedidosEditor() {
    const editor = sectionEditor('pedidos');
    if (!editor) return;
    const html = fatosSelecionados.map(f => {
      const itens = Array.from(selecaoPorFato.pedidos[f] || []);
      if (!itens.length) return '';
      return `<h4>${f}</h4><ol>${itens.map(x => `<li>${x}</li>`).join('')}</ol>`;
    }).filter(Boolean).join('');
    editor.innerHTML = html || '<p>[Selecione pedidos]</p>';
    trechos['pedidos'] = editor.innerHTML;
  }

  // ===== Garantir que pedidos marcados virem linhas na tabela =====
  function ensurePedidoOnTabela() {
    const tbody = $('#tabela-calculos tbody');
    if (!tbody) return;
    const atuais = new Set(Array.from(tbody.querySelectorAll('tr')).map(tr => tr.dataset.item));
    const marcados = [];
    fatosSelecionados.forEach(f => {
      Array.from(selecaoPorFato.pedidos[f] || []).forEach(p => marcados.push(p));
    });
    // incluir os que não existem
    marcados.forEach(nome => {
      if (atuais.has(nome)) return;
      const tr = document.createElement('tr');
      tr.dataset.item = nome;
      tr.innerHTML = `
        <td>${nome}</td>
        <td><input type="number" step="0.01" value="0"></td>
        <td><input type="number" step="0.01" value="1"></td>
        <td><input type="number" step="0.01" value="0"></td>
        <td class="total">0,00</td>
      `;
      tbody.appendChild(tr);
      tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
    });
    // remover linhas que não estão mais marcadas
    tbody.querySelectorAll('tr').forEach(tr => {
      const nome = tr.dataset.item;
      if (!marcados.includes(nome) && nome !== 'Item manual') tr.remove();
    });
  }

  // ===== Preliminares (catálogo) =====
  function popularPreliminares() {
    const sel = $('#select-preliminar');
    const editor = sectionEditor('preliminares');
    if (!sel || !editor) return;

    sel.innerHTML = '<option value="">Adicionar preliminar</option>';
    PRELIMINARES.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.titulo;
      sel.appendChild(opt);
    });

    $('#btn-add-preliminar')?.addEventListener('click', () => {
      const id = sel.value;
      if (!id) return;
      const p = PRELIMINARES.find(x => x.id === id);
      if (!p) return;
      const bloco = `
        <h4>${p.titulo}</h4>
        <p>${p.texto}</p>
      `;
      if (editor.innerHTML.includes(`<h4>${p.titulo}</h4>`)) {
        alert('Essa preliminar já foi incluída.');
      } else {
        editor.insertAdjacentHTML('beforeend', bloco);
      }
      trechos['preliminares'] = editor.innerHTML;
      atualizarFinal();
      persist();
      sel.value = '';
    });
  }

  // ===== Provas catálogo =====
  function buildProvas() {
    const box = $('#provas-box');
    if (!box) return;
    box.innerHTML = '';
    provasCatalogo.forEach(nome => {
      const id = 'pv_' + nome.replace(/\W+/g, '_');
      const wrap = document.createElement('label');
      wrap.innerHTML = `<input type="checkbox" id="${id}" value="${nome}"> ${nome}`;
      box.appendChild(wrap);
    });
  }

  // ===== Tabela de cálculos =====
  function limparTabela() {
    const tbody = $('#tabela-calculos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    // linha manual inicial
    const tr = document.createElement('tr');
    tr.dataset.item = 'Item manual';
    tr.innerHTML = `
      <td>Item manual</td>
      <td><input type="number" step="0.01" value="0"></td>
      <td><input type="number" step="0.01" value="1"></td>
      <td><input type="number" step="0.01" value="0"></td>
      <td class="total">0,00</td>
    `;
    tbody.appendChild(tr);
    tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
  }

  $('#btn-add-linha')?.addEventListener('click', () => {
    const tbody = $('#tabela-calculos tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.dataset.item = 'Item manual';
    tr.innerHTML = `
      <td>Item manual</td>
      <td><input type="number" step="0.01" value="0"></td>
      <td><input type="number" step="0.01" value="1"></td>
      <td><input type="number" step="0.01" value="0"></td>
      <td class="total">0,00</td>
    `;
    tbody.appendChild(tr);
    tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
    recalcTabela();
  });

  $('#btn-recalcular')?.addEventListener('click', () => recalcTabela());

  function recalcTabela() {
    const tbody = $('#tabela-calculos tbody');
    if (!tbody) return;
    let totalGeral = 0;
    tbody.querySelectorAll('tr').forEach(tr => {
      const base = parseFloat(tr.children[1].querySelector('input').value || '0');
      const qtd  = parseFloat(tr.children[2].querySelector('input').value || '0');
      const perc = parseFloat(tr.children[3].querySelector('input').value || '0');
      const total = base * qtd * (1 + perc/100);
      tr.querySelector('.total').textContent = total.toFixed(2).replace('.', ',');
      totalGeral += total;
    });
    $('#total-geral') && ($('#total-geral').textContent = totalGeral.toFixed(2).replace('.', ','));
    const vc = $('#valorCausa');
    if (vc && !vc.matches(':focus')) vc.value = totalGeral.toFixed(2);
    trechos['calculos'] = $('#tabela-wrap')?.outerHTML || '';
    trechos['valor'] = `<p><strong>Valor da Causa: R$ ${totalGeral.toFixed(2).replace('.', ',')}</strong></p>`;
    atualizarFinal();
    persist();
  }

  // Valor da Causa manual em tempo real
  document.getElementById('valorCausa')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value || '0');
    trechos['valor'] = `<p><strong>Valor da Causa: R$ ${v.toFixed(2).replace('.', ',')}</strong></p>`;
    atualizarFinal();
    persist();
  });

  // ===== Builders de texto (Qualificação e Contrato) =====
  function gerarQualificacao() {
    const ed = sectionEditor('qualificacao');
    if (!ed) return;

    const f = $('#form-qualificacao');
    if (!f) return;

    const get = (name) => f.querySelector(`[name="${name}"]`)?.value?.trim() || '';

    // Reclamante
    const rc = {
      nome: get('reclamante_nome') || get('rec_nome'),
      cpf: get('reclamante_cpf') || get('rec_cpf'),
      rg: get('reclamante_rg') || get('rec_rg'),
      orgao: get('reclamante_orgao') || get('rec_orgao'),
      ctps: get('reclamante_ctps') || get('rec_ctps'),
      serie: get('reclamante_serie') || get('rec_serie'),
      prof: get('reclamante_profissao') || get('rec_profissao'),
      estado: get('reclamante_estado_civil') || get('rec_estado_civil'),
      end: get('reclamante_endereco') || get('rec_endereco'),
      bairro: get('reclamante_bairro') || '',
      cidade: get('reclamante_cidade') || '',
      uf: get('reclamante_uf') || '',
      cep: get('reclamante_cep') || '',
      fone: get('reclamante_fone') || '',
      email: get('reclamante_email') || ''
    };

    // Reclamada
    const rd = {
      nome: get('reclamada_nome') || get('emp_nome'),
      cnpj: get('reclamada_cnpj') || get('emp_cnpj'),
      end: get('reclamada_endereco') || get('emp_endereco'),
      bairro: get('reclamada_bairro') || '',
      cidade: get('reclamada_cidade') || '',
      uf: get('reclamada_uf') || '',
      cep: get('reclamada_cep') || '',
      fone: get('reclamada_fone') || '',
      email: get('reclamada_email') || ''
    };

    const reclamanteTxt = `
      <p><strong>Reclamante:</strong> ${rc.nome || '[NOME]'}, ${rc.prof || '[PROFISSÃO]'},
      portador do CPF ${rc.cpf || '[CPF]'}${rc.rg ? `, RG ${rc.rg}${rc.orgao ? `/${rc.orgao}` : ''}` : ''}${rc.ctps ? `, CTPS ${rc.ctps}${rc.serie ? `, série ${rc.serie}` : ''}` : ''},
      residente na ${rc.end || '[ENDEREÇO]'}${rc.bairro ? `, ${rc.bairro}` : ''}${rc.cidade ? `, ${rc.cidade}` : ''}${rc.uf ? `/${rc.uf}` : ''}${rc.cep ? `, CEP ${rc.cep}` : ''}${rc.fone ? `, Tel.: ${rc.fone}` : ''}${rc.email ? `, E-mail: ${rc.email}` : ''}.</p>
    `.trim();

    const reclamadaTxt = `
      <p><strong>Reclamada:</strong> ${rd.nome || '[RAZÃO SOCIAL]'}, inscrita no CNPJ ${rd.cnpj || '[CNPJ]'},
      com endereço na ${rd.end || '[ENDEREÇO]'}${rd.bairro ? `, ${rd.bairro}` : ''}${rd.cidade ? `, ${rd.cidade}` : ''}${rd.uf ? `/${rd.uf}` : ''}${rd.cep ? `, CEP ${rd.cep}` : ''}${rd.fone ? `, Tel.: ${rd.fone}` : ''}${rd.email ? `, E-mail: ${rd.email}` : ''}.</p>
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

    const contratoTxt = `
      <p>O reclamante foi admitido em <strong>${adm || '[DATA DE ADMISSÃO]'}</strong>,
      para exercer a função de <strong>${funcao || '[FUNÇÃO]'}</strong>,
      percebendo salário de <strong>R$ ${salario || '[SALÁRIO]'}</strong>, sob regime
      <strong>${tipo || '[TIPO DE CONTRATO]'}</strong>, com jornada <strong>${jornada || '[JORNADA]'}</strong>.
      ${sai ? `A rescisão ocorreu em <strong>${sai}</strong>.` : ''}</p>
    `.trim();

    ed.innerHTML = contratoTxt;
    trechos['contrato'] = ed.innerHTML;
    atualizarFinal();
    persist();
  }

  // ===== Visualizador Final =====
  function atualizarFinal() {
    const final = $('#editor-final');
    if (!final) return;
    const parts = [
      trechos['qualificacao'],
      trechos['preliminares'],
      trechos['contrato'],
      trechos['fatos'],
      trechos['fundamentos'],
      '<h3>Pedidos</h3>',
      trechos['pedidos'],
      '<h3>Calculos</h3>',
      trechos['calculos'],
      '<h3>Valor</h3>',
      trechos['valor']
    ].filter(Boolean);
    final.innerHTML = parts.join('\n<hr>\n');
  }

  // ===== Toolbar genérica dos editores =====
  $$('.editor-toolbar').forEach(toolbar => {
    const sectionId = toolbar.dataset.for;
    const editor = sectionEditor(sectionId);

    toolbar.querySelector('.btn-bold')?.addEventListener('click', () => document.execCommand('bold'));
    toolbar.querySelector('.btn-italic')?.addEventListener('click', () => document.execCommand('italic'));
    toolbar.querySelector('.btn-li')?.addEventListener('click', () => document.execCommand('insertUnorderedList'));
    toolbar.querySelector('.btn-clear')?.addEventListener('click', () => {
      if (confirm('Limpar conteúdo desta seção?')) {
        if (editor) editor.innerHTML = '';
        trechos[sectionId] = '';
        if (sectionId === 'calculos') {
          limparTabela();
          recalcTabela();
        }
        atualizarFinal();
        persist();
      }
    });
    toolbar.querySelector('.btn-ia-local')?.addEventListener('click', () => openGoogleIAForSection(sectionId, editor));
    toolbar.querySelector('.btn-save')?.addEventListener('click', () => {
      // atalho local de salvar pela toolbar
      const btn = document.querySelector(`#${sectionId} .btn-save`);
      btn?.click();
    });
  });

  // ===== Botão "Salvar Trecho" por seção (ajustado p/ Cálculos e Valor) =====
  $$('.tab-content .btn-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.tab-content')?.id;
      if (!sec) return;

      if (sec === 'qualificacao') gerarQualificacao();
      if (sec === 'contrato') gerarContrato();

      const ed = sectionEditor(sec);

      if (sec === 'calculos') {
        recalcTabela();
        // recalcTabela já atualiza trechos['calculos'] e trechos['valor']
      } else if (sec === 'valor') {
        const vc = document.getElementById('valorCausa');
        const v  = vc ? parseFloat(vc.value || '0') : 0;
        trechos['valor'] = `<p><strong>Valor da Causa: R$ ${v.toFixed(2).replace('.', ',')}</strong></p>`;
      } else if (ed) {
        trechos[sec] = ed.innerHTML;
      }

      atualizarFinal();
      persist();
      alert('Trecho salvo.');
    });
  });

  // ===== Botões "Limpar Seção" (opcional: .btn-clear se existir no HTML) =====
  $$('.tab-content .btn-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.tab-content')?.id;
      if (!sec) return;

      if (sec === 'fundamentos') {
        selecaoPorFato.fundamentos = {};
        $('#fundamentos-box') && ($('#fundamentos-box').innerHTML = '');
      }
      if (sec === 'pedidos') {
        selecaoPorFato.pedidos = {};
        $('#pedidos-box') && ($('#pedidos-box').innerHTML = '');
        ensurePedidoOnTabela();
        recalcTabela();
      }

      const ed = sectionEditor(sec);
      if (ed) ed.innerHTML = '';
      trechos[sec] = '';
      atualizarFinal();
      persist();
    });
  });

  // ===== Google IA por seção (com prompt base) =====
  function openGoogleIAForSection(sectionId, editorEl) {
    const secEl = document.getElementById(sectionId);
    if (!secEl) return;
    const titulo = secEl.querySelector('h2')?.textContent || sectionId;
    const inputs = secEl.querySelectorAll('input, textarea, select');
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
  function persist() {
    const data = {
      trechos,
      fatosSelecionados,
      selecaoPorFato: {
        fundamentos: Object.fromEntries(Object.entries(selecaoPorFato.fundamentos).map(([k, v]) => [k, Array.from(v)])),
        pedidos: Object.fromEntries(Object.entries(selecaoPorFato.pedidos).map(([k, v]) => [k, Array.from(v)])),
      },
      tabelaHTML: $('#tabela-calculos tbody')?.innerHTML || '',
      valorCausa: $('#valorCausa')?.value || '',
      campos: {
        qualificacao: Object.fromEntries(Array.from($('#form-qualificacao')?.querySelectorAll('input,select,textarea') || []).map(i => [i.name || i.id, i.value])),
        contrato: Object.fromEntries(Array.from($('#form-contrato')?.querySelectorAll('input,select,textarea') || []).map(i => [i.name || i.id, i.value])),
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function restore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);

      // trechos
      Object.assign(trechos, data.trechos || {});
      // fatos
      (data.fatosSelecionados || []).forEach(addFatoUI);
      // seleções categorizadas
      selecaoPorFato.fundamentos = {};
      selecaoPorFato.pedidos = {};
      if (data.selecaoPorFato) {
        for (const [k, arr] of Object.entries(data.selecaoPorFato.fundamentos || {})) {
          selecaoPorFato.fundamentos[k] = new Set(arr);
        }
        for (const [k, arr] of Object.entries(data.selecaoPorFato.pedidos || {})) {
          selecaoPorFato.pedidos[k] = new Set(arr);
        }
      }
      rebuildFundamentosPedidos();
      syncFundamentosEditor();
      syncPedidosEditor();

      // tabela
      if (data.tabelaHTML && $('#tabela-calculos tbody')) {
        $('#tabela-calculos tbody').innerHTML = data.tabelaHTML;
        $('#tabela-calculos tbody').querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
      }
      // valor
      if (data.valorCausa && $('#valorCausa')) $('#valorCausa').value = data.valorCausa;

      // campos de forms
      for (const [id, obj] of Object.entries(data.campos || {})) {
        const form = document.getElementById(`form-${id}`);
        if (!form) continue;
        for (const [name, val] of Object.entries(obj)) {
          const el = form.querySelector(`[name="${name}"], #${name}`);
          if (el) el.value = val;
        }
      }

      // aplicar trechos restaurados nos editores
      ['qualificacao','preliminares','contrato','fatos','fundamentos','pedidos'].forEach(id => {
        const ed = sectionEditor(id);
        if (ed && trechos[id]) ed.innerHTML = trechos[id];
      });

      atualizarFinal();
      recalcTabela();
    } catch (e) {
      console.warn('Falha ao restaurar', e);
    }
  }

  // ===== Provas e inicialização =====
  buildProvas();
  carregarFFP();
  popularPreliminares();
  restore();
  recalcTabela();

  // ===== Ações globais =====
  // Reiniciar tudo
  $('#btn-reiniciar')?.addEventListener('click', () => {
    if (!confirm('Deseja realmente reiniciar todo o formulário? Esta ação apagará os dados salvos.')) return;
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(trechos).forEach(k => delete trechos[k]);
    fatosSelecionados.splice(0);
    selecaoPorFato.fundamentos = {};
    selecaoPorFato.pedidos = {};
    $('#form-qualificacao')?.reset();
    $('#form-contrato')?.reset();
    $('#fatos-list') && ($('#fatos-list').innerHTML = '');
    $('#fundamentos-box') && ($('#fundamentos-box').innerHTML = '');
    $('#pedidos-box') && ($('#pedidos-box').innerHTML = '');
    $('#preliminares-list') && ($('#preliminares-list').innerHTML = '');
    $$('#provas-box input[type="checkbox"]').forEach(chk => chk.checked = false);
    limparTabela();
    ['qualificacao','preliminares','contrato','fatos','fundamentos','pedidos','calculos','provas','valor'].forEach(id => {
      const ed = sectionEditor(id);
      if (ed) ed.innerHTML = '';
    });
    atualizarFinal();
    recalcTabela();
    alert('Formulário reiniciado.');
  });

  // Botão "Abrir no Google IA" a partir do Final
  $('#btn-google-ia')?.addEventListener('click', () => {
    const texto = $('#editor-final')?.textContent.trim() || '';
    if (!texto) {
      alert('O visualizador final está vazio.');
      return;
    }
    const contexto =
      `${ORIENTACAO_IA}\n\n` +
      `TAREFA: Gerar a peça completa a partir do rascunho a seguir.\n\n` +
      texto;
    const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
    window.open(url, '_blank');
  });

})();
