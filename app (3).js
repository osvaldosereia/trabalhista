/* Clara – App JS (light theme, toasts, valores fix, uploads & suggestions) */
(() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const fmt = v => v.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const unfmt = s => Number(String(s).replace(/[^\d,-]/g,'').replace('.','').replace(',','.'))||0;

  const toasts = $('#toasts');
  function toast(msg, type='good', t=3000){
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(()=>{ el.remove(); }, t);
  }

  $('#btnTheme').addEventListener('click', () => {
    document.body.classList.toggle('theme-dark');
    const dark = document.body.classList.contains('theme-dark');
    $('#btnTheme').textContent = 'Tema: ' + (dark ? 'Escuro' : 'Claro');
  });

  const state = {
    step: 0, pedidos: [], valores: {}, docsText: '', tplText: '',
    config: JSON.parse(localStorage.getItem('cfg')||'{}')
  };

  const fatosSug = [
    "Jornada superior a 8h diárias sem pagamento de HE",
    "Intervalo intrajornada suprimido total/parcial",
    "Adicional noturno não quitado","Desvio/acúmulo de função",
    "Assédio moral com testemunhas","Rescisão indireta por falta grave do empregador",
    "Equiparação salarial com paradigma indicado","Horas in itinere (casos antigos)",
  ];
  const fundamentosSug = [
    "CF/88, art. 7º, XIII e XVI","CLT, arts. 58, 59, 71, 73, 74 §2º, 818",
    "Súmula TST 85 (compensação)","Súmula TST 338 (ponto)","Súmula TST 437 (intervalo)",
    "Súmula TST 264 (HE)","Súmula TST 90 (in itinere)","OJ 415 (reflexos)",
    "Lei 605/49 (DSR)","Lei 8.036/90 (FGTS)"
  ];
  const pedidosSug = [
    "Horas Extras 50%","Horas Extras 100%","Intervalo Intrajornada","Adicional Noturno",
    "Reflexos (DSR, 13º, férias+1/3, FGTS+40%)","FGTS + 40%","Multa do art. 477","Multa do art. 467",
    "Adicional de Insalubridade","Adicional de Periculosidade","Dano Moral","Equiparação Salarial"
  ];

  function mountSuggestions(){
    const fsel = $('#fatosSug'); fatosSug.forEach(s => { const o=document.createElement('option'); o.textContent=s; fsel.appendChild(o); });
    const fundSel = $('#fundSelect'); fundamentosSug.forEach(s => { const o=document.createElement('option'); o.textContent=s; fundSel.appendChild(o); });
    const chips = $('#pedidoChips');
    pedidosSug.forEach(p => { const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=p; b.addEventListener('click',()=>addPedido(p)); chips.appendChild(b); });
  }

  const stepsEls = $$('#stepsList li');
  function setStep(n){
    state.step = Math.max(0, Math.min(8, n));
    $$('#wizard .step').forEach((f,i)=>f.classList.toggle('hidden', i!==state.step));
    stepsEls.forEach((li,i)=>li.classList.toggle('active', i===state.step));
    $('#progress span').style.width = (state.step/8*100)+'%';
  }
  $('#btnIniciar').onclick = ()=>{ $('#intro').classList.add('hidden'); $('#wizard').classList.remove('hidden'); setStep(0); toast('Novo caso iniciado','good'); };
  $('#btnPrev').onclick = ()=> setStep(state.step-1);
  $('#btnNext').onclick = ()=> setStep(state.step+1);

  $('#addReclamada').onclick = () => {
    const tpl = document.createElement('div');
    tpl.className='card subtle reclamada';
    tpl.innerHTML = $('#reclamadasWrap .reclamada').innerHTML;
    tpl.querySelector('.btnRemoveReclamada').onclick = ()=> tpl.remove();
    $('#reclamadasWrap').appendChild(tpl);
  };
  $$('.btnRemoveReclamada').forEach(b=> b.onclick = (e)=> e.currentTarget.closest('.reclamada').remove());

  function addPedido(nome=''){
    const wrap = $('#pedidosWrap');
    const d = document.createElement('div');
    d.className='pedido';
    d.innerHTML = `
      <div class="grid">
        <label>Pedido <input name="p_nome" value="${nome}"></label>
        <label>Base legal <input name="p_base" placeholder="Ex.: CLT art. 71; Súmula 437"></label>
      </div>
      <div class="subpedido-row">
        <input name="p_desc" placeholder="Descrição adicional" style="flex:1">
        <input name="p_val" placeholder="Valor estimado (R$)" style="width:220px">
        <button type="button" class="mini danger">remover</button>
      </div>`;
    d.querySelector('.danger').onclick = ()=>{ d.remove(); rebuildValores(); };
    d.querySelector('[name=p_val]').addEventListener('input', rebuildValores);
    wrap.appendChild(d);
    rebuildValores();
  }
  $('#addPedido').onclick = ()=> addPedido('');

  function rebuildValores(){
    const vwrap = $('#valoresWrap');
    vwrap.innerHTML = '';
    let total = 0;
    $$('#pedidosWrap .pedido').forEach((p,i)=>{
      const nome = p.querySelector('[name=p_nome]').value || `Pedido ${i+1}`;
      const val = unfmt(p.querySelector('[name=p_val]').value);
      total += val;
      const row = document.createElement('div');
      row.className='row between';
      row.innerHTML = `<div>${nome}</div><div>${fmt(val)}</div>`;
      vwrap.appendChild(row);
    });
    $('#valorCausa').textContent = fmt(total);
  }

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

  $('#docUpload').addEventListener('change', async (e)=>{
    let acc='';
    const files = Array.from(e.target.files||[]);
    for(const f of files){
      if(f.type==='application/pdf'){ acc += await pdfToText(f); toast(`PDF lido: ${f.name}`,'good'); }
      else if(f.type.startsWith('text/')){ acc += await f.text(); toast(`TXT lido: ${f.name}`,'good'); }
      else { toast(`Tipo não suportado: ${f.name}`,'warn'); }
    }
    state.docsText = acc.slice(0, 120000);
  });

  $('#tplPdf').addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    if(f.type!=='application/pdf'){ toast('Envie um PDF de modelo','warn'); return; }
    state.tplText = (await pdfToText(f)).slice(0, 60000);
    toast('Modelo PDF processado','good');
  });

  $('#fundSelect').addEventListener('change', ()=>{
    const linhas = Array.from($('#fundSelect').selectedOptions).map(o=>o.value);
    $('#fundamentos').value = Array.from(new Set((($('#fundamentos').value||'').split('\n').concat(linhas)).filter(Boolean))).join('\n');
  });
  $('#fatosSug').addEventListener('change', ()=>{
    const textos = Array.from($('#fatosSug').selectedOptions).map(o=>'• '+o.value);
    const cur = $('#fatos').value ? $('#fatos').value + "\n" : "";
    $('#fatos').value = cur + textos.join('\n');
  });

  function buildPrompt(){
    const partes = {
      juizo: {num: $('#juizoNum').value, cidade: $('#cidade').value, uf: $('#uf').value},
      recl: {nome: $('#reclamante_nome').value, estado: $('#reclamante_estado_civil').value, prof: $('#reclamante_prof').value},
      recladas: $$('#reclamadasWrap .reclamada').map(r=> ({ nome: r.querySelector('[name=reclamada_nome]').value, doc:  r.querySelector('[name=reclamada_doc]').value })),
      contrato: {adm: $('#adm').value, saida: $('#saida').value, funcao: $('#funcao').value, salario: $('#salario').value, jornada: $('#jornada').value, controle: $('#controlePonto').value, deslig: $('#desligamento').value},
      fatos: $('#fatos').value,
      pedidos: $$('#pedidosWrap .pedido').map(p=> ({ nome: p.querySelector('[name=p_nome]').value, base: p.querySelector('[name=p_base]').value, desc: p.querySelector('[name=p_desc]').value, val:  p.querySelector('[name=p_val]').value })),
      fundamentos: $('#fundamentos').value,
      valores:{valorCausa: $('#valorCausa').textContent, grat: $('#justicaGratuita').checked, honor: $('#honorarios').checked},
      anexos:{modeloPdf: state.tplText? 'sim':'não', docsLen: state.docsText.length}
    };

    return `ATUE COMO ADVOGADO TRABALHISTA SÊNIOR.
Use o TEMPLATE (se houver) APENAS COMO ESTILO. Faça a peça inicial completa, estruturada e fundamentada.

DADOS DO CASO:
${'${'}JSON.stringify(partes, null, 2){'}'}

SE HOUVER MODELO PDF (abaixo), OBSERVE TÍTULOS/ESTILO, NÃO COPIE ERROS:
<<<MODELO_PDF_INSPIRACAO>>>
${'${'}state.tplText || '(sem modelo)'{'}'}
<<<FIM_MODELO>>>

SE HOUVER DOCUMENTOS (holerites/ponto/etc), RESUMA E CONSISTENTIZE COM OS FATOS/PEDIDOS:
<<<DOCUMENTOS_TRANSCRITOS>>>
${'${'}state.docsText || '(sem docs)'{'}'}
<<<FIM_DOCS>>>

INSTRUÇÕES:
- Estruture com endereçamento, qualificação, fatos, fundamentos, pedidos, valor da causa e requerimentos finais.
- Use linguagem clara, técnica e objetiva.
- Numere itens e pedidos; destaque bases legais (CLT, CF/88, súmulas).
- Calcule valores quando possível com os dados fornecidos ou explique a metodologia.
- Inclua bloco de provas e protestos.
- Saída em texto puro, sem markdown.`;
  }

  $('#btnGerar').onclick = ()=> { $('#saida').value = buildPrompt(); toast('Prompt gerado','good'); };

  async function callOpenAI(prompt){
    const cfg = {
      apiKey: $('#apiKey').value || state.config.apiKey,
      model: $('#model').value || state.config.model || 'gpt-4o-mini',
      temperature: Number($('#temperature').value||0.2),
      max_tokens: Number($('#maxTokens').value||1600)
    };
    if(!cfg.apiKey){ toast('Cole sua API key em Configurar IA','bad'); throw new Error('No API key'); }

    const body = { model: cfg.model, messages: [{role:'user', content: prompt}], temperature: cfg.temperature, max_tokens: cfg.max_tokens };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST', headers: {'Authorization':`Bearer ${cfg.apiKey}`,'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const j = await res.json().catch(()=>({}));
      throw new Error(`HTTP ${res.status} – ${JSON.stringify(j,null,2)}`);
    }
    const j = await res.json();
    return j.choices?.[0]?.message?.content || '';
  }

  $('#btnGerarIA').onclick = async ()=>{
    try{
      $('#loading').classList.remove('hidden');
      const prompt = buildPrompt();
      $('#saida').value = prompt;
      const text = await callOpenAI(prompt);
      $('#saidaIa').value = text;
      toast('IA gerou a peça','good');
      setStep(8);
      $('#wizard').classList.add('hidden');
      $('#resultado').classList.remove('hidden');
    }catch(e){
      $('#saidaIa').value = 'Falha ao gerar com ChatGPT: ' + e.message;
      toast('Erro ao gerar: verifique quota/chave','bad');
    }finally{
      $('#loading').classList.add('hidden');
    }
  };

  $('#btnConfig').onclick = ()=> $('#modal').classList.remove('hidden');
  $('#closeConfig').onclick = ()=> $('#modal').classList.add('hidden');
  $('#saveConfig').onclick = ()=>{
    state.config = { apiKey: $('#apiKey').value, model: $('#model').value, temperature: $('#temperature').value, maxTokens: $('#maxTokens').value };
    localStorage.setItem('cfg', JSON.stringify(state.config));
    $('#modal').classList.add('hidden');
    toast('Configuração salva','good');
  };

  $('#voltar').onclick = ()=>{ $('#resultado').classList.add('hidden'); $('#wizard').classList.remove('hidden'); setStep(8); };

  mountSuggestions();
  if(state.config.apiKey){ $('#apiKey').value = state.config.apiKey; }
  if(state.config.model){ $('#model').value = state.config.model; }
  setStep(0);
})();