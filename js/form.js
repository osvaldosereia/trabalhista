/* form.js — gestão do formulário (criação de pedidos, valores, provas, draft)
   expõe window.Clara.form com:
   - addPedido(titulo)
   - buildValoresFromPedidos()
   - sumValores()
   - collect(), loadDraft(), saveDraft(), loadDraftToForm()
*/
(function () {
  const { $, $$, toast } = window.Clara;

  // -------------------- Utils --------------------
  const money = (n)=>`R$ ${Number(n||0).toFixed(2).replace('.',',')}`;
  const parseMoney = (v)=> Number(String(v).replace(/[^\d.,]/g,'').replace('.','').replace(',','.')) || 0;

  // -------------------- Pedidos --------------------
  function addPedido(titulo='(sem título)') {
    const wrap = $('#pedidosWrap'); if (!wrap) return;

    const el = document.createElement('div');
    el.className = 'card pedido';
    el.innerHTML = `
      <div class="grid">
        <label>Título do pedido
          <input type="text" class="pedido-titulo" value="${titulo}">
        </label>
        <label>Detalhe (opcional)
          <input type="text" class="pedido-det">
        </label>
      </div>
      <label>Subpedidos (um por linha)
        <textarea class="pedido-sub" rows="3" placeholder="- Reflexos\n- Multas\n- ..."></textarea>
      </label>
      <div class="row end">
        <button type="button" class="mini danger btnDelPedido">remover</button>
      </div>
    `;
    wrap.appendChild(el);

    el.querySelector('.btnDelPedido')?.addEventListener('click', ()=>{
      el.remove();
      buildValoresFromPedidos();
      window.dispatchEvent(new Event('form:dirty'));
    });

    // chip visual
    paintPedidoChips();
    window.dispatchEvent(new Event('form:dirty'));
  }

  function paintPedidoChips() {
    const host = $('#pedidoChips'); if (!host) return;
    host.innerHTML = '';
    $$('#pedidosWrap .pedido').forEach(p=>{
      const t = p.querySelector('.pedido-titulo')?.value || '(sem título)';
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = t;
      host.appendChild(chip);
    });
  }

  // -------------------- Valores --------------------
  function buildValoresFromPedidos() {
    const wrap = $('#valoresWrap'); if (!wrap) return;
    const atual = {};
    $$('#valoresWrap .valor-item').forEach(r=>{
      const t = r.querySelector('.valor-titulo')?.value?.trim();
      const v = parseMoney(r.querySelector('.valor-num')?.value);
      if (t) atual[t]=v;
    });

    wrap.innerHTML = '';
    const pedidos = $$('#pedidosWrap .pedido').map(p=>p.querySelector('.pedido-titulo')?.value?.trim()).filter(Boolean);

    pedidos.forEach(t=>{
      const v = atual[t] ?? 0;
      const row = document.createElement('div');
      row.className = 'valor-item';
      row.innerHTML = `
        <div class="grid">
          <label>Pedido
            <input type="text" class="valor-titulo" value="${t}">
          </label>
          <label>Valor estimado (R$)
            <input type="number" class="valor-num" min="0" step="0.01" value="${v.toFixed(2)}">
          </label>
        </div>`;
      wrap.appendChild(row);
    });

    sumValores();
    wrap.addEventListener('input', (e)=>{
      if (e.target.classList.contains('valor-num')) sumValores();
      window.dispatchEvent(new Event('form:dirty'));
    }, { once:true });
  }

  function sumValores() {
    const total = $$('#valoresWrap .valor-num').reduce((acc,el)=> acc + parseMoney(el.value), 0);
    const t = $('#valorCausa'); if (t) t.textContent = money(total);
    return total;
  }

  // -------------------- Provas --------------------
  function addProva(text='') {
    const host = $('#provasWrap'); if (!host) return;
    const row = document.createElement('div');
    row.className = 'row gap';
    row.innerHTML = `
      <input type="text" class="prova" placeholder="Ex.: Holerites (meses X a Y), Cartões de ponto..." value="${text}">
      <button type="button" class="mini danger">remover</button>`;
    row.querySelector('button')?.addEventListener('click', ()=>{ row.remove(); window.dispatchEvent(new Event('form:dirty')); });
    host.appendChild(row);
  }

  // -------------------- Draft (localStorage) --------------------
  const LS_KEY = 'portials_draft_v1';

  function collect() {
    const juizo = [$('#juizoNum')?.value, $('#cidade')?.value, $('#uf')?.value].filter(Boolean).join(' - ');
    const reclamante = {
      nome: $('#reclamante_nome')?.value || '',
      estado_civil: $('#reclamante_estado_civil')?.value || '',
      prof: $('#reclamante_prof')?.value || '',
      cpf: $('#reclamante_cpf')?.value || '',
      rg: $('#reclamante_rg')?.value || '',
      email: $('#reclamante_email')?.value || '',
      tel: $('#reclamante_tel')?.value || '',
      cep: $('#reclamante_cep')?.value || '',
      end: $('#reclamante_end')?.value || '',
    };
    const reclamadas = $$('#reclamadasWrap .reclamada').map(div=>({
      nome: div.querySelector('[name="reclamada_nome"]')?.value || '',
      doc: div.querySelector('[name="reclamada_doc"]')?.value || '',
      end: div.querySelector('[name="reclamada_end"]')?.value || '',
      email: div.querySelector('[name="reclamada_email"]')?.value || '',
      tel: div.querySelector('[name="reclamada_tel"]')?.value || '',
      cep: div.querySelector('[name="reclamada_cep"]')?.value || '',
    }));

    const contrato = {
      adm: $('#adm')?.value || '',
      saída: $('#saida')?.value || '',
      saida: $('#saida')?.value || '',
      funcao: $('#funcao')?.value || '',
      salario: $('#salario')?.value || '',
      jornada: $('#jornada')?.value || '',
      controlePonto: $('#controlePonto')?.value || '',
      desligamento: $('#desligamento')?.value || '',
    };

    const pedidos = $$('#pedidosWrap .pedido').map(p=>({
      titulo: p.querySelector('.pedido-titulo')?.value || '',
      detalhe: p.querySelector('.pedido-det')?.value || '',
      subpedidos: (p.querySelector('.pedido-sub')?.value || '')
        .split('\n').map(s=>s.replace(/^[-•]\s*/,'').trim()).filter(Boolean)
    })).filter(p=>p.titulo);

    const valores = $$('#valoresWrap .valor-item').map(r=>({
      titulo: r.querySelector('.valor-titulo')?.value || '',
      valor: parseMoney(r.querySelector('.valor-num')?.value)
    })).filter(v=>v.titulo);

    const provas = $$('#provasWrap .prova').map(i=>i.value).filter(Boolean);

    const outros = {
      justicaGratuita: $('#justicaGratuita')?.checked || false,
      honorarios: $('#honorarios')?.checked || false
    };

    return {
      juizo, reclamante, reclamadas, contrato,
      fatos: $('#fatos')?.value || '',
      fundamentos: $('#fundamentos')?.value || '',
      pedidos, valores, provas,
      ...outros
    };
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      loadDraftToForm(d);
      toast('Rascunho carregado');
      return d;
    } catch {
      toast('Falha ao carregar rascunho', 'bad');
      return null;
    }
  }

  function saveDraft() {
    const data = collect();
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    toast('Rascunho salvo');
    return data;
  }

  function loadDraftToForm(d) {
    if (!d) return;

    // Juízo
    const parts = (d.juizo||'').split(' - ');
    $('#juizoNum') && ($('#juizoNum').value = parts[0] || '');
    $('#cidade') && ($('#cidade').value = parts[1] || '');
    $('#uf') && ($('#uf').value = parts[2] || '');

    // Reclamante
    const r = d.reclamante || {};
    $('#reclamante_nome') && ($('#reclamante_nome').value = r.nome||'');
    $('#reclamante_estado_civil') && ($('#reclamante_estado_civil').value = r.estado_civil||'');
    $('#reclamante_prof') && ($('#reclamante_prof').value = r.prof||'');
    $('#reclamante_cpf') && ($('#reclamante_cpf').value = r.cpf||'');
    $('#reclamante_rg') && ($('#reclamante_rg').value = r.rg||'');
    $('#reclamante_email') && ($('#reclamante_email').value = r.email||'');
    $('#reclamante_tel') && ($('#reclamante_tel').value = r.tel||'');
    $('#reclamante_cep') && ($('#reclamante_cep').value = r.cep||'');
    $('#reclamante_end') && ($('#reclamante_end').value = r.end||'');

    // Reclamadas
    $('#reclamadasWrap').innerHTML = '';
    (d.reclamadas||[]).forEach(x=>{
      const bloc = document.createElement('div');
      bloc.className = 'card subtle reclamada';
      bloc.innerHTML = `
        <div class="grid">
          <label>Razão social / Nome <input name="reclamada_nome" value="${x.nome||''}"></label>
          <label>CNPJ/CPF <input name="reclamada_doc" value="${x.doc||''}"></label>
          <label>Endereço <input name="reclamada_end" value="${x.end||''}"></label>
          <label>E-mail <input name="reclamada_email" type="email" value="${x.email||''}"></label>
          <label>Telefone <input name="reclamada_tel" value="${x.tel||''}"></label>
          <label>CEP <input name="reclamada_cep" value="${x.cep||''}"></label>
        </div>
        <div class="row end"><button type="button" class="mini danger btnRemoveReclamada">remover</button></div>
      `;
      bloc.querySelector('.btnRemoveReclamada')?.addEventListener('click', ()=>{ bloc.remove(); window.dispatchEvent(new Event('form:dirty')); });
      $('#reclamadasWrap').appendChild(bloc);
    });

    // Contrato
    const c = d.contrato || {};
    $('#adm') && ($('#adm').value = c.adm||'');
    $('#saida') && ($('#saida').value = c.saida||c.saída||'');
    $('#funcao') && ($('#funcao').value = c.funcao||'');
    $('#salario') && ($('#salario').value = c.salario||'');
    $('#jornada') && ($('#jornada').value = c.jornada||'');
    $('#controlePonto') && ($('#controlePonto').value = c.controlePonto||'');
    $('#desligamento') && ($('#desligamento').value = c.desligamento||'');

    // Fatos / Fundamentos
    $('#fatos') && ($('#fatos').value = d.fatos||'');
    $('#fundamentos') && ($('#fundamentos').value = d.fundamentos||'');

    // Pedidos
    $('#pedidosWrap').innerHTML = '';
    (d.pedidos||[]).forEach(p=> addPedido(p.titulo));
    // Repreenche detalhes/subpedidos
    $$('#pedidosWrap .pedido').forEach((el, i)=>{
      const src = (d.pedidos||[])[i]; if (!src) return;
      el.querySelector('.pedido-det').value = src.detalhe||'';
      el.querySelector('.pedido-sub').value = (src.subpedidos||[]).map(s=>`- ${s}`).join('\n');
    });
    paintPedidoChips();

    // Valores
    buildValoresFromPedidos();
    (d.valores||[]).forEach(v=>{
      $$('#valoresWrap .valor-item').forEach(row=>{
        if (row.querySelector('.valor-titulo').value.trim() === v.titulo) {
          row.querySelector('.valor-num').value = Number(v.valor||0).toFixed(2);
        }
      });
    });
    sumValores();

    // Provas
    $('#provasWrap').innerHTML = '';
    (d.provas||[]).forEach(p=> addProva(p));

    // Outros
    $('#justicaGratuita') && ($('#justicaGratuita').checked = !!d.justicaGratuita);
    $('#honorarios') && ($('#honorarios').checked = !!d.honorarios);

    window.dispatchEvent(new Event('form:dirty'));
  }

  // -------------------- Binds iniciais --------------------
  function bindBasics() {
    $('#addReclamada')?.addEventListener('click', ()=> loadDraftToForm({ reclamadas:[{}, ...(collect().reclamadas||[])] }));
    $('#addPedido')?.addEventListener('click', ()=> addPedido(''));
    $('#addProva')?.addEventListener('click', ()=> addProva(''));

    // atualizar chips/valores ao alterar título do pedido
    $('#pedidosWrap')?.addEventListener('input', (e)=>{
      if (e.target.classList.contains('pedido-titulo')) {
        paintPedidoChips();
        buildValoresFromPedidos();
      }
      window.dispatchEvent(new Event('form:dirty'));
    });
  }

  // -------------------- Expose --------------------
  window.Clara = Object.assign(window.Clara || {}, {
    form: {
      addPedido, buildValoresFromPedidos, sumValores,
      collect, loadDraft, saveDraft, loadDraftToForm
    }
  });

  window.addEventListener('partials:loaded', ()=>{
    bindBasics();
    // inicializa com um item de cada seção para guiar o usuário
    if ($$('#pedidosWrap .pedido').length === 0) addPedido('Horas Extras');
    if ($$('#provasWrap .prova').length === 0) addProva('');
    buildValoresFromPedidos();
  });
})();
