/* form.js — coleta de dados, máscaras, pedidos, valores, uploads (PDF/TXT) */
(function(){
  const { $, $$, state, toast, onlyDigits, fmtBRL, escapeHtml } = window.Clara;

  // máscaras básicas
  function maskCPF(v){ const d=onlyDigits(v).slice(0,11);
    return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
  function maskCNPJ(v){ const d=onlyDigits(v).slice(0,14);
    return d.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2'); }
  function maskCEP(v){ return onlyDigits(v).slice(0,8).replace(/(\d{5})(\d{1,3})$/,'$1-$2'); }
  function maskPhone(v){ const d=onlyDigits(v).slice(0,11);
    return d.length<=10? d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3') : d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3'); }

  $('#reclamante_cpf')?.addEventListener('input', e=> e.target.value = maskCPF(e.target.value));
  $('#reclamante_cep')?.addEventListener('input', e=> e.target.value = maskCEP(e.target.value));
  $('#reclamante_tel')?.addEventListener('input', e=> e.target.value = maskPhone(e.target.value));
  $('#uf')?.addEventListener('input', e=> e.target.value = e.target.value.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,2));

  // reclamada dinâmica
  $('#addReclamada')?.addEventListener('click', ()=>{
    const tpl = document.createElement('div');
    tpl.className='card subtle reclamada';
    tpl.innerHTML = `
      <div class="grid">
        <label>Razão social / Nome <input name="reclamada_nome"></label>
        <label>CNPJ/CPF <input name="reclamada_doc"></label>
        <label>Endereço <input name="reclamada_end"></label>
        <label>E-mail <input name="reclamada_email" type="email"></label>
        <label>Telefone <input name="reclamada_tel"></label>
        <label>CEP <input name="reclamada_cep"></label>
      </div>
      <div class="row end"><button type="button" class="mini danger btnRemoveReclamada">remover</button></div>`;
    $('#reclamadasWrap')?.appendChild(tpl);
    $('.btnRemoveReclamada', tpl)?.addEventListener('click', ()=> tpl.remove());
  });

  // pedidos + subpedidos
  const pedidosWrap = $('#pedidosWrap');
  $('#addPedido')?.addEventListener('click', ()=> addPedido('Pedido personalizado'));
  function addPedido(titulo=''){
    const el = document.createElement('div');
    el.className = 'pedido';
    el.innerHTML = `
      <div class="split">
        <input type="text" class="pedido-titulo" placeholder="Ex.: Horas Extras" value="${escapeHtml(titulo)}">
        <button type="button" class="mini danger btnRemove">remover</button>
      </div>
      <textarea class="pedido-detalhe" rows="3" placeholder="Detalhe sucinto: período, base legal, reflexos..."></textarea>
      <div class="row between" style="margin-top:6px">
        <small class="muted">Subpedidos (opcional)</small>
        <button type="button" class="mini addSub">+ subpedido</button>
      </div>
      <div class="subpedidos"></div>`;
    pedidosWrap?.appendChild(el);
    $('.btnRemove', el)?.addEventListener('click', ()=>{ el.remove(); syncValores(); });
    $('.addSub', el)?.addEventListener('click', ()=> addSubpedido($('.subpedidos', el)));
    syncValores();
  }
  function addSubpedido(container, text=''){
    const row = document.createElement('div');
    row.className='subpedido-row';
    row.innerHTML = `<input type="text" class="subpedido-txt" placeholder="Ex.: Reflexos em DSR, 13º, férias + 1/3" value="${escapeHtml(text)}">
                     <button type="button" class="mini danger">remover</button>`;
    container?.appendChild(row);
    $('button', row)?.addEventListener('click', ()=> row.remove());
  }

  // provas
  const provasWrap = $('#provasWrap');
  $('#addProva')?.addEventListener('click', ()=> addProva());
  function addProva(text=''){
    const el = document.createElement('div');
    el.className='prova';
    el.innerHTML = `<div class="row gap">
      <input type="text" class="prova-texto" placeholder="Ex.: holerites, cartões de ponto" value="${escapeHtml(text)}">
      <button type="button" class="mini danger btnRemoveProva">remover</button></div>`;
    provasWrap?.appendChild(el);
    $('.btnRemoveProva', el)?.addEventListener('click', ()=> el.remove());
  }

  // valores
  const valoresWrap = $('#valoresWrap');
  function getPedidos(){
    return $$('.pedido').map(p=>{
      const subs = $$('.subpedido-txt', p).map(i=> i.value.trim()).filter(Boolean);
      return { titulo: $('.pedido-titulo', p)?.value?.trim() || '', detalhe: $('.pedido-detalhe', p)?.value?.trim() || '', subpedidos: subs };
    }).filter(p=> p.titulo);
  }
  function buildValoresFromPedidos(){
    valoresWrap && (valoresWrap.innerHTML = '');
    getPedidos().forEach((p, idx)=>{
      const row = document.createElement('div');
      row.className='valor-item';
      row.innerHTML = `<div class="grid">
        <label>Pedido <input type="text" value="${escapeHtml(p.titulo)}" data-index="${idx}" class="valor-titulo"/></label>
        <label>Valor estimado (R$) <input type="number" min="0" step="0.01" value="" class="valor-num"/></label>
      </div>`;
      valoresWrap?.appendChild(row);
    });
    valoresWrap?.addEventListener('input', sumValores, { once:true });
    sumValores();
  }
  function sumValores(){
    const nums = $$('.valor-num', valoresWrap).map(i=> parseFloat(i.value||'0'));
    const total = nums.reduce((a,b)=> a+(isNaN(b)?0:b),0);
    $('#valorCausa') && ($('#valorCausa').textContent = fmtBRL(total));
  }
  function syncValores(){ if(window.Clara.ui && window.Clara.ui.setStep && (window.Clara.state?.step===7)) buildValoresFromPedidos(); }
  window.Clara.form = { getPedidos, buildValoresFromPedidos, sumValores, syncValores };

  // uploads PDF/TXT
  async function pdfToText(file){
    const uint8 = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({data:uint8}).promise;
    let out='';
    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map(it=>it.str).join(' ') + '\n';
    }
    return out;
  }
  $('#docUpload')?.addEventListener('change', async (e)=>{
    let acc=''; const files = Array.from(e.target.files||[]);
    for(const f of files){
      if(f.type==='application/pdf'){ acc += await pdfToText(f); toast(`PDF lido: ${f.name}`); }
      else if(f.type.startsWith('text/')){ acc += await f.text(); toast(`TXT lido: ${f.name}`); }
      else { toast(`Tipo não suportado: ${f.name}`,'warn'); }
    }
    window.Clara.state.docsText = acc.slice(0, 150000);
  });
  $('#tplPdf')?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    if(f.type!=='application/pdf'){ toast('Envie um PDF de modelo','warn'); return; }
    window.Clara.state.tplText = (await pdfToText(f)).slice(0, 80000);
    toast('Modelo PDF processado');
  });

  // exporta algumas utilidades
  window.Clara.form.addPedido = addPedido;
})(); 
