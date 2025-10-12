// app.js — Editor de Peças Trabalhistas (build v4.2)
// Compatível com index.html enviado e FFP plano {fato, fundamentos[], pedidos[]}
import { FFP, PRELIMINARES } from './fatos-fundamentos-pedidos.js';

(() => {
  'use strict';

  // ========== utils ==========
  const $  = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));
  const money = (n) => (Number(n||0)).toFixed(2).replace('.', ',');
  const unmoney = (s) => parseFloat(String(s||'0').replace(',', '.')) || 0;

  // ========== estado ==========
  const STORAGE = 'editorTrabalhista:v4.2';
  const trechos = {
    qualificacao:'', preliminares:'', contrato:'', fatos:'',
    fundamentos:'', pedidos:'', calculos:'', provas:'', valor:''
  };
  const fatosSelecionados = [];
  const selecao = { fundamentos:{}, pedidos:{} }; // { [fato]: Set<string> }

  // ========== abas ==========
  const tabs = $$('.tabs button');
  const sections = $$('.tab-content');
  tabs.forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.tab;
    tabs.forEach(x => x.classList.toggle('active', x===b));
    sections.forEach(s => s.classList.toggle('active', s.id===id));
  }));

  // ========== QUALIFICAÇÃO ==========
  function gerarQualificacao() {
    const f = $('#form-qualificacao'); if (!f) return '';
    const get = (n) => f.querySelector(`[name="${n}"]`)?.value?.trim() || '';

    const rc = {
      nome:get('reclamante_nome'), cpf:get('reclamante_cpf'), rg:get('reclamante_rg'),
      ctps:get('reclamante_ctps'), serie:get('reclamante_ctps_serie'),
      prof:get('reclamante_profissao'), end:get('reclamante_endereco'),
      bairro:get('reclamante_bairro'), cidade:get('reclamante_cidade'),
      uf:get('reclamante_uf'), cep:get('reclamante_cep'),
      fone:get('reclamante_fone'), email:get('reclamante_email')
    };
    const rd = {
      nome:get('reclamada_nome'), cnpj:get('reclamada_cnpj'), end:get('reclamada_endereco'),
      bairro:get('reclamada_bairro'), cidade:get('reclamada_cidade'),
      uf:get('reclamada_uf'), cep:get('reclamada_cep'),
      fone:get('reclamada_fone'), email:get('reclamada_email')
    };

    const html = `
      <p><strong>Reclamante:</strong> ${rc.nome||'[NOME]'}, ${rc.prof||'[PROFISSÃO]'}, CPF ${rc.cpf||'[CPF]'}${rc.rg?`, RG ${rc.rg}`:''}${rc.ctps?`, CTPS ${rc.ctps}${rc.serie?`/Série ${rc.serie}`:''}`:''}, residente em ${rc.end||'[ENDEREÇO]'}${rc.bairro?`, ${rc.bairro}`:''}${rc.cidade?`, ${rc.cidade}`:''}${rc.uf?`/${rc.uf}`:''}${rc.cep?`, CEP ${rc.cep}`:''}${rc.fone?`, Tel.: ${rc.fone}`:''}${rc.email?`, E-mail: ${rc.email}`:''}.</p>
      <p><strong>Reclamada:</strong> ${rd.nome||'[RAZÃO SOCIAL]'}, CNPJ ${rd.cnpj||'[CNPJ]'}, endereço ${rd.end||'[ENDEREÇO]'}${rd.bairro?`, ${rd.bairro}`:''}${rd.cidade?`, ${rd.cidade}`:''}${rd.uf?`/${rd.uf}`:''}${rd.cep?`, CEP ${rd.cep}`:''}${rd.fone?`, Tel.: ${rd.fone}`:''}${rd.email?`, E-mail: ${rd.email}`:''}.</p>
    `.trim();

    $('#qualificacao .viewer').innerHTML = html;
    trechos.qualificacao = html; atualizarFinal(); persist();
    return html;
  }
  $('#qualificacao .btn-save')?.addEventListener('click', gerarQualificacao);

  // ========== PRELIMINARES ==========
  function montarPreliminaresUI() {
    const sel = $('#preliminares-select'); if (!sel) return;
    sel.innerHTML = `<option value="">Selecione…</option>`;
    PRELIMINARES.forEach((p, i) => {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = p.titulo; sel.appendChild(o);
    });
    $('#add-preliminar')?.addEventListener('click', () => {
      const idx = Number(sel.value); if (Number.isNaN(idx)) return;
      const p = PRELIMINARES[idx]; if (!p) return;
      const bloco = `<h4>${p.titulo}</h4><p>${p.modelo}</p>`;
      const box = $('#preliminares .viewer');
      if (!box.innerHTML.includes(`<h4>${p.titulo}</h4>`)) {
        box.insertAdjacentHTML('beforeend', bloco);
        trechos.preliminares = box.innerHTML; atualizarFinal(); persist();
      }
      sel.value = '';
    });
    $('#preliminares .btn-save')?.addEventListener('click', () => {
      trechos.preliminares = $('#preliminares .viewer').innerHTML;
      atualizarFinal(); persist();
    });
  }

  // ========== CONTRATO ==========
  function gerarContrato() {
    const f = $('#form-contrato'); if (!f) return '';
    const get = (n) => f.querySelector(`[name="${n}"]`)?.value?.trim() || '';
    const adm = get('admissao'), sai = get('saida'), funcao=get('funcao'),
          salario=get('salario'), tipo=get('tipo_contrato'), jornada=get('jornada'),
          local=get('local_trabalho');
    const html = `
      <p>Admissão em <strong>${adm||'[DATA]'}</strong>, função <strong>${funcao||'[FUNÇÃO]'}</strong>,
      salário <strong>R$ ${salario||'[SALÁRIO]'}</strong>, regime <strong>${tipo||'[TIPO]'}</strong>,
      jornada <strong>${jornada||'[JORNADA]'}</strong>${local?`, local de trabalho <strong>${local}</strong>`:''}${sai?`, rescisão em <strong>${sai}</strong>`:''}.</p>
    `.trim();
    $('#contrato .viewer').innerHTML = html;
    trechos.contrato = html; atualizarFinal(); persist();
    return html;
  }
  $('#contrato .btn-save')?.addEventListener('click', gerarContrato);

  // ========== FFP (fatos/fundamentos/pedidos) ==========
  function carregarFFP() {
    const sel = $('#select-fato'); if (!sel) return;
    sel.innerHTML = `<option value="">Selecione um fato</option>`;
    FFP.forEach((f, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = f.fato || f.nome || `Fato ${i+1}`;
      sel.appendChild(o);
    });
    $('#btn-add-fato')?.addEventListener('click', () => {
      const idx = Number(sel.value); if (Number.isNaN(idx)) return;
      const f = FFP[idx]; if (!f) return;
      const nome = f.fato || f.nome;
      if (!fatosSelecionados.includes(nome)) fatosSelecionados.push(nome);
      renderFatosLista(); rebuildFundamentosPedidos(); syncFatosEditor();
      ensureTabelaPedidos(); recalcTabela(); atualizarFinal(); persist();
      sel.value = '';
    });
  }
  function renderFatosLista() {
    const wrap = $('#fatos-list'); if (!wrap) return;
    wrap.innerHTML = '';
    fatosSelecionados.forEach(nome => {
      const div = document.createElement('div');
      div.className = 'fato-bloco';
      div.innerHTML = `<span class="titulo">${nome}</span><button class="remover" title="Remover">✖</button>`;
      div.querySelector('.remover').addEventListener('click', () => {
        const i = fatosSelecionados.indexOf(nome); if (i>=0) fatosSelecionados.splice(i,1);
        delete selecao.fundamentos[nome]; delete selecao.pedidos[nome];
        renderFatosLista(); rebuildFundamentosPedidos(); syncFatosEditor();
        ensureTabelaPedidos(); recalcTabela(); atualizarFinal(); persist();
      });
      wrap.appendChild(div);
    });
  }
  function acharFatoPorNome(nome) {
    return FFP.find(x => (x.fato||x.nome) === nome) || null;
  }
  function rebuildFundamentosPedidos() {
    const fundBox = $('#fundamentos-box'), pedBox = $('#pedidos-box');
    if (!fundBox || !pedBox) return;
    fundBox.innerHTML = ''; pedBox.innerHTML = '';

    fatosSelecionados.forEach(nome => {
      const f = acharFatoPorNome(nome); if (!f) return;
      if (!selecao.fundamentos[nome]) selecao.fundamentos[nome] = new Set();
      if (!selecao.pedidos[nome])     selecao.pedidos[nome]     = new Set();

      // Fundamentos
      const detF = document.createElement('details'); detF.open = true;
      detF.innerHTML = `<summary><strong>${nome}</strong></summary>`;
      const ulF = document.createElement('ul');
      (f.fundamentos||[]).forEach(txt => {
        const li = document.createElement('li'); li.textContent = txt;
        if (selecao.fundamentos[nome].has(txt)) li.classList.add('ativo');
        li.addEventListener('click', () => {
          const S = selecao.fundamentos[nome];
          if (S.has(txt)) { S.delete(txt); li.classList.remove('ativo'); }
          else { S.add(txt); li.classList.add('ativo'); }
          syncFundamentosEditor(); atualizarFinal(); persist();
        });
        ulF.appendChild(li);
      });
      detF.appendChild(ulF); fundBox.appendChild(detF);

      // Pedidos
      const detP = document.createElement('details'); detP.open = true;
      detP.innerHTML = `<summary><strong>${nome}</strong></summary>`;
      const ulP = document.createElement('ul');
      (f.pedidos||[]).forEach(txt => {
        const li = document.createElement('li'); li.textContent = txt;
        if (selecao.pedidos[nome].has(txt)) li.classList.add('ativo');
        li.addEventListener('click', () => {
          const S = selecao.pedidos[nome];
          if (S.has(txt)) { S.delete(txt); li.classList.remove('ativo'); }
          else { S.add(txt); li.classList.add('ativo'); }
          syncPedidosEditor(); ensureTabelaPedidos(); recalcTabela();
          atualizarFinal(); persist();
        });
        ulP.appendChild(li);
      });
      detP.appendChild(ulP); pedBox.appendChild(detP);
    });

    // salvar
    $('#fundamentos .btn-save')?.addEventListener('click', () => {
      syncFundamentosEditor(); atualizarFinal(); persist();
    });
    $('#pedidos .btn-save')?.addEventListener('click', () => {
      syncPedidosEditor(); ensureTabelaPedidos(); recalcTabela(); atualizarFinal(); persist();
    });
  }
  function syncFatosEditor() {
    const html = fatosSelecionados.map(f => `<p><strong>${f}:</strong> [Descrever fatos com base nos documentos]</p>`).join('');
    $('#fatos .viewer').innerHTML = html; trechos.fatos = html;
  }
  function syncFundamentosEditor() {
    const html = fatosSelecionados.map(f => {
      const itens = Array.from(selecao.fundamentos[f]||[]);
      if (!itens.length) return '';
      return `<h4>${f}</h4><ul>${itens.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    }).filter(Boolean).join('');
    $('#fundamentos .viewer').innerHTML = html || '<p>[Selecione fundamentos]</p>';
    trechos.fundamentos = $('#fundamentos .viewer').innerHTML;
  }
  function syncPedidosEditor() {
    const html = fatosSelecionados.map(f => {
      const itens = Array.from(selecao.pedidos[f]||[]);
      if (!itens.length) return '';
      return `<h4>${f}</h4><ol>${itens.map(x=>`<li>${x}</li>`).join('')}</ol>`;
    }).filter(Boolean).join('');
    $('#pedidos .viewer').innerHTML = html || '<p>[Selecione pedidos]</p>';
    trechos.pedidos = $('#pedidos .viewer').innerHTML;
  }

  // ========== CÁLCULOS ==========
  function ensureTabelaPedidos() {
    const tbody = $('#tabela-calculos tbody'); if (!tbody) return;
    const existentes = new Set(Array.from(tbody.querySelectorAll('tr')).map(tr=>tr.dataset.item));
    const marcados = [];
    fatosSelecionados.forEach(f => Array.from(selecao.pedidos[f]||[]).forEach(p => marcados.push(p)));

    // incluir
    marcados.forEach(nome => {
      if (existentes.has(nome)) return;
      const tr = document.createElement('tr'); tr.dataset.item = nome;
      tr.innerHTML = `
        <td>${nome}</td>
        <td><input type="number" step="0.01" value="0"></td>
        <td><input type="number" step="0.01" value="1"></td>
        <td><input type="number" step="0.01" value="0"></td>
        <td class="total">0,00</td>`;
      tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
      tbody.appendChild(tr);
    });
    // remover não marcados
    tbody.querySelectorAll('tr').forEach(tr => {
      const nome = tr.dataset.item;
      if (nome !== 'Item manual' && !marcados.includes(nome)) tr.remove();
    });
  }
  function limparTabela() {
    const tbody = $('#tabela-calculos tbody'); if (!tbody) return;
    tbody.innerHTML = '';
    const tr = document.createElement('tr'); tr.dataset.item='Item manual';
    tr.innerHTML = `
      <td>Item manual</td>
      <td><input type="number" step="0.01" value="0"></td>
      <td><input type="number" step="0.01" value="1"></td>
      <td><input type="number" step="0.01" value="0"></td>
      <td class="total">0,00</td>`;
    tbody.appendChild(tr);
    tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
  }
  $('#btn-add-linha')?.addEventListener('click', () => {
    const tbody = $('#tabela-calculos tbody'); if (!tbody) return;
    const tr = document.createElement('tr'); tr.dataset.item='Item manual';
    tr.innerHTML = `
      <td>Item manual</td>
      <td><input type="number" step="0.01" value="0"></td>
      <td><input type="number" step="0.01" value="1"></td>
      <td><input type="number" step="0.01" value="0"></td>
      <td class="total">0,00</td>`;
    tbody.appendChild(tr);
    tr.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTabela));
    recalcTabela();
  });
  $('#btn-recalcular')?.addEventListener('click', recalcTabela);

  function recalcTabela() {
    const tbody = $('#tabela-calculos tbody'); if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('tr').forEach(tr => {
      const base = unmoney(tr.children[1].querySelector('input').value);
      const qtd  = unmoney(tr.children[2].querySelector('input').value);
      const perc = unmoney(tr.children[3].querySelector('input').value);
      const t = base * qtd * (1 + perc/100);
      tr.querySelector('.total').textContent = money(t);
      total += t;
    });
    $('#total-geral').textContent = money(total);
    const vc = $('#valorCausa'); if (vc && !vc.matches(':focus')) vc.value = total.toFixed(2);
    trechos.calculos = $('#tabela-wrap').outerHTML;
    trechos.valor = `<p><strong>Valor da Causa: R$ ${money(total)}</strong></p>`;
    atualizarFinal(); persist();
  }

  // Valor manual
  $('#valorCausa')?.addEventListener('input', e => {
    const v = unmoney(e.target.value);
    trechos.valor = `<p><strong>Valor da Causa: R$ ${money(v)}</strong></p>`;
    atualizarFinal(); persist();
  });
  $('#calculos .btn-save')?.addEventListener('click', () => { recalcTabela(); });
  $('#valor .btn-save')?.addEventListener('click', () => {
    const v = unmoney($('#valorCausa')?.value);
    trechos.valor = `<p><strong>Valor da Causa: R$ ${money(v)}</strong></p>`;
    atualizarFinal(); persist();
  });

  // ========== PROVAS ==========
  const PROVAS = [
    'CTPS','Holerites','Contrato de Trabalho','Escalas/Cartões de ponto','Mensagens e e-mails',
    'Extratos do FGTS','TRCT e guias','ASO/PPP/LTCAT','CAT','Testemunhas','Laudos/Atestados'
  ];
  function montarProvas() {
    const box = $('#provas-box'); if (!box) return;
    box.innerHTML = '';
    PROVAS.forEach(nome => {
      const id='pv_'+nome.replace(/\W+/g,'_');
      const lbl = document.createElement('label');
      lbl.innerHTML = `<input type="checkbox" id="${id}" value="${nome}"> ${nome}`;
      box.appendChild(lbl);
    });
    $('#provas .btn-save')?.addEventListener('click', () => {
      const marcadas = Array.from(box.querySelectorAll('input:checked')).map(i=>i.value);
      const html = marcadas.length
        ? `<ul>${marcadas.map(x=>`<li>${x}</li>`).join('')}</ul>` : '<p>[Sem provas selecionadas]</p>';
      $('#provas .viewer').innerHTML = html; trechos.provas = html;
      atualizarFinal(); persist();
    });
  }

  // ========== FINAL ==========
  function atualizarFinal() {
    const final = $('#editor-final'); if (!final) return;
    const parts = [
      trechos.qualificacao,
      trechos.preliminares,
      trechos.contrato,
      trechos.fatos,
      trechos.fundamentos,
      '<h3>Pedidos</h3>', trechos.pedidos,
      '<h3>Calculos</h3>', trechos.calculos,
      '<h3>Valor</h3>', trechos.valor,
      '<h3>Provas</h3>', trechos.provas
    ].filter(Boolean);
    final.innerHTML = parts.join('\n<hr>\n');
  }

  // Ações finais
  $('#btn-gerar-final')?.addEventListener('click', () => {
    // força sincronizações críticas
    gerarQualificacao(); gerarContrato(); syncFundamentosEditor(); syncPedidosEditor();
    ensureTabelaPedidos(); recalcTabela(); atualizarFinal(); persist();
    alert('Final atualizado.');
  });

  $('#btn-copiar')?.addEventListener('click', async () => {
    const txt = $('#editor-final')?.innerText || '';
    if (!txt) { alert('Nada para copiar.'); return; }
    await navigator.clipboard.writeText(txt);
    alert('Copiado.');
  });

  $('#btn-baixar')?.addEventListener('click', () => {
    const blob = new Blob([$('#editor-final')?.innerText || ''], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'peticao_trabalhista.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#btn-pdf')?.addEventListener('click', () => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) { alert('jsPDF não carregado.'); return; }
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    const text = ($('#editor-final')?.innerText || '').split('\n');
    const left = 40, top = 40, line = 14, max = 780;
    let y = top;
    text.forEach(t => {
      const lines = doc.splitTextToSize(t, 515);
      lines.forEach(l => {
        if (y > max) { doc.addPage(); y = top; }
        doc.text(l, left, y); y += line;
      });
    });
    doc.save('peticao_trabalhista.pdf');
  });

  // Abrir no Google IA (usa todo o final)
  $('#btn-google-ia')?.addEventListener('click', () => {
    const base = $('#editor-final')?.textContent?.trim() || '';
    if (!base) { alert('Final vazio.'); return; }
    const orient =
      'Atue como ADVOGADO TRABALHISTA experiente. Redija a peça completa com base no rascunho.';
    const url = `https://www.google.com/search?q=${encodeURIComponent(orient+'\n\n'+base)}&udm=50`;
    window.open(url,'_blank');
  });

  // ========== persistência ==========
  function persist() {
    const data = {
      trechos,
      fatosSelecionados,
      selecao: {
        fundamentos: Object.fromEntries(Object.entries(selecao.fundamentos).map(([k,v])=>[k,[...v]])),
        pedidos: Object.fromEntries(Object.entries(selecao.pedidos).map(([k,v])=>[k,[...v]]))
      },
      tabela: $('#tabela-calculos tbody')?.innerHTML || '',
      valor: $('#valorCausa')?.value || '',
      forms: {
        qualificacao: Object.fromEntries(Array.from($('#form-qualificacao')?.querySelectorAll('input,select,textarea')||[]).map(i=>[i.name, i.value])),
        contrato: Object.fromEntries(Array.from($('#form-contrato')?.querySelectorAll('input,select,textarea')||[]).map(i=>[i.name, i.value]))
      }
    };
    localStorage.setItem(STORAGE, JSON.stringify(data));
  }
  function restore() {
    const raw = localStorage.getItem(STORAGE); if (!raw) return;
    try{
      const d = JSON.parse(raw);
      Object.assign(trechos, d.trechos||{});
      (d.fatosSelecionados||[]).forEach(n => { if (!fatosSelecionados.includes(n)) fatosSelecionados.push(n); });
      // seleções
      selecao.fundamentos = {}; selecao.pedidos = {};
      Object.entries(d.selecao?.fundamentos||{}).forEach(([k,arr])=>selecao.fundamentos[k]=new Set(arr));
      Object.entries(d.selecao?.pedidos||{}).forEach(([k,arr])=>selecao.pedidos[k]=new Set(arr));
      renderFatosLista(); rebuildFundamentosPedidos();
      // tabela/valor
      if (d.tabela) $('#tabela-calculos tbody').innerHTML = d.tabela;
      $('#tabela-calculos tbody').querySelectorAll('input').forEach(i=>i.addEventListener('input', recalcTabela));
      if (d.valor) $('#valorCausa').value = d.valor;
      // forms
      for (const [formId, kv] of Object.entries(d.forms||{})) {
        const form = document.getElementById(`form-${formId}`);
        if (form) for (const [name,val] of Object.entries(kv)) {
          const el = form.querySelector(`[name="${name}"]`); if (el) el.value = val;
        }
      }
      // viewers
      $('#qualificacao .viewer').innerHTML = trechos.qualificacao||'';
      $('#preliminares .viewer').innerHTML = trechos.preliminares||'';
      $('#contrato .viewer').innerHTML = trechos.contrato||'';
      syncFatosEditor(); syncFundamentosEditor(); syncPedidosEditor();
      $('#provas .viewer').innerHTML = trechos.provas||'';
      atualizarFinal(); recalcTabela();
    }catch(e){ console.warn('restore falhou', e); }
  }

  // ========== ações globais ==========
  $('#btn-reiniciar')?.addEventListener('click', () => {
    if (!confirm('Reiniciar e apagar dados salvos?')) return;
    localStorage.removeItem(STORAGE);
    Object.keys(trechos).forEach(k=>trechos[k]='');
    fatosSelecionados.splice(0); selecao.fundamentos={}; selecao.pedidos={};
    $('#fatos-list').innerHTML=''; $('#fundamentos-box').innerHTML=''; $('#pedidos-box').innerHTML='';
    $('#qualificacao .viewer').innerHTML=''; $('#preliminares .viewer').innerHTML='';
    $('#contrato .viewer').innerHTML=''; $('#provas .viewer').innerHTML='';
    $('#form-qualificacao')?.reset(); $('#form-contrato')?.reset();
    limparTabela(); $('#valorCausa').value=''; atualizarFinal(); recalcTabela();
  });

  // ========== init ==========
  montarPreliminaresUI();
  montarProvas();
  carregarFFP();
  limparTabela();
  restore(); // chama recalc também
})();
