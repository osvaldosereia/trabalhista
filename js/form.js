/* form.js — gestão do formulário (pedidos, valores, provas, coleta e persistência) */
(function () {
  const { $, $$, uid, fmtBRL, toast, storage } = window.Clara;

  // ------------------ Pedidos ------------------
  function pedidoTpl(data = {}) {
    const id = uid('pedido');
    const t = data.titulo || '';
    const d = data.detalhe || '';
    const sp = Array.isArray(data.subpedidos) ? data.subpedidos : [];
    const wrap = document.createElement('div');
    wrap.className = 'card subtle pedido';
    wrap.dataset.pid = id;
    wrap.innerHTML = `
      <div class="grid">
        <label>Título do pedido
          <input class="pedido-titulo" value="${t}">
        </label>
        <label>Detalhe
          <input class="pedido-detalhe" value="${d}">
        </label>
      </div>
      <div class="stack">
        <div class="row between">
          <strong>Subpedidos</strong>
          <button type="button" class="mini ghost addSub">+ subpedido</button>
        </div>
        <div class="stack subWrap"></div>
      </div>
      <div class="row end">
        <button type="button" class="mini danger removePedido">remover</button>
      </div>`;
    const subWrap = wrap.querySelector('.subWrap');
    sp.forEach(s => addSubRow(subWrap, s));
    return wrap;
  }

  function addSubRow(container, val='') {
    const row = document.createElement('div');
    row.className = 'row gap';
    row.innerHTML = `
      <input class="subpedido" placeholder="Subpedido" value="${val}">
      <button type="button" class="mini ghost rmSub">x</button>`;
    container.appendChild(row);
  }

  function addPedido(titulo='') {
    const wrap = $('#pedidosWrap');
    const node = pedidoTpl({ titulo, detalhe:'', subpedidos:[] });
    wrap?.appendChild(node);
    paintChips();
  }

  function paintChips() {
    const chips = $('#pedidoChips');
    if (!chips) return;
    chips.innerHTML = '';
    $$('#pedidosWrap .pedido').forEach(p => {
      const title = p.querySelector('.pedido-titulo')?.value || '—';
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = title;
      chips.appendChild(chip);
    });
  }

  // Eventos de pedidos
  function bindPedidos() {
    $('#addPedido')?.addEventListener('click', () => addPedido('Novo pedido'));
    $('#pedidosWrap')?.addEventListener('click', (e) => {
      const el = e.target;
      if (el.classList.contains('addSub')) {
        addSubRow(el.closest('.pedido').querySelector('.subWrap'));
      }
      if (el.classList.contains('rmSub')) {
        el.closest('.row')?.remove();
      }
      if (el.classList.contains('removePedido')) {
        el.closest('.pedido')?.remove();
        paintChips(); buildValoresFromPedidos(); sumValores();
      }
    });
    $('#pedidosWrap')?.addEventListener('input', (e)=>{
      if (e.target.classList.contains('pedido-titulo')) paintChips();
    });
  }

  // ------------------ Valores ------------------
  function valorTpl(titulo='') {
    const row = document.createElement('div');
    row.className = 'valor-item';
    row.innerHTML = `
      <div class="grid">
        <label>Pedido
          <input type="text" class="valor-titulo" value="${titulo}">
        </label>
        <label>Valor estimado (R$)
          <input type="number" class="valor-num" min="0" step="0.01">
        </label>
      </div>`;
    return row;
  }

  function buildValoresFromPedidos() {
    const wrap = $('#valoresWrap'); if (!wrap) return;
    const titulos = $$('#pedidosWrap .pedido .pedido-titulo').map(i=> i.value.trim()).filter(Boolean);
    const existing = $$('#valoresWrap .valor-item .valor-titulo').map(i=> i.value.trim());
    // adiciona os que não existem
    titulos.forEach(t=>{
      if (!existing.includes(t)) wrap.appendChild(valorTpl(t));
    });
    // remove os que não têm mais pedido correspondente
    $$('#valoresWrap .valor-item').forEach(row=>{
      const t = row.querySelector('.valor-titulo')?.value.trim();
      if (t && !titulos.includes(t)) row.remove();
    });
    sumValores();
  }

  function sumValores() {
    const n = $$('#valoresWrap .valor-num').reduce((acc, i)=> acc + (parseFloat(i.value||0)||0), 0);
    const slot = $('#valorCausa'); if (slot) slot.textContent = fmtBRL(n);
    return n;
  }

  function bindValores() {
    $('#valoresWrap')?.addEventListener('input', (e)=>{
      if (e.target.classList.contains('valor-num')) sumValores();
      if (e.target.classList.contains('valor-titulo')) buildValoresFromPedidos();
    });
  }

  // ------------------ Provas ------------------
  function provaTpl(txt='') {
    const row = document.createElement('div');
    row.className = 'row gap';
    row.innerHTML = `
      <input class="prova" placeholder="Ex.: holerites, cartões de ponto, contrato" value="${txt}">
      <button type="button" class="mini ghost rmProva">x</button>`;
    return row;
  }
  function addProva(val='') { $('#provasWrap')?.appendChild(provaTpl(val)); }
  function bindProvas() {
    $('#addProva')?.addEventListener('click', ()=> addProva(''));
    $('#provasWrap')?.addEventListener('click', (e)=> {
      if (e.target.classList.contains('rmProva')) e.target.closest('.row')?.remove();
    });
  }

  // ------------------ Coleta ------------------
  function collect() {
    // Juízo
    const juizo = [
      ($('#juizoNum')?.value||'').trim(),
      ($('#cidade')?.value||'').trim(),
      ($('#uf')?.value||'').trim()
    ].filter(Boolean).join(' - ');

    // Reclamante
    const recl = {
      nome: $('#reclamante_nome')?.value||'',
      estado_civil: $('#reclamante_estado_civil')?.value||'',
      prof: $('#reclamante_prof')?.value||'',
      cpf: $('#reclamante_cpf')?.value||'',
      rg: $('#reclamante_rg')?.value||'',
      email: $('#reclamante_email')?.value||'',
      tel: $('#reclamante_tel')?.value||'',
      cep: $('#reclamante_cep')?.value||'',
      end: $('#reclamante_end')?.value||''
    };

    // Reclamadas
    const reclamadas = $$('#reclamadasWrap .reclamada').map(card => ({
      nome: card.querySelector('[name="reclamada_nome"]')?.value || '',
      doc: card.querySelector('[name="reclamada_doc"]')?.value || '',
      end: card.querySelector('[name="reclamada_end"]')?.value || '',
      email: card.querySelector('[name="reclamada_email"]')?.value || '',
      tel: card.querySelector('[name="reclamada_tel"]')?.value || '',
      cep: card.querySelector('[name="reclamada_cep"]')?.value || ''
    })).filter(r => r.nome);

    // Contrato
    const contrato = {
      adm: $('#adm')?.value||'',
      saida: $('#saida')?.value||'',
      funcao: $('#funcao')?.value||'',
      salario: $('#salario')?.value||'',
      jornada: $('#jornada')?.value||'',
      controlePonto: $('#controlePonto')?.value||'',
      desligamento: $('#desligamento')?.value||''
    };

    // Fatos, Fundamentos, Pedidos
    const fatos = $('#fatos')?.value||'';
    const fundamentos = $('#fundamentos')?.value||'';
    const pedidos = $$('#pedidosWrap .pedido').map(p => ({
      titulo: p.querySelector('.pedido-titulo')?.value || '',
      detalhe: p.querySelector('.pedido-detalhe')?.value || '',
      subpedidos: Array.from(p.querySelectorAll('.subpedido')).map(s => s.value).filter(Boolean)
    })).filter(p => p.titulo);

    // Provas
    const provas = $$('#provasWrap .prova').map(i=> i.value).filter(Boolean);

    // Valores
    const valores = $$('#valoresWrap .valor-item').map(row => ({
      titulo: row.querySelector('.valor-titulo')?.value || '',
      valor: parseFloat(row.querySelector('.valor-num')?.value || 0) || 0
    })).filter(v => v.titulo);

    const justicaGratuita = !!$('#justicaGratuita')?.checked;
    const honorarios = !!$('#honorarios')?.checked;
    const valorCausa = valores.reduce((a,b)=> a+b.valor, 0);

    return {
      juizo, reclamante: recl, reclamadas, contrato,
      fatos, fundamentos, pedidos, provas,
      valores, justicaGratuita, honorarios, valorCausa
    };
  }

  // ------------------ Persistência ------------------
  const DRAFT_KEY = 'draft_peticao';

  function saveDraft() {
    const data = collect();
    storage.set(DRAFT_KEY, data);
    toast('Rascunho salvo');
    return data;
  }

  function loadDraft() {
    const d = storage.get(DRAFT_KEY, null);
    if (!d) return toast('Nenhum rascunho encontrado', 'warn');
    loadDraftToForm(d);
    toast('Rascunho carregado');
  }

  function loadDraftToForm(d = storage.get(DRAFT_KEY, {})) {
    // Juízo
    if (d.juizo) {
      // tentativa simples de recompor partes (não crítico)
      const parts = d.juizo.split(' - ');
      $('#juizoNum') && ($('#juizoNum').value = parts[0] || '');
      $('#cidade') && ($('#cidade').value = parts[1] || '');
      $('#uf') && ($('#uf').value = parts[2] || '');
    }

    // Reclamante
    if (d.reclamante) {
      $('#reclamante_nome') && ($('#reclamante_nome').value = d.reclamante.nome || '');
      $('#reclamante_estado_civil') && ($('#reclamante_estado_civil').value = d.reclamante.estado_civil || '');
      $('#reclamante_prof') && ($('#reclamante_prof').value = d.reclamante.prof || '');
      $('#reclamante_cpf') && ($('#reclamante_cpf').value = d.reclamante.cpf || '');
      $('#reclamante_rg') && ($('#reclamante_rg').value = d.reclamante.rg || '');
      $('#reclamante_email') && ($('#reclamante_email').value = d.reclamante.email || '');
      $('#reclamante_tel') && ($('#reclamante_tel').value = d.reclamante.tel || '');
      $('#reclamante_cep') && ($('#reclamante_cep').value = d.reclamante.cep || '');
      $('#reclamante_end') && ($('#reclamante_end').value = d.reclamante.end || '');
    }

    // Reclamadas
    if (Array.isArray(d.reclamadas)) {
      $('#reclamadasWrap').innerHTML = '';
      d.reclamadas.forEach(r => {
        const card = document.createElement('div');
        card.className = 'card subtle reclamada';
        card.innerHTML = `
          <div class="grid">
            <label>Razão social / Nome <input name="reclamada_nome" value="${r.nome||''}"></label>
            <label>CNPJ/CPF <input name="reclamada_doc" value="${r.doc||''}"></label>
            <label>Endereço <input name="reclamada_end" value="${r.end||''}"></label>
            <label>E-mail <input name="reclamada_email" type="email" value="${r.email||''}"></label>
            <label>Telefone <input name="reclamada_tel" value="${r.tel||''}"></label>
            <label>CEP <input name="reclamada_cep" value="${r.cep||''}"></label>
          </div>
          <div class="row end"><button type="button" class="mini danger btnRemoveReclamada">remover</button></div>`;
        $('#reclamadasWrap')?.appendChild(card);
      });
    }

    // Contrato
    if (d.contrato) {
      $('#adm') && ($('#adm').value = d.contrato.adm || '');
      $('#saida') && ($('#saida').value = d.contrato.saida || '');
      $('#funcao') && ($('#funcao').value = d.contrato.funcao || '');
      $('#salario') && ($('#salario').value = d.contrato.salario || '');
      $('#jornada') && ($('#jornada').value = d.contrato.jornada || '');
      $('#controlePonto') && ($('#controlePonto').value = d.contrato.controlePonto || '');
      $('#desligamento') && ($('#desligamento').value = d.contrato.desligamento || '');
    }

    // Fatos & Fundamentos
    $('#fatos') && ($('#fatos').value = d.fatos || '');
    $('#fundamentos') && ($('#fundamentos').value = d.fundamentos || '');

    // Pedidos
    if (Array.isArray(d.pedidos)) {
      $('#pedidosWrap').innerHTML = '';
      d.pedidos.forEach(p => {
        const node = pedidoTpl(p);
        const subWrap = node.querySelector('.subWrap');
        (p.subpedidos||[]).forEach(sp => addSubRow(subWrap, sp));
        $('#pedidosWrap')?.appendChild(node);
      });
      paintChips();
    }

    // Provas
    if (Array.isArray(d.provas)) {
      $('#provasWrap').innerHTML = '';
      d.provas.forEach(p => addProva(p));
    }

    // Valores
    if (Array.isArray(d.valores)) {
      $('#valoresWrap').innerHTML = '';
      d.valores.forEach(v => {
        const row = valorTpl(v.titulo);
        row.querySelector('.valor-num').value = Number(v.valor||0).toFixed(2);
        $('#valoresWrap')?.appendChild(row);
      });
      sumValores();
    } else {
      buildValoresFromPedidos();
    }

    // flags
    $('#justicaGratuita') && ($('#justicaGratuita').checked = !!d.justicaGratuita);
    $('#honorarios') && ($('#honorarios').checked = !!d.honorarios);
  }

  // ------------------ Expose & Binds ------------------
  function bindReclamadas() {
    $('#addReclamada')?.addEventListener('click', ()=>{
      const card = document.createElement('div');
      card.className = 'card subtle reclamada';
      card.innerHTML = `
        <div class="grid">
          <label>Razão social / Nome <input name="reclamada_nome"></label>
          <label>CNPJ/CPF <input name="reclamada_doc"></label>
          <label>Endereço <input name="reclamada_end"></label>
          <label>E-mail <input name="reclamada_email" type="email"></label>
          <label>Telefone <input name="reclamada_tel"></label>
          <label>CEP <input name="reclamada_cep"></label>
        </div>
        <div class="row end"><button type="button" class="mini danger btnRemoveReclamada">remover</button></div>`;
      $('#reclamadasWrap')?.appendChild(card);
    });
    $('#reclamadasWrap')?.addEventListener('click', (e)=>{
      if (e.target.classList.contains('btnRemoveReclamada')) e.target.closest('.reclamada')?.remove();
    });
  }

  window.Clara = Object.assign(window.Clara || {}, {
    form: {
      addPedido, buildValoresFromPedidos, sumValores,
      saveDraft, loadDraft, loadDraftToForm, collect,
      addProva
    }
  });

  window.addEventListener('app:ready', () => {
    bindPedidos();
    bindValores();
    bindProvas();
    bindReclamadas();
  });
})();
