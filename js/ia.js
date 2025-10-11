/* ia.js — geração de prompt, chamada OpenAI, refinamento */
(function(){
  const { $, state, toast, fmtBRL } = window.Clara;
  const saida = $('#saida'), saidaIa = $('#saidaIa');
  const modal = $('#modal'); const apiKeyInput = $('#apiKey'), modelInput = $('#model'), temperatureInput = $('#temperature'), maxTokensInput = $('#maxTokens'), currentUserInput = $('#currentUser');

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
      apiKey: (apiKeyInput?.value||'').trim(),
      model: modelInput?.value || 'gpt-4o-mini',
      temperature: Number(temperatureInput?.value||0.2),
      maxTokens: Number(maxTokensInput?.value||2048),
      user: (currentUserInput?.value||'').trim()
    };
    localStorage.setItem('openai_cfg', JSON.stringify(cfg));
    toast('Configuração salva','good'); modal?.classList.add('hidden');
  }
  $('#btnConfig')?.addEventListener('click', ()=>{ loadCfg(); modal?.classList.remove('hidden'); });
  $('#closeConfig')?.addEventListener('click', ()=> modal?.classList.add('hidden'));
  $('#saveConfig')?.addEventListener('click', saveCfg);

  function collectAll(){
    const d = window.Clara.collect?.();
    return d || {};
  }

  function buildPrompt(d){
    const reclams = (d.reclamadas||[]).map((r,i)=>`${i+1}. ${r.nome}${r.doc?`, ${r.doc}`:''}${r.end?`, ${r.end}`:''}`).join('\n');
    return `Você é ADVOGADO TRABALHISTA no Brasil.
Redija uma PETIÇÃO INICIAL TRABALHISTA COMPLETA.

[JUÍZO] ${d.juizo}
[QUALIFICAÇÃO] Reclamante: ${d.reclamante?.nome}.
Reclamadas: 
${reclams||'-'}

[CONTRATO] Admissão: ${d.contrato?.adm||'-'}; Saída: ${d.contrato?.saida||'-'}; Função: ${d.contrato?.funcao||'-'}; Salário: ${d.contrato?.salario?`R$ ${d.contrato.salario}`:'-'}; Jornada: ${d.contrato?.jornada||'-'}; Controle: ${d.contrato?.controlePonto||'-'}; Desligamento: ${d.contrato?.desligamento||'-'}.
[FATOS]
${d.fatos||'-'}

[FUNDAMENTOS]
${d.fundamentos||'-'}

[PEDIDOS]
${(d.pedidos||[]).map((p,i)=>`${i+1}) ${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}${(p.subpedidos||[]).length?`\n  ${(p.subpedidos||[]).map((s,j)=>`${i+1}.${j+1}) ${s}`).join('\n  ')}`:''}`).join('\n')}

[PROVAS] ${(d.provas||[]).join('; ')||'documentos e testemunhas'}
[VALOR DA CAUSA] ${fmtBRL(d.valorCausa||0)}

Modelo PDF (estilo): ${state.tplText || '(sem modelo)'}
Docs/Anexos: ${state.docsText || '(sem docs)'}`.trim();
  }

  async function callOpenAI({ prompt, cfg }){
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const body = {
      model: cfg.model || 'gpt-4o-mini',
      temperature: isNaN(cfg.temperature)?0.2:cfg.temperature,
      max_tokens: isNaN(cfg.maxTokens)?2048:cfg.maxTokens,
      messages: [
        { role: 'system', content: 'Você é um advogado trabalhista brasileiro sênior.' },
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

  async function gerarPrompt(){
    const d = window.Clara.collect?.(); const p = buildPrompt(d);
    if(saida) saida.value = p;
    window.Clara.ui?.showResultado();
    window.Clara.review?.lintAndTokens(p, '');
    window.Clara.history?.saveVersion('gerar_prompt');
    window.Clara.toast('Prompt gerado');
  }

  async function gerarIA(){
    const d = window.Clara.collect?.(); const p = buildPrompt(d);
    if(saida) saida.value = p;
    window.Clara.ui?.showResultado();
    const cfg = loadCfg(); if(!cfg.apiKey){ toast('Cole sua OpenAI API key em Configurar IA','bad'); document.getElementById('modal')?.classList.remove('hidden'); return; }
    try{
      document.getElementById('loading')?.classList.remove('hidden');
      const text = await callOpenAI({ prompt: p, cfg });
      if(saidaIa) saidaIa.value = text||'(sem conteúdo)';
      window.Clara.review?.lintAndTokens(p, text);
      window.Clara.history?.saveVersion('gerar_ia');
      toast('Petição gerada com IA');
    }catch(err){
      if(saidaIa) saidaIa.value = `Falha ao gerar com ChatGPT: ${err?.message||err}`;
      toast('Erro ao gerar','bad');
    }finally{ document.getElementById('loading')?.classList.add('hidden'); }
  }

  async function refinarIA(){
    const base = (saidaIa?.value||'').trim();
    if(!base){ toast('Gere o texto com ChatGPT antes','warn'); return; }
    const instr = prompt('Como refinar?');
    if(!instr) return;
    const cfg = loadCfg(); if(!cfg.apiKey){ toast('Cole sua OpenAI API key em Configurar IA','bad'); document.getElementById('modal')?.classList.remove('hidden'); return; }
    try{
      document.getElementById('loading')?.classList.remove('hidden');
      const text = await callOpenAI({ prompt: `Refine juridicamente o texto conforme: [${instr}]\n\nTexto:\n${base}\n\nDevolva somente o texto final.`, cfg });
      if(text) saidaIa.value = text;
      toast('Texto refinado');
    }catch{ toast('Erro ao refinar','bad'); }finally{ document.getElementById('loading')?.classList.add('hidden'); }
  }

  window.Clara.ia = { loadCfg, saveCfg, buildPrompt, callOpenAI, gerarPrompt, gerarIA, refinarIA };
})();
