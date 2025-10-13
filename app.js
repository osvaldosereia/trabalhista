// app.js completo (v3 final)
import { FFP, PRELIMINARES } from './data/fatos-fundamentos-pedidos.js';
import { FFP_CAMPOS } from './data/ffp_campos.js';


(() => {
  'use strict';

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));
  const live = (sel) => document.getElementById('tabela-wrap')?.querySelector(sel);

  
   // ===== Estado =====
  
  const trechos = {};                 // HTML por seção
  const fatosSelecionados = [];       // lista de fatos adicionados
  // seleção categorizada por fato
  const selecaoPorFato = {
    fundamentos: {}, // { [fato]: Set<string> }
    pedidos: {}      // { [fato]: Set<string> }
  };
  const dadosPorFato = {};           // { [fato]: { campoId: valor } }


  const provasCatalogo = [
    'CTPS', 'Holerites', 'Contrato de Trabalho', 'Comunicações internas',
    'Escalas e cartões de ponto', 'CAT', 'ASO/PPP/LTCAT', 'Mensagens e e-mails',
    'Testemunhas', 'Extratos do FGTS', 'TRCT e guias', 'Laudos e atestados'
  ];
  const STORAGE_KEY = 'editorTrabalhista:v3';

  // ===== Orientação base para a IA =====
  const ORIENTACAO_IA =
    "Atue como ADVOGADO TRABALHISTA experiente. Redija em linguagem forense, clara, coesa e impessoal, " +
    "citando CLT, CF/88, CPC e súmulas/OJs do TST quando cabível. " +
    "Use APENAS as informações fornecidas (sem criar fatos). Estruture por tópicos com títulos, " +
    "alinhe pedidos e cálculos às regras trabalhistas e mantenha português do Brasil.";

  // ADICIONAR ABAIXO DE ORIENTACAO_IA
function getPromptIA() {
  const texto = $('#editor-final')?.textContent.trim() || '';
  const extras = formatDadosExtrasPorFato();
  return (
    `${ORIENTACAO_IA}\n\n` +
    `TAREFA: Redija a PETIÇÃO INICIAL TRABALHISTA completa, pronta para protocolo, a partir do conteúdo a seguir.\n\n` +
    `CONTEÚDO:\n${texto}\n\n` +
    `DADOS ADICIONAIS POR FATO:\n${extras || '[nenhum]'}`
  );
}

function formatDadosExtrasPorFato(){
  // Gera bloco de linhas por fato, a partir de dadosPorFato
  const linhas = [];
  fatosSelecionados.forEach(fato => {
    const obj = dadosPorFato[fato];
    if (!obj || !Object.keys(obj).length) return;
    linhas.push(`- ${fato}:`);
    Object.entries(obj).forEach(([k, v]) => {
      let val = v;
      if (Array.isArray(v)) val = v.join(', ');
      if (typeof v === 'boolean') val = v ? 'sim' : 'não';
      linhas.push(`  • ${k}: ${val}`);
    });
  });
  return linhas.join('\n');
}


