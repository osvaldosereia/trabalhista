/* Clara – app.js consolidado (versão longa, completa)
   - Força tema claro (sem classe theme-dark por padrão)
   - Wizard com 9 etapas + histórico (versões) e auditoria
   - Catálogo temático (fatos, fundamentos, pedidos) + chips
   - Upload de PDF/TXT com PDF.js (docs e modelo)
   - Pedidos dinâmicos + valores + sumário Valor da Causa
   - Prompt manual e IA (chat.completions) + refino
   - Calculadora tradicional + Cálculo por IA (opcional)
   - Prévia forense (HTML), copiar, imprimir, exportar PDF/DOCX
   - Importar/Exportar JSON do caso
   - Equipe: Templates e Pacotes de Fundamentos
   - Perícia (quesitos/checklist) e Dossiê de Protocolo
   - Toasts em todas as operações relevantes
*/
document.addEventListener('DOMContentLoaded', () => {
  // ============= helpers
  const $ = (q, el=document)=> el.querySelector(q);
  const $$ = (q, el=document)=> Array.from(el.querySelectorAll(q));
  const fmtBRL = n => (isNaN(n)?0:n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const escapeHtml = s => String(s||'').replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
  const onlyDigits = s => String(s||'').replace(/\D+/g,'');
  const sanitize = s => String(s||'').trim();
  const uid = (p='id') => p+'_'+Math.random().toString(36).slice(2,9);
  const nowISO = () => new Date().toISOString();

  // ============= toasts
  const toasts = $('#toasts');
  function toast(txt, type='good', t=3200){
    try{
      const el=document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = txt;
      toasts?.appendChild(el);
      setTimeout(()=> el.remove(), t);
    }catch(e){ console.log('[toast]', txt); }
  }

  // ============= força tema claro
  document.body?.classList.remove('theme-dark');
  const btnTheme = $('#btnTheme');
  btnTheme?.addEventListener('click', ()=> { document.body.classList.remove('theme-dark'); toast('Tema fixo: claro','warn'); });

  // ============= estado
  const state = {
    step: 0,
    docsText: '',
    tplText: '',
    historyMax: 30,
  };

  // ======== refs UI principais (com guards)
  const wizard = $('#wizard'), resultado = $('#resultado'), intro = $('#intro');
  const stepsList = $('#stepsList')?.querySelectorAll('li') || [];
  const progressBar = $('#progress span');
  const saida = $('#saida'), saidaIa = $('#saidaIa'), previewDoc = $('#previewDoc');
  const btnIniciar = $('#btnIniciar'), btnPrev = $('#btnPrev'), btnNext = $('#btnNext');
  const btnGerar = $('#btnGerar'), btnGerarIA = $('#btnGerarIA'), btnRefinarIa = $('#refinarIa');
  const btnCopiar = $('#copiar'), btnCopiarIa = $('#copiarIa');
  const btnForense = $('#btnForense'), btnPrint = $('#printDoc'), btnCopyHtml = $('#copyHtml'), btnVoltar = $('#voltar');
  const btnExportPdf = $('#exportPdf'), btnExportDocx = $('#exportDocx');
  const btnExportJson = $('#btnExportJson'), btnImportJson = $('#btnImportJson');
  const pedidosWrap = $('#pedidosWrap'), valoresWrap = $('#valoresWrap'), provasWrap = $('#provasWrap');
  const lintList = $('#lintList'), reviewBox = $('#review');
  const loading = $('#loading');

  // ======== Config/BYOK
  const modal = $('#modal'); const btnConfig = $('#btnConfig'); const closeConfig = $('#closeConfig'); const saveConfig = $('#saveConfig');
  const apiKeyInput = $('#apiKey'), modelInput = $('#model'), temperatureInput = $('#temperature'), maxTokensInput = $('#maxTokens'), currentUserInput = $('#currentUser');
  function loadCfg(){
    const cfg = JSON.parse(localStorage.getItem('openai_cfg')||'{}');
    if(apiKeyInput && cfg.apiKey) apiKeyInput.value = cfg.apiKey;
    if(modelInput && cfg.model) modelInput.value = cfg.model;
    if(temperatureInput && cfg.temperature!=null) temperatureInput.value = cfg.temperature;
    if(maxTokensInput && cfg.maxTokens!=null) maxTokensInput.value = cfg.maxTokens;
    if(currentUserInput && cfg.user) currentUserInput.value = cfg.user;
    return cfg;
  }
  function saveCfg(){
    const prev = JSON.parse(localStorage.getItem('openai_cfg')||'{}');
    const cfg = {
      ...prev,
      apiKey: sanitize(apiKeyInput?.value),
      model: modelInput?.value || 'gpt-4o-mini',
      temperature: Number(temperatureInput?.value||0.2),
      maxTokens: Number(maxTokensInput?.value||2048),
      user: sanitize(currentUserInput?.value)
    };
    localStorage.setItem('openai_cfg', JSON.stringify(cfg));
    toast('Configuração salva','good'); modal?.classList.add('hidden');
  }
  btnConfig?.addEventListener('click', ()=>{ loadCfg(); modal?.classList.remove('hidden'); });
  closeConfig?.addEventListener('click', ()=> modal?.classList.add('hidden'));
  saveConfig?.addEventListener('click', saveCfg);

  // ============= Auditoria/Versões
  const AUDIT_KEY='audit_log_v2', VKEY='peticao_versions_v2';
  function addAudit(type, payload){ try{
    const list = JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');
    list.unshift({ id: uid('aud'), at: nowISO(), type, payload });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(list));
  }catch{} }
  function versions(){ try{ return JSON.parse(localStorage.getItem(VKEY)||'[]'); }catch{return [];} }
  function saveVersion(kind='manual'){
    const v = { id: uid('v'), at: nowISO(), kind, data: collectAll(), prompt: saida?.value||'', ia: saidaIa?.value||'' };
    const list = [v, ...versions()].slice(0, state.historyMax);
    localStorage.setItem(VKEY, JSON.stringify(list));
    localStorage.setItem('draft_peticao', JSON.stringify(v.data));
    addAudit('VERSION', { kind, id: v.id });
  }

  // ============= Navegação do Wizard
  const MAX_STEP = 8;
  function setStep(i){
    state.step = Math.max(0, Math.min(MAX_STEP, i));
    $$('.step').forEach((el, idx)=> el.classList.toggle('hidden', idx!==state.step));
    stepsList.forEach((li, idx)=> li.classList.toggle('active', idx===state.step));
    progressBar && (progressBar.style.width = `${(state.step/MAX_STEP)*100}%`);
    if(state.step===MAX_STEP){ buildReview(); }
  }
  btnIniciar?.addEventListener('click', ()=>{ intro?.classList.add('hidden'); wizard?.classList.remove('hidden'); setStep(0); toast('Novo caso iniciado'); });
  btnPrev?.addEventListener('click', ()=> setStep(state.step-1));
  btnNext?.addEventListener('click', ()=>{ if(!validateStep(state.step)) return; setStep(state.step+1); if(state.step===7) buildValoresFromPedidos(); });

  // ============= Campos básicos / máscaras
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

  // ============= Reclamadas dinâmicas
  $('#addReclamada')?.addEventListener('click', ()=>{
    const ref = $('.reclamada', $('#reclamadasWrap'));
    const tpl = document.createElement('div');
    tpl.className='card subtle reclamada';
    tpl.innerHTML = ref?.innerHTML || `
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
    $('input[name="reclamada_doc"]', tpl)?.addEventListener('input', e=>{
      const raw = onlyDigits(e.target.value);
      e.target.value = raw.length <= 11 ? maskCPF(raw) : maskCNPJ(raw);
    });
    $('input[name="reclamada_cep"]', tpl)?.addEventListener('input', e=> e.target.value = maskCEP(e.target.value));
    $('input[name="reclamada_tel"]', tpl)?.addEventListener('input', e=> e.target.value = maskPhone(e.target.value));
  });
  $$('.btnRemoveReclamada').forEach(b=> b.addEventListener('click', e=>{
    const card = e.currentTarget.closest('.reclamada');
    if($$('.reclamada').length>1) card?.remove(); else toast('Mantenha ao menos 1 reclamada','warn');
  }));

  // ============= Catálogo temático básico (chips → pedidos)
  const FUNDAMENTOS_MAP = {
    "Horas Extras": ["CF/88 art. 7º XIII e XVI","CLT 58, 59, 74 §2º","Súmulas TST 264, 338, 376 I/II, 85"],
    "Intervalo Intrajornada": ["CLT 71 e §4º","Súmula TST 437"],
    "Adicional Noturno": ["CLT 73","Súmula TST 60"],
    "Insalubridade": ["CLT 189–192","NR-15","Súmula TST 289, OJ 173"],
    "Periculosidade": ["CLT 193","NR-16","Súmula TST 361"],
    "FGTS + 40%": ["Lei 8.036/90 arts. 15 e 18 §1º","CF/88 art. 7º III"],
    "Multa 477 CLT": ["CLT 477 §6º e §8º"],
    "Dano Moral": ["CF/88 art. 5º V e X","CC 186 e 927","Súmula TST 392"],
  };
  $$('.chip').forEach(chip=> chip.addEventListener('click', ()=> addPedido(chip.dataset.preset)));
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
        <small class="muted">Subpedidos (opcional): reflexos, bases, períodos</small>
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
  $('#addProva')?.addEventListener('click', ()=> addProva());
  function addProva(text=''){
    const el = document.createElement('div');
    el.className='prova';
    el.innerHTML = `<div class="row gap">
      <input type="text" class="prova-texto" placeholder="Ex.: holerites, cartões de ponto, testemunhas X e Y" value="${escapeHtml(text)}">
      <button type="button" class="mini danger btnRemoveProva">remover</button></div>`;
    provasWrap?.appendChild(el);
    $('.btnRemoveProva', el)?.addEventListener('click', ()=> el.remove());
  }

  // ============= Valores/VC
  function buildValoresFromPedidos(){
    if(!valoresWrap) return;
    valoresWrap.innerHTML = '';
    getPedidos().forEach((p, idx)=>{
      const row = document.createElement('div');
      row.className='valor-item';
      row.innerHTML = `<div class="grid">
        <label>Pedido <input type="text" value="${escapeHtml(p.titulo)}" data-index="${idx}" class="valor-titulo"/></label>
        <label>Valor estimado (R$) <input type="number" min="0" step="0.01" value="" class="valor-num"/></label>
      </div>`;
      valoresWrap.appendChild(row);
    });
    valoresWrap.addEventListener('input', sumValores, { once:true });
    sumValores();
  }
  function sumValores(){
    const nums = $$('.valor-num', valoresWrap).map(i=> parseFloat(i.value||'0'));
    const total = nums.reduce((a,b)=> a+(isNaN(b)?0:b),0);
    $('#valorCausa') && ($('#valorCausa').textContent = fmtBRL(total));
  }
  function syncValores(){ if(state.step===7) buildValoresFromPedidos(); }

  // ============= Uploads (PDF/TXT)
  async function pdfToText(file){
    const uint8 = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({data:uint8}).promise;
    let out='';
    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map(it=>it.str).join(' ') + '\\n';
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
    state.docsText = acc.slice(0, 150000);
  });
  $('#tplPdf')?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    if(f.type!=='application/pdf'){ toast('Envie um PDF de modelo','warn'); return; }
    state.tplText = (await pdfToText(f)).slice(0, 80000);
    toast('Modelo PDF processado');
  });

  // ============= Build Prompt
  function collectAll(){
    const rawJuizoNum = sanitize($('#juizoNum')?.value);
    const juizo = `${rawJuizoNum?rawJuizoNum+' ':''}Vara do Trabalho de ${sanitize($('#cidade')?.value)}/${sanitize($('#uf')?.value)}`;
    const reclamante = {
      nome: sanitize($('#reclamante_nome')?.value),
      estado_civil: sanitize($('#reclamante_estado_civil')?.value),
      prof: sanitize($('#reclamante_prof')?.value),
      cpf: sanitize($('#reclamante_cpf')?.value),
      rg: sanitize($('#reclamante_rg')?.value),
      end: sanitize($('#reclamante_end')?.value),
      cep: sanitize($('#reclamante_cep')?.value),
      tel: sanitize($('#reclamante_tel')?.value),
      email: sanitize($('#reclamante_email')?.value),
    };
    const reclamadas = $$('.reclamada').map(card=> ({
      nome: sanitize($('input[name="reclamada_nome"]', card)?.value),
      doc: sanitize($('input[name="reclamada_doc"]', card)?.value),
      end: sanitize($('input[name="reclamada_end"]', card)?.value),
      cep: sanitize($('input[name="reclamada_cep"]', card)?.value),
      tel: sanitize($('input[name="reclamada_tel"]', card)?.value),
      email: sanitize($('input[name="reclamada_email"]', card)?.value),
    }));
    const contrato = {
      adm: $('#adm')?.value, saida: $('#saida')?.value, funcao: sanitize($('#funcao')?.value),
      salario: sanitize($('#salario')?.value), jornada: sanitize($('#jornada')?.value),
      controlePonto: sanitize($('#controlePonto')?.value), desligamento: sanitize($('#desligamento')?.value),
    };
    const fatos = sanitize($('#fatos')?.value);
    const pedidos = getPedidos();
    const fundamentos = sanitize($('#fundamentos')?.value);
    const provas = $$('.prova-texto').map(i=> sanitize(i.value)).filter(Boolean);
    const justicaGratuita = $('#justicaGratuita')?.checked;
    const honorarios = $('#honorarios')?.checked;
    const valorCausa = ($$('.valor-num').map(i=> parseFloat(i.value||'0')).reduce((a,b)=>a+(isNaN(b)?0:b),0)) || 0;
    return { _rawJuizoNum: rawJuizoNum, juizo, reclamante, reclamadas, contrato, fatos, pedidos, fundamentos, provas, justicaGratuita, honorarios, valorCausa };
  }
  function getPedidos(){
    return $$('.pedido').map(p=>{
      const subs = $$('.subpedido-txt', p).map(i=> sanitize(i.value)).filter(Boolean);
      return { titulo: sanitize($('.pedido-titulo', p)?.value), detalhe: sanitize($('.pedido-detalhe', p)?.value), subpedidos: subs };
    }).filter(p=> p.titulo);
  }
  function buildPrompt(d){
    const reclams = d.reclamadas.map((r,i)=>`${i+1}. ${r.nome}${r.doc?`, ${r.doc}`:''}${r.end?`, ${r.end}`:''}`).join('\\n');
    return `Você é ADVOGADO TRABALHISTA no Brasil.
Redija uma PETIÇÃO INICIAL TRABALHISTA COMPLETA (endereçamento, qualificação, fatos, fundamentos, pedidos numerados e liquidados quando possível, valor da causa, requerimentos finais, local/data/assinatura). Use CLT, CF/88, CPC (art. 769 CLT), súmulas/OJs do TST e jurisprudência pertinente. Linguagem clara e técnica.

[JUÍZO] ${d.juizo}
[QUALIFICAÇÃO] Reclamante: ${d.reclamante.nome}${d.reclamante.estado_civil?`, ${d.reclamante.estado_civil}`:''}${d.reclamante.prof?`, ${d.reclamante.prof}`:''}${d.reclamante.cpf?`, CPF ${d.reclamante.cpf}`:''}${d.reclamante.rg?`, RG ${d.reclamante.rg}`:''}${d.reclamante.end?`, residente ${d.reclamante.end}`:''}${d.reclamante.email?`, e-mail ${d.reclamante.email}`:''}.
Reclamadas: 
${reclams||'-'}

[CONTRATO] Admissão: ${d.contrato.adm||'-'}; Saída: ${d.contrato.saida||'-'}; Função: ${d.contrato.funcao||'-'}; Salário: ${d.contrato.salario?`R$ ${d.contrato.salario}`:'-'}; Jornada: ${d.contrato.jornada||'-'}; Controle de ponto: ${d.contrato.controlePonto||'-'}; Desligamento: ${d.contrato.desligamento||'-'}.
[FATOS]
${d.fatos||'-'}

[FUNDAMENTOS]
${d.fundamentos||'Indicar CLT, CF/88, súmulas/OJs aplicáveis a cada pedido.'}

[PEDIDOS]
${d.pedidos.map((p,i)=>`${i+1}) ${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}${(p.subpedidos||[]).length?`\\n  ${(p.subpedidos||[]).map((s,j)=>`${i+1}.${j+1}) ${s}`).join('\\n  ')}`:''}`).join('\\n')}

[PROVAS] ${d.provas.join('; ')||'documentos anexos e prova testemunhal'}
[JUSTIÇA GRATUITA] ${d.justicaGratuita?'Sim':'Não'}  [HONORÁRIOS] ${d.honorarios?'Sim':'Não'}
[VALOR DA CAUSA] ${fmtBRL(d.valorCausa)}

Se houver texto de MODELO PDF (apenas como estilo):
${state.tplText || '(sem modelo)'}

Se houver DOCUMENTOS (holerites/ponto/contratos), considere e concilie com os fatos/pedidos:
${state.docsText || '(sem docs)'}`.trim();
  }

  // ============= Botões principais (agora com guards)
  btnGerar?.addEventListener('click', ()=>{
    const d = collectAll(); const prompt = buildPrompt(d);
    saida && (saida.value = prompt); saidaIa && (saidaIa.value = '');
    wizard?.classList.add('hidden'); resultado?.classList.remove('hidden'); window.scrollTo({top:0, behavior:'smooth'});
    const lint = runLint({ d, promptText: prompt, iaText: '' }); fillLint(lint); updateTokenInfo(prompt, '');
    saveVersion('gerar_prompt'); toast('Prompt gerado');
  });

  async function callOpenAI({ prompt, cfg }){
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const body = {
      model: cfg.model || 'gpt-4o-mini',
      temperature: isNaN(cfg.temperature)?0.2:cfg.temperature,
      max_tokens: isNaN(cfg.maxTokens)?2048:cfg.maxTokens,
      messages: [
        { role: 'system', content: 'Você é um advogado trabalhista brasileiro sênior. Escreva peças formais, claras e fundamentadas na CLT/CF/88/TST.' },
        { role: 'user', content: prompt }
      ]
    };
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type':'application/json','Authorization': `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body)
    });
    if(!res.ok){ const errText = await res.text().catch(()=> ''); throw new Error(`HTTP ${res.status} – ${errText||res.statusText}`); }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || '';
  }

  btnGerarIA?.addEventListener('click', async ()=>{
    const d = collectAll(); const prompt = buildPrompt(d);
    saida && (saida.value = prompt);
    wizard?.classList.add('hidden'); resultado?.classList.remove('hidden'); window.scrollTo({top:0, behavior:'smooth'});
    const cfg = loadCfg(); if(!cfg.apiKey){ toast('Cole sua OpenAI API key em Configurar IA','bad'); modal?.classList.remove('hidden'); return; }
    try{
      addAudit('IA_REQUEST',{len: prompt.length});
      loading?.classList.remove('hidden');
      const text = await callOpenAI({ prompt, cfg });
      saidaIa && (saidaIa.value = text||'(sem conteúdo)');
      const lint = runLint({ d, promptText: prompt, iaText: text }); fillLint(lint); updateTokenInfo(prompt, text);
      saveVersion('gerar_ia'); toast('Petição gerada com IA');
    }catch(err){
      saidaIa && (saidaIa.value = `Falha ao gerar com ChatGPT: ${err?.message||err}`);
      toast('Erro ao gerar com ChatGPT','bad');
    }finally{ loading?.classList.add('hidden'); }
  });

  btnRefinarIa?.addEventListener('click', async ()=>{
    const base = (saidaIa?.value||'').trim();
    if(!base){ toast('Gere o texto com ChatGPT antes','warn'); return; }
    const instr = prompt('Como refinar? (ex.: “deixar mais conciso”, “incluir súmulas 264/376 para horas extras”, “ajustar pedidos para liquidação por estimativa”)');
    if(!instr) return;
    const cfg = loadCfg(); if(!cfg.apiKey){ toast('Cole sua OpenAI API key em Configurar IA','bad'); modal?.classList.remove('hidden'); return; }
    try{
      loading?.classList.remove('hidden');
      const refined = await callOpenAI({ prompt: `Refine juridicamente o texto abaixo conforme a instrução entre colchetes.\n[INSTRUÇÃO]: ${instr}\n\n[TEXTO-BASE]:\n${base}\n\nMantenha estrutura formal, correções jurídicas e coerência. Devolva apenas o texto final.`, cfg });
      if(refined) saidaIa.value = refined;
      toast('Texto refinado');
    }catch{ toast('Erro ao refinar','bad'); }finally{ loading?.classList.add('hidden'); }
  });

  // copiar / visualizar / imprimir
  btnCopiar?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(saida?.value||''); toast('Prompt copiado'); }catch{ toast('Falha ao copiar','bad'); } });
  btnCopiarIa?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(saidaIa?.value||''); toast('Texto da IA copiado'); }catch{ toast('Falha ao copiar','bad'); } });

  function buildForenseHTML(d){
    const safe = s => (s && String(s).trim()) || '—';
    const reclams = d.reclamadas.map((r,i)=>`<p><span class="bold">${i+1}. ${safe(r.nome)}</span>${r.doc?`, ${safe(r.doc)}`:''}${r.end?`, ${safe(r.end)}`:''}${r.email?`, e-mail ${safe(r.email)}`:''}.</p>`).join('');
    const pedidosList = d.pedidos.map((p,i)=>{
      const subs = (p.subpedidos||[]).map((s,j)=>`<li>${i+1}.${j+1}) ${escapeHtml(s)}</li>`).join('');
      return `<li><span class="bold">${i+1}) ${escapeHtml(p.titulo)}</span>${p.detalhe?` — ${escapeHtml(p.detalhe)}`:''}${subs?`<ol>${subs}</ol>`:''}</li>`;
    }).join('');
    return `<div class="doc print-area">
      <h1>Ao Juízo da ${safe(d.juizo)}</h1>
      <h2>Qualificação</h2>
      <p><span class="bold">Reclamante:</span> ${safe(d.reclamante.nome)}${d.reclamante.estado_civil?`, ${safe(d.reclamante.estado_civil)}`:''}${d.reclamante.prof?`, ${safe(d.reclamante.prof)}`:''}${d.reclamante.cpf?`, CPF ${safe(d.reclamante.cpf)}`:''}${d.reclamante.rg?`, RG ${safe(d.reclamante.rg)}`:''}${d.reclamante.end?`, residente ${safe(d.reclamante.end)}`:''}${d.reclamante.email?`, e-mail ${safe(d.reclamante.email)}`:''}.</p>
      <p><span class="bold">Reclamadas:</span></p>${reclams||'<p>—</p>'}
      <h2>Do Contrato</h2>
      <p>Admissão: ${safe(d.contrato.adm)}; Saída: ${safe(d.contrato.saida)}; Função: ${safe(d.contrato.funcao)}; Salário: ${d.contrato.salario?`R$ ${safe(d.contrato.salario)}`:'—'}; Jornada: ${safe(d.contrato.jornada)}; Controle de ponto: ${safe(d.contrato.controlePonto)}; Desligamento: ${safe(d.contrato.desligamento)}.</p>
      <h2>Dos Fatos</h2><p>${safe(d.fatos)}</p>
      <h2>Dos Fundamentos</h2><p>${d.fundamentos ? escapeHtml(d.fundamentos) : 'Indicar CLT, CF/88, CPC (art. 769 CLT), súmulas/OJs do TST e jurisprudência aplicável.'}</p>
      <h2>Dos Pedidos</h2><ol>${pedidosList}</ol>
      <h2>Provas</h2><p>Protesta provar o alegado por todos os meios em direito admitidos, notadamente: ${d.provas.join('; ') || 'documentos anexos e prova testemunhal'}.</p>
      ${d.justicaGratuita?'<p>Requer os benefícios da justiça gratuita (CLT art. 790, §3º).</p>':''}
      ${d.honorarios?'<p>Requer honorários de sucumbência (CLT art. 791-A).</p>':''}
      <h2>Valor da Causa</h2><p>${fmtBRL(d.valorCausa)}</p>
      <h2>Requerimentos Finais</h2><p>Requer notificação/citação das reclamadas para audiência e resposta, sob pena de revelia e confissão; a total procedência; correção monetária e juros legais; e demais cominações.</p>
      <p class="right">${new Date().toLocaleDateString('pt-BR')}.</p><p class="center">__________________________________<br/>Advogado (OAB nº)</p></div>`;
  }
  btnForense?.addEventListener('click', ()=>{
    const d = collectAll(); previewDoc && (previewDoc.innerHTML = buildForenseHTML(d));
    wizard?.classList.add('hidden'); resultado?.classList.remove('hidden'); toast('Prévia atualizada');
  });
  btnCopyHtml?.addEventListener('click', async ()=>{ try{
    const wrapper = document.createElement('div'); wrapper.innerHTML = buildForenseHTML(collectAll());
    await navigator.clipboard.writeText(wrapper.innerHTML); toast('HTML copiado');
  }catch{ toast('Falha ao copiar HTML','bad'); }});
  btnPrint?.addEventListener('click', ()=>{ if(!previewDoc?.innerHTML.trim()){ previewDoc.innerHTML = buildForenseHTML(collectAll()); } window.print(); });
  btnVoltar?.addEventListener('click', ()=>{ resultado?.classList.add('hidden'); wizard?.classList.remove('hidden'); setStep(MAX_STEP); });

  // ============= Exportações
  btnExportJson?.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(collectAll(),null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `caso-${Date.now()}.json`; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000); toast('JSON exportado');
  });
  btnImportJson?.addEventListener('click', ()=>{
    const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange = async e=>{ const f = e.target.files?.[0]; if(!f) return; try{
      const d = JSON.parse(await f.text()); localStorage.setItem('draft_peticao', JSON.stringify(d)); loadDraftToForm(); setStep(8); toast('Caso importado');
    }catch{ toast('JSON inválido','bad'); } };
    inp.click();
  });
  function loadDraftToForm(){
    const raw = localStorage.getItem('draft_peticao'); if(!raw){ toast('Sem rascunho salvo','warn'); return; }
    const d = JSON.parse(raw);
    $('#juizoNum') && ($('#juizoNum').value = d._rawJuizoNum||'');
    const [cidade, uf] = (d.juizo?.match(/de (.*)\/(.*)$/)||['','','']).slice(1);
    $('#cidade') && ($('#cidade').value = cidade||''); $('#uf') && ($('#uf').value = uf||'');
    $('#reclamante_nome') && ($('#reclamante_nome').value = d.reclamante?.nome||'');
    $('#reclamante_estado_civil') && ($('#reclamante_estado_civil').value = d.reclamante?.estado_civil||'');
    $('#reclamante_prof') && ($('#reclamante_prof').value = d.reclamante?.prof||'');
    $('#reclamante_cpf') && ($('#reclamante_cpf').value = d.reclamante?.cpf||'');
    $('#reclamante_rg') && ($('#reclamante_rg').value = d.reclamante?.rg||'');
    $('#reclamante_end') && ($('#reclamante_end').value = d.reclamante?.end||'');
    $('#reclamante_email') && ($('#reclamante_email').value = d.reclamante?.email||'');
    $('#reclamante_cep') && ($('#reclamante_cep').value = d.reclamante?.cep||'');
    $('#reclamante_tel') && ($('#reclamante_tel').value = d.reclamante?.tel||'');
    const wrap = $('#reclamadasWrap'); if(wrap){ wrap.innerHTML=''; (d.reclamadas||[{}]).forEach(r=>{
      const card = document.createElement('div');
      card.className='card subtle reclamada';
      card.innerHTML = `<div class="grid">
        <label>Razão social / Nome <input name="reclamada_nome" value="${escapeHtml(r.nome||'')}"></label>
        <label>CNPJ/CPF <input name="reclamada_doc" value="${escapeHtml(r.doc||'')}"></label>
        <label>Endereço <input name="reclamada_end" value="${escapeHtml(r.end||'')}"></label>
        <label>E-mail <input name="reclamada_email" value="${escapeHtml(r.email||'')}" type="email"></label>
        <label>Telefone <input name="reclamada_tel" value="${escapeHtml(r.tel||'')}"></label>
        <label>CEP <input name="reclamada_cep" value="${escapeHtml(r.cep||'')}"></label>
      </div><div class="row end"><button type="button" class="mini danger btnRemoveReclamada">remover</button></div>`;
      wrap.appendChild(card);
    }); }
    $('#adm') && ($('#adm').value = d.contrato?.adm||'');
    $('#saida') && ($('#saida').value = d.contrato?.saida||'');
    $('#funcao') && ($('#funcao').value = d.contrato?.funcao||'');
    $('#salario') && ($('#salario').value = d.contrato?.salario||'');
    $('#jornada') && ($('#jornada').value = d.contrato?.jornada||'');
    $('#controlePonto') && ($('#controlePonto').value = d.contrato?.controlePonto||'');
    $('#desligamento') && ($('#desligamento').value = d.contrato?.desligamento||'');
    $('#fatos') && ($('#fatos').value = d.fatos||'');
    $('#fundamentos') && ($('#fundamentos').value = d.fundamentos||'');
    pedidosWrap && (pedidosWrap.innerHTML=''); (d.pedidos||[]).forEach(p=>{
      addPedido(p.titulo);
      const last = $$('.pedido').slice(-1)[0];
      $('.pedido-detalhe', last) && ($('.pedido-detalhe', last).value = p.detalhe||'');
      const cont = $('.subpedidos', last);
      (p.subpedidos||[]).forEach(s=> addSubpedido(cont, s));
    });
    provasWrap && (provasWrap.innerHTML=''); (d.provas||[]).forEach(p=> addProva(p));
    buildValoresFromPedidos(); toast('Rascunho carregado');
  }

  // ============= Lint e tokens
  function estimateTokens(str){ return Math.ceil((str||'').length/4); }
  function runLint({ d, promptText, iaText }){
    const issues=[];
    if(!d.reclamante?.nome) issues.push('• Nome do reclamante ausente.');
    if(!d.reclamadas?.length || !d.reclamadas[0]?.nome) issues.push('• Ao menos uma reclamada é obrigatória.');
    if(!d.fatos) issues.push('• Descrever os fatos.');
    if(!d.pedidos?.length) issues.push('• Incluir ao menos um pedido.');
    if(d.valorCausa<=0) issues.push('• Valor da causa não informado (recomendado estimar).');
    issues.push(`• Tokens ~ prompt: ${estimateTokens(promptText)} | resposta: ${estimateTokens(iaText||'')}`);
    return issues;
  }
  function fillLint(items){ if(!lintList) return; lintList.innerHTML=''; items.forEach(i=>{ const li=document.createElement('li'); li.textContent=i; lintList.appendChild(li); }); }
  function updateTokenInfo(prompt, ia){ const el=$('#tokenInfo'); if(el) el.textContent = `~${estimateTokens(prompt)}t prompt / ~${estimateTokens(ia)}t resp.`; }

  // ============= Export PDF/DOCX
  btnExportPdf?.addEventListener('click', ()=>{
    const text = (saidaIa?.value || saida?.value || '').trim(); if(!text){ toast('Nada para exportar','warn'); return; }
    if(!window.jspdf?.jsPDF){ toast('jsPDF não encontrado','warn'); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF({unit:'pt', format:'a4'});
    const lines = doc.splitTextToSize(text, 515); let y=48; doc.setFontSize(12);
    for(const l of lines){ if(y>780){ doc.addPage(); y=48; } doc.text(l, 48, y); y+=16; }
    doc.save('peticao-inicial.pdf'); toast('PDF exportado');
  });
  btnExportDocx?.addEventListener('click', async ()=>{
    if(!window.docx?.Document){ toast('docx lib não encontrada','warn'); return; }
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, LevelFormat } = window.docx;
    const d = collectAll();
    const numbering = { config: [{ reference:'pedidos', levels:[
      { level:0, format:LevelFormat.DECIMAL, text:'%1)', alignment:AlignmentType.START },
      { level:1, format:LevelFormat.DECIMAL, text:'%1.%2)', alignment:AlignmentType.START } ] }] };
    const P = (t,opts={})=> new Paragraph({ children:[ new TextRun({text:t}) ], ...opts });
    const H = (t,l=HeadingLevel.HEADING_2)=> new Paragraph({ text:t.toUpperCase(), heading:l, spacing:{ after:120 } });
    const Just = (t)=> P(t, { alignment:AlignmentType.JUSTIFIED, spacing:{ after:120 } });
    const reclams = d.reclamadas.map((r,i)=>`${i+1}. ${r.nome||'—'}${r.doc?`, ${r.doc}`:''}${r.end?`, ${r.end}`:''}`).join(' ');
    const children = [];
    children.push(new Paragraph({ text:`AO JUÍZO DA ${d.juizo}`.toUpperCase(), alignment:AlignmentType.CENTER, spacing:{ after:200 } }));
    children.push(H('Qualificação'));
    children.push(Just(`Reclamante: ${d.reclamante.nome || '—'}.`));
    children.push(Just(`Reclamadas: ${reclams||'—'}.`));
    children.push(H('Do Contrato'));
    children.push(Just(`Admissão: ${d.contrato.adm||'—'}; Saída: ${d.contrato.saida||'—'}; Função: ${d.contrato.funcao||'—'}; Salário: ${d.contrato.salario?`R$ ${d.contrato.salario}`:'—'}; Jornada: ${d.contrato.jornada||'—'}; Controle de ponto: ${d.contrato.controlePonto||'—'}; Desligamento: ${d.contrato.desligamento||'—'}.`));
    children.push(H('Dos Fatos'));
    children.push(Just(d.fatos||'—'));
    children.push(H('Dos Fundamentos'));
    children.push(Just(d.fundamentos||'—'));
    children.push(H('Dos Pedidos'));
    (d.pedidos||[]).forEach(p=>{
      children.push(new Paragraph({ numbering:{reference:'pedidos', level:0}, children:[ new TextRun({ text:`${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}` }) ] }));
      (p.subpedidos||[]).forEach(sp=> children.push(new Paragraph({ numbering:{reference:'pedidos', level:1}, children:[ new TextRun({text:sp}) ] })));
    });
    children.push(H('Provas'));
    children.push(Just(`Protesta provar o alegado por todos os meios em direito admitidos, notadamente: ${d.provas.join('; ') || 'documentos anexos e prova testemunhal'}.`));
    if(d.justicaGratuita) children.push(Just('Requer os benefícios da justiça gratuita (CLT art. 790, §3º).'));
    if(d.honorarios) children.push(Just('Requer honorários de sucumbência (CLT art. 791-A).'));
    children.push(H('Valor da Causa'));
    children.push(Just(fmtBRL(d.valorCausa)));
    children.push(H('Requerimentos Finais'));
    children.push(Just('Requer notificação/citação das reclamadas para audiência e resposta, sob pena de revelia e confissão; a total procedência; correção monetária e juros legais; e demais cominações.'));
    children.push(new Paragraph({ text: new Date().toLocaleDateString('pt-BR') + '.', alignment:AlignmentType.RIGHT, spacing:{ before:200, after:120 } }));
    children.push(new Paragraph({ text: '__________________________________', alignment:AlignmentType.CENTER }));
    children.push(new Paragraph({ text: 'Advogado (OAB nº)', alignment:AlignmentType.CENTER }));
    const doc = new Document({ numbering, sections:[{ properties:{}, children }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='peticao-inicial.docx'; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1500); toast('DOCX exportado');
  });

  // ============= Calculadora (tradicional + IA)
  const calcModal = $('#calcModal'), btnCalc = $('#btnCalc'), calcClose = $('#calcClose'), calcApply = $('#calcApply');
  const c_sal=$('#c_sal'), c_sem=$('#c_sem'), c_meses=$('#c_meses'), c_he50=$('#c_he50'), c_he100=$('#c_he100'), c_not=$('#c_not'), c_not_perc=$('#c_not_perc'), c_uteis=$('#c_uteis'), c_desc=$('#c_desc');
  const c_hora=$('#c_hora'), c_val_he=$('#c_val_he'), c_val_not=$('#c_val_not'), c_val_dsr=$('#c_val_dsr'), c_total_mes=$('#c_total_mes'), c_total_per=$('#c_total_per');
  btnCalc?.addEventListener('click', ()=>{
    if(!(c_sal?.value||'').trim()){ const sal = parseFloat(($('#salario')?.value||'').replace(',','.'))||0; if(c_sal && sal>0) c_sal.value = sal.toFixed(2); }
    calcModal?.classList.remove('hidden'); calcUpdate();
  });
  calcClose?.addEventListener('click', ()=> calcModal?.classList.add('hidden'));
  ;[c_sal,c_sem,c_meses,c_he50,c_he100,c_not,c_not_perc,c_uteis,c_desc].forEach(el=> el?.addEventListener('input', calcUpdate));
  function calcUpdate(){
    const sal = parseFloat(c_sal?.value||0)||0, sem = parseFloat(c_sem?.value||44)||44, meses=parseFloat(c_meses?.value||1)||1;
    const h50=parseFloat(c_he50?.value||0)||0, h100=parseFloat(c_he100?.value||0)||0, hNot=parseFloat(c_not?.value||0)||0, pNot=(parseFloat(c_not_perc?.value||20)||20)/100;
    const uteis=parseFloat(c_uteis?.value||22)||22, desc=parseFloat(c_desc?.value||8)||8;
    const hora = sem>0? sal/(sem*4.5):0, valHE=(h50*hora*1.5)+(h100*hora*2), valNot=hNot*hora*pNot, valDSR=uteis>0?(valHE/uteis)*desc:0;
    c_hora && (c_hora.textContent = fmtBRL(hora)); c_val_he && (c_val_he.textContent = fmtBRL(valHE)); c_val_not && (c_val_not.textContent = fmtBRL(valNot));
    c_val_dsr && (c_val_dsr.textContent = fmtBRL(valDSR)); c_total_mes && (c_total_mes.textContent = fmtBRL(valHE+valNot+valDSR)); c_total_per && (c_total_per.textContent = fmtBRL((valHE+valNot+valDSR)*meses));
    return { hora, valHE, valNot, valDSR, totalMes: valHE+valNot+valDSR, totalPer: (valHE+valNot+valDSR)*meses };
  }
  function ensurePedido(titulo, detalhe=''){
    const has = getPedidos().some(p=> p.titulo.toLowerCase()===titulo.toLowerCase());
    if(!has){ addPedido(titulo); const last=$$('.pedido').slice(-1)[0]; $('.pedido-detalhe', last) && ($('.pedido-detalhe', last).value = detalhe); }
  }
  function setValorByTitulo(titulo, valor){
    let row = $$('.valor-item').find(it=> $('.valor-titulo', it)?.value?.toLowerCase()===titulo.toLowerCase());
    if(!row){
      const extra = document.createElement('div');
      extra.className = 'valor-item';
      extra.innerHTML = `<div class="grid"><label>Pedido <input type="text" class="valor-titulo" value="${escapeHtml(titulo)}"/></label><label>Valor estimado (R$)<input type="number" class="valor-num" min="0" step="0.01"/></label></div>`;
      valoresWrap?.appendChild(extra); row = extra;
    }
    const num = $('.valor-num', row); if(num) num.value = (valor||0).toFixed(2);
  }
  calcApply?.addEventListener('click', ()=>{
    const res = calcUpdate();
    ensurePedido('Horas Extras', `Estimativa com base em ${c_he50?.value||0}h (50%) e ${c_he100?.value||0}h (100%) por mês, divisor ${c_sem?.value||44}×4,5.`);
    ensurePedido('Adicional Noturno', `Estimativa sobre ${c_not?.value||0}h/mês com ${c_not_perc?.value||20}%`);
    ensurePedido('DSR sobre Horas Extras', `Método proporcional (extras/dias úteis × descansos)`);
    buildValoresFromPedidos();
    setValorByTitulo('Horas Extras', res.valHE * (parseFloat(c_meses?.value||1)||1));
    setValorByTitulo('Adicional Noturno', res.valNot * (parseFloat(c_meses?.value||1)||1));
    setValorByTitulo('DSR sobre Horas Extras', res.valDSR * (parseFloat(c_meses?.value||1)||1));
    sumValores(); calcModal?.classList.add('hidden'); toast('Valores estimados aplicados');
  });

  // Cálculo por IA (usa docsText e inputs da calculadora)
  const btnCalcIA = $('#calcApplyIA');
  btnCalcIA?.addEventListener('click', async ()=>{
    const cfg = loadCfg(); if(!cfg.apiKey){ toast('Cole sua OpenAI API key em Configurar IA','bad'); modal?.classList.remove('hidden'); return; }
    try{
      loading?.classList.remove('hidden');
      const base = collectAll();
      const calcInputs = { salario: $('#salario')?.value, he50: c_he50?.value, he100: c_he100?.value, noturno_horas: c_not?.value, perc_noturno: c_not_perc?.value, divisor_semanal: c_sem?.value, meses: c_meses?.value };
      const prompt = `Você é perito/advogado trabalhista. A partir dos dados abaixo, estime valores para Horas Extras (50%/100%), Adicional Noturno e DSR sobre HE.
- Use metodologia padrão (valor-hora = salário/(semanal*4,5); DSR proporcional).
- Considere também os DOCUMENTOS transcritos (ponto/holerites).
- Retorne um JSON com campos: {hora, valHE, valNot, valDSR, totalMes, totalPer, explicacao}.

[DADOS FORMULÁRIO]
${JSON.stringify(base, null, 2)}

[ENTRADAS CALCULADORA]
${JSON.stringify(calcInputs, null, 2)}

[DOCUMENTOS TRANSCRITOS]
${state.docsText || '(sem docs)'}`;
      const text = await callOpenAI({ prompt, cfg });
      let j=null; try{ j = JSON.parse(text); }catch{}
      if(!j){ toast('IA não retornou JSON válido; revise os dados','warn'); return; }
      // aplica
      ensurePedido('Horas Extras', 'Estimativa (IA)');
      ensurePedido('Adicional Noturno', 'Estimativa (IA)');
      ensurePedido('DSR sobre Horas Extras', 'Estimativa (IA)');
      buildValoresFromPedidos();
      setValorByTitulo('Horas Extras', Number(j.valHE)*(parseFloat(c_meses?.value||1)||1));
      setValorByTitulo('Adicional Noturno', Number(j.valNot)*(parseFloat(c_meses?.value||1)||1));
      setValorByTitulo('DSR sobre Horas Extras', Number(j.valDSR)*(parseFloat(c_meses?.value||1)||1));
      sumValores(); calcModal?.classList.add('hidden');
      toast('Cálculo aplicado pela IA');
    }catch(e){ toast('Erro no cálculo por IA','bad'); }finally{ loading?.classList.add('hidden'); }
  });

  // ============= Review/Validar
  function validateStep(s){
    if(s===0){
      const ok = $('#cidade')?.value && $('#uf')?.value; if(!ok) toast('Informe cidade e UF','warn'); return !!ok;
    }
    if(s===1){
      const ok = $('#reclamante_nome')?.value && $('input[name="reclamada_nome"]')?.value;
      if(!ok) { toast('Informe reclamante e ao menos uma reclamada','warn'); return false; }
    }
    if(s===3){ if(!$('#fatos')?.value.trim()){ toast('Descreva os fatos','warn'); return false; } }
    if(s===4){ if(getPedidos().length===0){ toast('Adicione pelo menos 1 pedido','warn'); return false; } }
    return true;
  }
  function buildReview(){
    const d = collectAll();
    const resumo = [
      `Juízo: ${d.juizo}`,
      `Reclamante: ${d.reclamante.nome}`,
      `Reclamadas: ${d.reclamadas.map(r=>r.nome).join('; ')}`,
      `Contrato: adm ${d.contrato.adm||'-'} / saída ${d.contrato.saida||'-'}; função ${d.contrato.funcao||'-'}; salário ${d.contrato.salario||'-'}; jornada ${d.contrato.jornada||'-'}; controle ${d.contrato.controlePonto||'-'}; desligamento ${d.contrato.desligamento||'-'}`,
      '',
      `Fatos:\n${d.fatos}`,
      '',
      `Pedidos:\n${d.pedidos.map((p,i)=>`${i+1}) ${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}`).join('\n')}`,
      '',
      `Fundamentos:\n${d.fundamentos||'-'}`,
      '',
      `Provas: ${d.provas.join('; ')||'-'}`,
      `Justiça gratuita: ${d.justicaGratuita?'Sim':'Não'} | Honorários: ${d.honorarios?'Sim':'Não'}`,
      `Valor da Causa: ${fmtBRL(d.valorCausa)}`
    ].join('\n');
    reviewBox && (reviewBox.textContent = resumo);
  }

  // ============= Autosave + auditoria de campo
  let autosaveTimer=null, fieldAuditTimer=null;
  document.addEventListener('input', (e)=>{
    if(e.target.closest('#formPeticao')){
      clearTimeout(fieldAuditTimer);
      const name = e.target.id || e.target.name || e.target.className || e.target.tagName;
      const val = (e.target.value ?? '').toString().slice(0,300);
      fieldAuditTimer = setTimeout(()=> addAudit('FIELD', { field: name, value: val }), 800);
      clearTimeout(autosaveTimer); autosaveTimer = setTimeout(()=> saveVersion('autosave'), 600);
    }
  });
});