function makeGoogleIAUrl(prompt) {
  return `https://www.google.com/search?q=${encodeURIComponent(prompt)}&udm=50`;
}

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

  // agrupar por categoria (fallback: 'Outros')
  const grupos = new Map();
  FFP.filter(x => x.fato).forEach(item => {
    const cat = (item.categoria || 'Outros').trim();
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat).push(item);
  });

  // criar optgroups em ordem alfabética
  Array.from(grupos.keys()).sort().forEach(cat => {
    const og = document.createElement('optgroup');
    og.label = cat;
    grupos.get(cat)
      .sort((a,b) => a.fato.localeCompare(b.fato, 'pt-BR'))
      .forEach(item => {
        const op = document.createElement('option');
        op.value = item.fato;
        op.textContent = item.fato;
        og.appendChild(op);
      });
    sel.appendChild(og);
  });
}


  // ===== Adicionar múltiplos Fatos =====
  function uiAddFato(nomeFato) {
    if (!nomeFato) return;
    if (fatosSelecionados.includes(nomeFato)) return;
    fatosSelecionados.push(nomeFato);

    const wrap = $('#fatos-list');
    if (!wrap) return;

    const box = document.createElement('div');
    box.className = 'fato-bloco';
    box.dataset.fato = nomeFato;
    box.innerHTML = `<span class="titulo">${nomeFato}</span><button class="remover" title="Remover fato">✖</button>`;
    wrap.appendChild(box);

   // contêiner dos campos dinâmicos
const campos = document.createElement('div');
campos.className = 'campos-fato';
campos.style.marginTop = '6px';
box.appendChild(campos);
renderCamposFato(nomeFato, campos);

box.querySelector('.remover').addEventListener('click', () => {
  const idx = fatosSelecionados.indexOf(nomeFato);
  if (idx >= 0) fatosSelecionados.splice(idx, 1);
  // limpar seleções relacionadas a este fato
  delete selecaoPorFato.fundamentos[nomeFato];
  delete selecaoPorFato.pedidos[nomeFato];
  delete dadosPorFato[nomeFato]; // limpa dados extras do fato
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

  $('#add-fato')?.addEventListener('click', () => {
    const val = $('#select-fato')?.value;
    uiAddFato(val);
  });

  // ===== Helpers seleção =====
  const getFundSelecionadosFlat = () =>
    Object.entries(selecaoPorFato.fundamentos)
      .flatMap(([_, set]) => Array.from(set || []));
  const getPedSelecionadosFlat = () =>
    Object.entries(selecaoPorFato.pedidos)
      .flatMap(([_, set]) => Array.from(set || []));

  // ===== Fundamentos & Pedidos — UI categorizada por Fato =====
  function rebuildFundamentosPedidos() {
    const fundBox = $('#fundamentos-box');
    const pedBox  = $('#pedidos-box');
    if (!fundBox || !pedBox) return;

    fundBox.innerHTML = '';
    pedBox.innerHTML  = '';

    fatosSelecionados.forEach(fato => {
      const row = FFP.find(x => x.fato === fato);
      if (!row) return;

      // garantir sets no estado
      if (!selecaoPorFato.fundamentos[fato]) selecaoPorFato.fundamentos[fato] = new Set();
      if (!selecaoPorFato.pedidos[fato])     selecaoPorFato.pedidos[fato]     = new Set();

      // FUNDAMENTOS
      const detF = document.createElement('details');
      detF.open = true;
      const sumF = document.createElement('summary');
      sumF.textContent = `Fato: ${fato}`;
      detF.appendChild(sumF);

      const ulF = document.createElement('ul');
      (row.fundamentos || []).forEach(txt => {
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

      // PEDIDOS
      const detP = document.createElement('details');
      detP.open = true;
      const sumP = document.createElement('summary');
      sumP.textContent = `Fato: ${fato}`;
      detP.appendChild(sumP);

      const ulP = document.createElement('ul');
      (row.pedidos || []).forEach(txt => {
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
    const bucket = tipo === 'fund' ? selecaoPorFato.fundamentos : selecaoPorFato.pedidos;
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

function renderCamposFato(nomeFato, mountEl){
  mountEl.innerHTML = ''; // limpa e recria
  const defs = FFP_CAMPOS?.[nomeFato];
  if (!Array.isArray(defs) || !defs.length) {
    mountEl.style.display = 'none';
    return;
  }
  mountEl.style.display = '';

  // estado inicial
  if (!dadosPorFato[nomeFato]) dadosPorFato[nomeFato] = {};

  const form = document.createElement('div');
  form.className = 'fato-campos-form';

  defs.forEach(def => {
    const wrap = document.createElement('label');
    wrap.style.display = 'block';
    wrap.style.margin = '4px 0';

    const lbl = document.createElement('span');
    lbl.textContent = def.label + (def.required ? ' *' : '');
    lbl.style.display = 'block';
    lbl.style.fontWeight = '600';

    let input;
    const nameAttr = `fato:${nomeFato}:${def.id}`;

    switch (def.type) {
      case 'textarea':
        input = document.createElement('textarea');
        input.rows = 3;
        break;
      case 'select':
        input = document.createElement('select');
        if (def.multiple) input.multiple = true;
        (def.options || []).forEach(opt => {
          const o = document.createElement('option');
          o.value = String(opt);
          o.textContent = String(opt);
          input.appendChild(o);
        });
        break;
      case 'checkbox':
        input = document.createElement('input');
        input.type = 'checkbox';
        break;
      case 'number':
        input = document.createElement('input');
        input.type = 'number';
        if (def.step) input.step = def.step;
        break;
      case 'date':
        input = document.createElement('input');
        input.type = 'date';
        break;
      case 'upload':
        input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        break;
      default:
        input = document.createElement('input');
        input.type = 'text';
    }

    input.name = nameAttr;
    input.id = nameAttr;

    // valor salvo
    const saved = dadosPorFato[nomeFato][def.id];
    if (def.type === 'checkbox') {
      input.checked = !!saved;
    } else if (def.type === 'select' && def.multiple && Array.isArray(saved)) {
      Array.from(input.options).forEach(opt => opt.selected = saved.includes(opt.value));
    } else if (saved != null) {
      input.value = String(saved);
    }

    // onChange -> grava no estado
    input.addEventListener('change', () => {
  let val;
  if (def.type === 'checkbox') {
    val = input.checked;
  } else if (def.type === 'select' && def.multiple) {
    val = Array.from(input.selectedOptions).map(o => o.value);
  } else if (def.type === 'upload') {
    val = Array.from(input.files || []).map(f => f.name);
  } else {
    val = input.value;
  }
  if (!dadosPorFato[nomeFato]) dadosPorFato[nomeFato] = {};
  dadosPorFato[nomeFato][def.id] = val;
  persist();
  syncFatosEditor();   // atualiza a aba Fatos
  atualizarFinal();    // reflete no visualizador final
});


    wrap.appendChild(lbl);
    wrap.appendChild(input);
    form.appendChild(wrap);
  });

  mountEl.appendChild(form);
}


  // ===== Mini editores por seção =====
  $$('.viewer').forEach(view => {
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-area';
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
   toolbar.innerHTML = `
  <button data-cmd="insertUnorderedList" title="Lista">• Lista</button>
  <button data-cmd="removeFormat" title="Limpar editor">🧹 Limpar</button>
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
      if (!cmd) return;
      if (cmd === 'removeFormat') {
        // limpar de forma previsível
        editor.innerHTML = '';
        trechos[sectionId] = '';
        if (sectionId === 'calculos') {
          limparTabela();
          recalcTabela();
        }
        atualizarFinal();
        persist();
      } else {
        document.execCommand(cmd, false, null);
      }
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
  function sectionEditor(id) {
    const sec = document.getElementById(id);
    return sec ? sec.querySelector('.editor-mini') : null;
  }

  function syncFatosEditor() {
  const editor = sectionEditor('fatos');
  if (!editor) return;

  const html = fatosSelecionados.map(f => {
    const extras = dadosPorFato[f] || {};
    const defs = FFP_CAMPOS?.[f] || [];
    const linhas = Object.entries(extras).map(([id,val]) => {
      const def = defs.find(d => d.id === id);
      const label = def?.label || id;
      let texto = Array.isArray(val) ? val.join(', ') : (typeof val === 'boolean' ? (val ? 'sim' : 'não') : String(val||''));
      return `<li><strong>${label}:</strong> ${texto}</li>`;
    }).join('');

    const blocoExtras = linhas ? `<ul class="extras-fato">${linhas}</ul>` : '';
    return `<div class="fato-item">
      <p><strong>${f}:</strong></p>
      ${blocoExtras || '<p class="sem-extras">[Sem dados adicionais]</p>'}
    </div>`;
  }).join('');

  editor.innerHTML = html || '<p>[Nenhum fato adicionado]</p>';
  trechos['fatos'] = editor.innerHTML; // vai para o visualizador final
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
    ensurePedidoOnTabela();
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

      const blocoId = `pre_${idx}_${Date.now()}`;
      const bloco = `<p data-pre-id="${blocoId}"><strong>${item.titulo}.</strong> ${item.modelo}</p>`;
      editor.insertAdjacentHTML('beforeend', bloco);
      trechos['preliminares'] = editor.innerHTML;
      atualizarFinal();
      persist();

      li.addEventListener('click', () => {
        const el = editor.querySelector(`[data-pre-id="${blocoId}"]`);
        if (el) {
          el.remove();
        } else {
          editor.insertAdjacentHTML('beforeend', bloco);
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
 const tbody = live('#tabela-calculos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
const tg = live('#total-geral'); if (tg) tg.textContent = '0,00';
  }

  function ensurePedidoOnTabela() {
const tbody = live('#tabela-calculos tbody');
    if (!tbody) return;

    // chaves esperadas com base nos pedidos selecionados
    const selectedKeys = new Set(
      getPedSelecionadosFlat().map(p => 'p_' + p.slice(0, 40))
    );

    // remover linhas de pedidos que não estão mais selecionados
    Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
      const k = tr.dataset.key || '';
      if (k.startsWith('p_') && !selectedKeys.has(k)) tr.remove();
    });

    // adicionar linhas que faltam
    const rowKeys = new Set(
      Array.from(tbody.querySelectorAll('tr')).map(r => r.dataset.key)
    );

    selectedKeys.forEach(key => {
      if (!rowKeys.has(key)) {
        const p = key.slice(2);
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

  $('#btn-add-linha')?.addEventListener('click', () => {
const tbody = live('#tabela-calculos tbody');
    if (!tbody) return;
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

  $('#btn-recalcular')?.addEventListener('click', () => recalcTabela());

  function recalcTabela() {
const tbody = live('#tabela-calculos tbody');
const num = (s) => parseFloat(String(s).replace(',', '.')) || 0;

    if (!tbody) return;
    let totalGeral = 0;
    tbody.querySelectorAll('tr').forEach(tr => {
      const base = num(tr.children[1].querySelector('input').value);
      const qtd  = num(tr.children[2].querySelector('input').value);
      const perc = num(tr.children[3].querySelector('input').value);
      const total = base * qtd * (1 + perc/100);
      tr.querySelector('.total').textContent = total.toFixed(2).replace('.', ',');
      totalGeral += total;
    });
    const tg = live('#total-geral'); if (tg) tg.textContent = totalGeral.toFixed(2).replace('.', ',');
    const vc = $('#valorCausa');
    if (vc && !vc.matches(':focus')) vc.value = totalGeral.toFixed(2);
{
  const wrap = document.getElementById('tabela-wrap');
  if (wrap) {
    const snap = wrap.cloneNode(true);
    snap.removeAttribute('id');
    snap.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    const tmp = document.createElement('div');
    tmp.appendChild(snap);
    trechos['calculos'] = tmp.innerHTML;
  } else {
    trechos['calculos'] = '';
  }
}
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
    if (!editorFinal) return;
    const ordem = ['qualificacao','preliminares','contrato','fatos','fundamentos','pedidos','calculos','provas','valor'];
    const partes = ordem
      .filter(id => trechos[id])
      .map(id => `<h3>${capitalize(id)}</h3>${trechos[id]}`)
      .join('<hr>');
    editorFinal.innerHTML = partes || '<p>Nenhum trecho adicionado ainda.</p>';
  }

  function capitalize(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ===== Ações finais =====
 
 $('#btn-copiar')?.addEventListener('click', async () => {
  const p = getPromptIA();
  try { await navigator.clipboard.writeText(p); } catch {}
  alert('Prompt copiado.');
});


  // Reiniciar tudo (global)
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

  // ===== Botão "Abrir no Google IA" (prompt base) =====
  $('#btn-google-ia')?.addEventListener('click', () => {
  const contexto = getPromptIA(); // usa o mesmo prompt do "Copiar"
  const url = `https://www.google.com/search?q=${encodeURIComponent(contexto)}&udm=50`;
  window.open(url, '_blank'); // mantém Google modo IA
});
// ===== Orientar I.A. – menu e inserção no editor final =====
(() => {
  const btn = document.getElementById('btn-orientar-ia');
  const menu = document.getElementById('ia-menu');
  const editorFinal = document.getElementById('editor-final');
  if (!btn || !menu || !editorFinal) return;

  // posiciona o menu dentro da viewport
function placeMenu() {
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // mede botão
  const br = btn.getBoundingClientRect();

  // mostra para medir o menu
  menu.style.visibility = 'hidden';
  menu.removeAttribute('hidden');
  const mr = menu.getBoundingClientRect();
  const mw = mr.width;
  const mh = mr.height;

  // tenta abaixo; se não couber, usa acima; se ainda não couber, centraliza vertical
  let topBelow = br.bottom + pad;
  let topAbove = br.top - mh - pad;

  let top;
  if (topBelow + mh <= vh) top = topBelow;
  else if (topAbove >= 0)  top = topAbove;
  else top = Math.max(pad, Math.min((vh - mh) / 2, vh - mh - pad));

  // clamp horizontal
  let left = Math.max(pad, Math.min(br.left, vw - mw - pad));

  menu.style.position = 'fixed';
  menu.style.left = left + 'px';
  menu.style.top  = top  + 'px';
  menu.style.visibility = 'visible';
}

// abre/fecha ao clicar no botão
btn.addEventListener('click', () => {
  if (menu.hasAttribute('hidden')) {
    placeMenu();
  } else {
    menu.setAttribute('hidden', '');
  }
});

// fecha ao clicar fora
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target) && e.target !== btn) {
    menu.setAttribute('hidden', '');
  }
});

// se a janela rolar/redimensionar com o menu aberto, reposiciona
['scroll','resize'].forEach(evt => {
  window.addEventListener(evt, () => {
    if (!menu.hasAttribute('hidden')) placeMenu();
  }, { passive: true });
});


  // inserir no cursor ou ao fim
  function insertAtCursor(html) {
    editorFinal.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('span');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node, lastNode;
      while ((node = el.firstChild)) lastNode = frag.appendChild(node);
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      editorFinal.insertAdjacentHTML('beforeend', html);
    }
  }

  const MAP = {
    'Incluir Jurisprudência':        'Inclua jurisprudência pertinente e referencie tribunal, número do processo e ementa.',
    'Editar em Parágrafo isolado':   'Edite este trecho como parágrafo isolado, sem mesclar com adjacentes.',
    'Editar como Citação':           'Formate como citação curta, com aspas e fonte.',
    'Recuo de Citação Longa':        'Aplique recuo e corpo menor para citação longa, com referência completa.',
    'Recuo amplo à Direita':         'Aplique recuo amplo, formatada com um recuo grande da margem esquerda, posicionando-a à direita da página.',
    'Alinhamento Justificado':       'Aplique alinhamento justificado ao parágrafo.',
    'Alinhamento à Direita':         'Alinhe o parágrafo à direita.',
    'Caixa Alta':                    'Converta este trecho para CAIXA ALTA.',
    'Versalete (Small Caps)':        'Aplique versalete (small caps) a título ou nome próprio.',
    'Negrito':                       'Aplique negrito ao trecho selecionado.',
    'Itálico':                       'Aplique itálico ao trecho selecionado.',
    'Sublinhado':                    'Aplique sublinhado ao trecho selecionado.'
  };

  // clique nos itens do menu
  menu.addEventListener('click', (e) => {
    const btnItem = e.target.closest('button[data-insert]');
    if (!btnItem) return;
    const label = btnItem.dataset.insert;
    const instr = MAP[label] || label;
    insertAtCursor(` [ORIENTAÇÃO-IA: ${instr}] `);
    menu.setAttribute('hidden', '');
  });
})();



  // ===== Botões "Gerar com IA" gerais =====
  $$('.tab-content .btn-ia').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.tab-content')?.id;
      if (!sec) return;
      const ed = sectionEditor(sec);
      openGoogleIAForSection(sec, ed || { innerText: '' });
    });
  });

  // ===== Botões "Salvar Trecho" gerais =====
  $$('.tab-content .btn-save').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = btn.closest('.tab-content')?.id;
    if (!sec) return;

    if (sec === 'qualificacao') gerarQualificacao();
    if (sec === 'contrato') gerarContrato();
    if (sec === 'fatos') syncFatosEditor(); // garante que extras entram

    const ed = sectionEditor(sec);
    if (!ed) return;
    trechos[sec] = ed.innerHTML;
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
        limparTabela();
      }
      if (sec === 'calculos') {
        limparTabela();
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
  function collectProvasSelecionadas() {
    const box = $('#provas-box');
    if (!box) return [];
    return Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
  }

  function serializeSelecaoPorFato(mapSets) {
    return {
      fundamentos: Object.fromEntries(Object.entries(mapSets.fundamentos).map(([k, v]) => [k, Array.from(v || [])])),
      pedidos:     Object.fromEntries(Object.entries(mapSets.pedidos).map(([k, v]) => [k, Array.from(v || [])]))
    };
  }
  function deserializeSelecaoPorFato(obj) {
    selecaoPorFato.fundamentos = {};
    selecaoPorFato.pedidos = {};
    Object.entries(obj?.fundamentos || {}).forEach(([k, arr]) => selecaoPorFato.fundamentos[k] = new Set(arr || []));
    Object.entries(obj?.pedidos || {}).forEach(([k, arr]) => selecaoPorFato.pedidos[k] = new Set(arr || []));
  }

 function persist() {
  const payload = {
    trechos,
    fatosSelecionados,
    selecaoPorFato: serializeSelecaoPorFato(selecaoPorFato),
    dadosPorFato, // inclui os dados extras
    tabela: $('#tabela-wrap')?.innerHTML || '',
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

// restaura dados extras ANTES de recriar os fatos
Object.assign(dadosPorFato, data.dadosPorFato || {});

// fatos
(data.fatosSelecionados || []).forEach(uiAddFato);


      // seleção categorizada
      if (data.selecaoPorFato) {
        deserializeSelecaoPorFato(data.selecaoPorFato);
      }

      // reconstruir UI categorizada e pintar ativos
      rebuildFundamentosPedidos();

      // sincronizar editores dependentes e tabela
      syncFundamentosEditor();
      syncPedidosEditor();
      ensurePedidoOnTabela();

      // trechos HTML
      Object.assign(trechos, data.trechos || {});
      // repintar editores já salvos
      ['qualificacao','preliminares','contrato','fatos','fundamentos','pedidos','calculos','provas','valor'].forEach(id => {
        if (trechos[id]) {
          const ed = sectionEditor(id);
          if (ed) ed.innerHTML = trechos[id];
        }
      });

      // recarregar tabela e valor
      if (data.tabela && $('#tabela-wrap')) $('#tabela-wrap').innerHTML = data.tabela;
      if ($('#valorCausa')) $('#valorCausa').value = data.valorCausa || '';

      // religar eventos da tabela
 live('#tabela-calculos tbody')?.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));

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

  // ===== Provas e inicialização =====
  buildProvas();
  carregarFFP();
  popularPreliminares();
  restore();
  recalcTabela();

  // Dica CSS:
  // #fundamentos-box li.ativo, #pedidos-box li.ativo { background:#eef; }
})();
