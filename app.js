
document.addEventListener('DOMContentLoaded', () => {
  // ===== helpers
  function $(q, el=document){ return el.querySelector(q); }
  function $all(q, el=document){ return [...el.querySelectorAll(q)]; }
  const fmtBRL = (n) => (isNaN(n)?0:n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const sanitize = (s='') => String(s||'').trim();
  function escapeHtml(s){ return String(s).replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])); }
  // toast fallback (prevents ReferenceError if missing)
  window.toast = window.toast || ((m)=>console.log('[toast]', m));

  // ===== Versões (histórico)
  const VKEY = 'peticao_versions_v1';    // localStorage key
  const VMAX = 20;                       // limite de versões
  function nowISO(){ return new Date().toISOString(); }
  function shortTime(iso){ const d=new Date(iso); return d.toLocaleString('pt-BR'); }
  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
  function loadVersions(){ return JSON.parse(localStorage.getItem(VKEY)||'[]'); }
  function saveVersions(list){ localStorage.setItem(VKEY, JSON.stringify(list)); }

  // ===== Auditoria
  const AUDIT_KEY = 'audit_log_v1';
  function loadAudit(){ return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]'); }
  function saveAudit(list){ localStorage.setItem(AUDIT_KEY, JSON.stringify(list)); }
  function auditNow(){ return new Date().toISOString(); }
  function curUser(){ return (JSON.parse(localStorage.getItem('openai_cfg')||'{}').user)||$('#currentUser')?.value||''; }
  function addAudit(type, payload){
    const list = loadAudit();
    list.unshift({ id: crypto.randomUUID?.()||String(Date.now()+Math.random()), at: auditNow(), user: curUser()||'—', type, payload });
    saveAudit(list);
  }

  // ===== presets jurídicos (fundamentos/súmulas por pedido)
  const FUNDAMENTOS_MAP = {
    "Horas Extras": [
      "CF/88 art. 7º, XIII e XVI",
      "CLT arts. 58, 59 e 74 §2º",
      "Súmulas TST 264, 338, 376 I/II, 85 (compensação)",
    ],
    "Intervalo Intrajornada": [
      "CLT art. 71 e §4º",
      "Súmula TST 437 I–IV",
    ],
    "Adicional Noturno": [
      "CLT arts. 73 e 244 §3º",
      "Súmula TST 60",
    ],
    "Insalubridade": [
      "CLT arts. 189–192",
      "NR-15 (Anexos) – MTE",
      "Súmula TST 289, OJ SDI-1 173",
    ],
    "Periculosidade": [
      "CLT art. 193",
      "NR-16 – MTE",
      "Súmula TST 361",
    ],
    "FGTS + 40%": [
      "Lei 8.036/90 arts. 15 e 18 §1º",
      "CF/88 art. 7º, III",
    ],
    "Multa 477 CLT": [
      "CLT art. 477 §6º e §8º",
    ],
    "Seguro-desemprego": [
      "Lei 7.998/90",
      "Resolução CODEFAT 467/2005",
    ],
    "Dano Moral": [
      "CF/88 art. 5º, V e X",
      "CC arts. 186 e 927",
      "Súmula TST 392 (competência JT)",
    ]
  };

  // ===== templates por tipo de ação
  const TEMPLATES = {
    horas_extras: {
      fatos: `O reclamante laborava em jornada superior à contratual, com habitual extrapolação de 8h diárias e 44h semanais, sem o devido pagamento das horas extras e reflexos. Os cartões de ponto apresentam inconsistências e horários invariáveis.`,
      pedidos: [
        { t: "Horas Extras", d: "Pagamento de horas excedentes à 8ª diária e 44ª semanal, adicional de 50%/100% (dom/fer.)" },
      ],
      fundamentos: [
        "CF/88 art. 7º, XIII e XVI",
        "CLT arts. 58, 59 e 74 §2º",
        "Súmulas TST 264, 338, 376 I/II, 85"
      ],
      provas: ["Cartões/pontos", "Contracheques", "Testemunhas"]
    },
    rescisao_indireta: {
      fatos: `A reclamada cometeu faltas graves (mora contumaz salarial/assédio/descumprimento contratual), inviabilizando a continuidade do vínculo. O reclamante notificou a empresa, sem solução.`,
      pedidos: [
        { t: "Rescisão Indireta", d: "Reconhecimento (CLT art. 483) com verbas rescisórias de dispensa sem justa causa" }
      ],
      fundamentos: [
        "CLT art. 483 (alíneas)",
        "CF/88 art. 7º",
        "Súmulas TST pertinentes"
      ],
      provas: ["Notificações", "Conversas/prints", "Testemunhas"]
    },
    equiparacao: {
      fatos: `O reclamante exerceu as mesmas funções de paradigma, com igual produtividade e perfeição técnica, no mesmo estabelecimento, sem percepção do mesmo salário.`,
      pedidos: [
        { t: "Equiparação Salarial", d: "Diferenças salariais + reflexos desde a data-base, observada a prescrição quinquenal" }
      ],
      fundamentos: [
        "CF/88 art. 7º, XXX",
        "CLT art. 461",
        "Súmulas TST 6 e 68"
      ],
      provas: ["Organograma", "Fichas funcionais", "Testemunhas"]
    },
    assedio_moral: {
      fatos: `O reclamante sofreu condutas reiteradas de humilhação/isolamento/ameaças por superiores, em ambiente de trabalho, causando abalo à dignidade e saúde.`,
      pedidos: [
        { t: "Dano Moral", d: "Indenização por ofensa à dignidade (quantum equitativo), com juros e correção" }
      ],
      fundamentos: [
        "CF/88 art. 5º, V e X",
        "CC arts. 186 e 927",
        "Súmulas TST 392 (competência) e jurisprudência"
      ],
      provas: ["Testemunhas", "E-mails/prints", "Atestados/laudos"]
    }
  };

  // blocos inteligentes → geram pedidos adicionais
  const SMART_BLOCKS = {
    intervalo:      { t: "Intervalo Intrajornada", d: "1h diária (ou 15min) não concedida integralmente; pagamento como hora extra" },
    adicional_noturno:{ t: "Adicional Noturno", d: "Trabalho entre 22h-5h com adicional e redução da hora noturna" },
    insalubridade:  { t: "Insalubridade", d: "Adicional conforme grau apurado em perícia, base legal NR-15" },
    periculosidade: { t: "Periculosidade", d: "Adicional por exposição a agente perigoso, base legal NR-16" },
    reflexos:       { sub: ["Reflexos em DSR", "Reflexos em 13º", "Reflexos em Férias + 1/3", "FGTS + 40%"] },
    multa_477:      { t: "Multa 477 CLT", d: "Atraso no pagamento das verbas rescisórias" },
    fgts40:         { t: "FGTS + 40%", d: "Depósitos fundiários não realizados/corretos; liberação + multa 40%" },
  };

  // ===== Modo Perícia
  const QUESITOS_PRESETS = {
    insalubridade: [
      "Descrever as atividades exercidas pelo reclamante, com indicação de frequência, duração e modo de execução.",
      "Identificar agentes nocivos (químicos, físicos, biológicos) e enquadrar nos Anexos da NR-15.",
      "Informar níveis de exposição medidos e metodologias/técnicas utilizadas.",
      "Esclarecer se havia EPI/EPC eficaz, periodicidade de troca, CA e treinamentos.",
      "Concluir sobre existência de insalubridade (grau) e período(s) afetado(s)."
    ],
    periculosidade: [
      "O reclamante esteve exposto a inflamáveis/eletricidade/explosivos? Descrever operações e distâncias.",
      "As atividades se enquadram na NR-16 (qual anexo/atividade)?",
      "Havia permanência habitual e/ou intermitente em área de risco? Precisar percentuais/tempo.",
      "Existiam medidas de eliminação/neutralização do risco (EPC/EPI)?",
      "Concluir quanto à periculosidade e período(s) correspondente(s)."
    ],
    noturno: [
      "Precisar horários efetivos de início e término da jornada, com base em controles/entrevistas.",
      "Apontar labor em horário noturno (22h–5h) e redução da hora noturna.",
      "Verificar concessão/observância de intervalos intra/entrejornada.",
      "Apurar diferenças de adicional noturno e reflexos, se cabíveis.",
      "Indicar existência de labor em prorrogação noturna após as 5h."
    ]
  };
  const PERICIA_CHECKLIST = {
    insalubridade: [
      "Narrativa contém descrição de agentes e setores.",
      "Pedido inclui adicional e reflexos; requer perícia técnica.",
      "Fundamentos citam CLT 189–192 e NR-15."
    ],
    periculosidade: [
      "Narrativa descreve contato com risco (combustíveis/energia/etc.).",
      "Pedido inclui adicional e reflexos; requer perícia técnica.",
      "Fundamentos citam CLT 193 e NR-16."
    ],
    noturno: [
      "Narrativa (fatos) delimita faixas horárias.",
      "Pedidos incluem adicional noturno e prorrogação.",
      "Fundamentos citam CLT 73 e Súmula TST 60."
    ]
  };

  // ===== Equipe (localStorage)
  const TEAM_TPL_KEY = 'team_templates_v1';
  const TEAM_PACK_KEY = 'team_fund_packs_v1';
  const LOCK_KEY = 'locked_steps_v1';
  function loadTeamTemplates(){ return JSON.parse(localStorage.getItem(TEAM_TPL_KEY)||'[]'); }
  function saveTeamTemplates(list){ localStorage.setItem(TEAM_TPL_KEY, JSON.stringify(list)); }
  function loadPacks(){ return JSON.parse(localStorage.getItem(TEAM_PACK_KEY)||'[]'); }
  function savePacks(list){ localStorage.setItem(TEAM_PACK_KEY, JSON.stringify(list)); }
  function uid(){ return crypto.randomUUID?.() || String(Date.now()+Math.random()); }

  // ===== refs
  const intro = $('#intro');
  const wizard = $('#wizard');
  const resultado = $('#resultado');
  const saida = $('#saida');
  const saidaIa = $('#saidaIa');
  const stepsList = $('#stepsList')?.querySelectorAll('li') || [];
  const progressBar = $('#progress span');

  const btnIniciar = $('#btnIniciar');
  const btnLoadDraft = $('#btnLoadDraft');
  const btnReset = $('#btnReset');
  const btnPrev = $('#btnPrev');
  const btnNext = $('#btnNext');
  const btnSalvar = $('#btnSalvar');
  const btnGerar = $('#btnGerar');
  const btnGerarIA = $('#btnGerarIA');
  const btnVoltar = $('#voltar');
  const btnCopiar = $('#copiar');
  const btnCopiarIa = $('#copiarIa');
  const btnRefinarIa = $('#refinarIa');
  const btnExportPdf = $('#exportPdf');
  const btnExportDocx = $('#exportDocx');

  const btnForense = $('#btnForense');
  const previewDoc = $('#previewDoc');
  const copyHtml = $('#copyHtml');
  const printDoc = $('#printDoc');

  const btnExportJson = $('#btnExportJson');
  const btnImportJson = $('#btnImportJson');
  const lintList = $('#lintList');

  const form = $('#formPeticao');
  const pedidosWrap = $('#pedidosWrap');
  const provasWrap = $('#provasWrap');
  const valoresWrap = $('#valoresWrap');
  const reviewBox = $('#review');

  // Modal config
  const btnConfig = $('#btnConfig');
  const modal = $('#modal');
  const closeConfig = $('#closeConfig');
  const apiKeyInput = $('#apiKey');
  const modelInput = $('#model');
  const temperatureInput = $('#temperature');
  const maxTokensInput = $('#maxTokens');
  const currentUserInput = $('#currentUser');
  const saveConfig = $('#saveConfig');

  // Loading
  const loading = $('#loading');

  // History modal
  const btnHistory = $('#btnHistory');
  const historyModal = $('#historyModal');
  const closeHistory = $('#closeHistory');
  const versionList = $('#versionList');
  const compareA = $('#compareA');
  const compareB = $('#compareB');
  const btnCompare = $('#btnCompare');
  const btnRestore = $('#btnRestore');
  const btnDelete = $('#btnDelete');
  const diffView = $('#diffView');
  const exportHistoryBtn = $('#exportHistory');

  // Equipe modal
  const btnEquipe = $('#btnEquipe');
  const teamModal = $('#teamModal');
  const closeTeam = $('#closeTeam');
  const teamTplList = $('#teamTplList');
  const teamTplNew = $('#teamTplNew');
  const teamTplDelete = $('#teamTplDelete');
  const teamTplApply = $('#teamTplApply');
  const teamTplName = $('#teamTplName');
  const teamTplJson = $('#teamTplJson');
  const teamTplSave = $('#teamTplSave');
  const teamTplExport = $('#teamTplExport');
  const teamTplImport = $('#teamTplImport');
  const teamTplImportBtn = $('#teamTplImportBtn');
  const packList = $('#packList');
  const packNew = $('#packNew');
  const packDelete = $('#packDelete');
  const packApply = $('#packApply');
  const packName = $('#packName');
  const packLines = $('#packLines');
  const packSave = $('#packSave');
  const packExport = $('#packExport');
  const packImport = $('#packImport');
  const packImportBtn = $('#packImportBtn');
  const btnExportAll = $('#btnExportAll');
  const btnImportAll = $('#btnImportAll');

  // Auditoria modal
  const btnAudit = $('#btnAudit');
  const auditModal = $('#auditModal');
  const auditClose = $('#auditClose');
  const auditList = $('#auditList');
  const auditDetail = $('#auditDetail');
  const auditFilter = $('#auditFilter');
  const auditExport = $('#auditExport');
  const auditClear = $('#auditClear');
  const auditCopy = $('#auditCopy');

  // Perícia modal
  const btnPericia = $('#btnPericia');
  const periciaModal = $('#periciaModal');
  const perClose = $('#perClose');
  const perTipo = $('#perTipo');
  const perLoadPreset = $('#perLoadPreset');
  const perAddQ = $('#perAddQ');
  const perQuesitos = $('#perQuesitos');
  const perHonor = $('#perHonor');
  const perAdiant = $('#perAdiant');
  const perObs = $('#perObs');
  const perTotal = $('#perTotal');
  const perApplyToForm = $('#perApplyToForm');
  const perExport = $('#perExport');
  const perChecklist = $('#perChecklist');

  // Calculadora modal
  const btnCalc = $('#btnCalc');
  const calcModal = $('#calcModal');
  const calcClose = $('#calcClose');
  const calcApply = $('#calcApply');
  const c_sal = $('#c_sal'), c_sem = $('#c_sem'), c_meses = $('#c_meses');
  const c_he50 = $('#c_he50'), c_he100 = $('#c_he100'), c_not = $('#c_not'), c_not_perc = $('#c_not_perc');
  const c_uteis = $('#c_uteis'), c_desc = $('#c_desc');
  const c_hora = $('#c_hora'), c_val_he = $('#c_val_he'), c_val_not = $('#c_val_not'), c_val_dsr = $('#c_val_dsr');
  const c_total_mes = $('#c_total_mes'), c_total_per = $('#c_total_per');

  // Dossiê modal
  const btnDossie = $('#btnDossie');
  const dossieModal = $('#dossieModal');
  const dosClose = $('#dosClose');
  const dosBuild = $('#dosBuild');
  const dosCopyHtml = $('#dosCopyHtml');
  const dosPrint = $('#dosPrint');
  const dosPreview = $('#dosPreview');
  const dosDocs = $('#dosDocs');
  const dosAdd = $('#dosAdd');
  const dosOrgao = $('#dosOrgao');
  const dosRef = $('#dosRef');
  const dosResp = $('#dosResp');
  const dosObs = $('#dosObs');

  // Templates em Juízo
  const selTipoAcao = $('#tipoAcao');
  const btnApplyTpl = $('#aplicarTemplate');
  const btnClearTpl = $('#limparTemplate');

  // ===== state
  let step = 0;
  const MAX_STEP = 8;

  // ===== Equipe Locks
  const lockedSteps = new Set(JSON.parse(localStorage.getItem(LOCK_KEY)||'[]'));

  // ===== config (BYOK)
  function loadConfig(){
    const cfg = JSON.parse(localStorage.getItem('openai_cfg')||'{}');
    if(apiKeyInput){ if(cfg.apiKey) apiKeyInput.value = cfg.apiKey; }
    if(modelInput){ if(cfg.model) modelInput.value = cfg.model; }
    if(temperatureInput){ if(cfg.temperature!=null) temperatureInput.value = cfg.temperature; }
    if(maxTokensInput){ if(cfg.maxTokens!=null) maxTokensInput.value = cfg.maxTokens; }
    if(currentUserInput && cfg.user) currentUserInput.value = cfg.user;
    return cfg;
  }
  function saveCfg(){
    const userName = sanitize($('#currentUser')?.value);
    const cfgPrev = JSON.parse(localStorage.getItem('openai_cfg')||'{}');
    const cfg = {
      ...cfgPrev,
      user: userName || cfgPrev.user || '',
      apiKey: sanitize(apiKeyInput.value),
      model: modelInput.value,
      temperature: Number(temperatureInput.value||0.2),
      max_tokens: undefined,
      maxTokens: Number(maxTokensInput.value||2048)
    };
    localStorage.setItem('openai_cfg', JSON.stringify(cfg));
    toast('Configurações salvas.');
    hideModal();
  }
  function showModal(){ modal.classList.remove('hidden'); }
  function hideModal(){ modal.classList.add('hidden'); }

  // ===== nav
  function setStep(i){
    step = Math.max(0, Math.min(MAX_STEP, i));
    $all('.step').forEach((el, idx)=> el.classList.toggle('hidden', idx!==step));
    stepsList.forEach((li, idx)=> li.classList.toggle('active', idx===step));
    const pct = ((step)/(MAX_STEP))*100;
    if(progressBar) progressBar.style.width = `${pct}%`;
    if(btnPrev) btnPrev.disabled = step===0;
    if(btnNext) btnNext.classList.toggle('hidden', step===MAX_STEP);
    if(step===MAX_STEP){ buildReview(); }
  }

  $('#btnIniciar')?.addEventListener('click', ()=>{ intro.classList.add('hidden'); wizard.classList.remove('hidden'); setStep(0); });
  $('#btnLoadDraft')?.addEventListener('click', ()=>{ loadDraftToForm(); intro.classList.add('hidden'); wizard.classList.remove('hidden'); setStep(8); });
  $('#btnReset')?.addEventListener('click', ()=>{ localStorage.removeItem('openai_cfg'); localStorage.removeItem('draft_peticao'); localStorage.removeItem(VKEY); localStorage.removeItem(AUDIT_KEY); location.reload(); });
  $('#btnPrev')?.addEventListener('click', ()=> setStep(step-1));
  $('#btnNext')?.addEventListener('click', ()=>{
    if(!validateStep(step)) return;
    setStep(step+1);
    if(step===7) buildValoresFromPedidos();
  });

  $('#voltar')?.addEventListener('click', ()=>{
    resultado.classList.add('hidden');
    wizard.classList.remove('hidden');
    setStep(MAX_STEP);
  });

  $('#copiar')?.addEventListener('click', async ()=>{
    await navigator.clipboard.writeText(saida.value || '');
    toast('Prompt copiado!');
  });
  $('#copiarIa')?.addEventListener('click', async ()=>{
    await navigator.clipboard.writeText(saidaIa.value || '');
    toast('Texto da IA copiado!');
  });

  // Config modal
  $('#btnConfig')?.addEventListener('click', ()=>{ loadConfig(); showModal(); });
  $('#closeConfig')?.addEventListener('click', hideModal);
  $('#saveConfig')?.addEventListener('click', saveCfg);

  // ===== dynamic blocks: reclamada
  $('#addReclamada')?.addEventListener('click', ()=>{
    const tpl = $('.reclamada', $('#reclamadasWrap')).cloneNode(true);
    $('input[name="reclamada_nome"]', tpl).value='';
    $('input[name="reclamada_doc"]', tpl).value='';
    $('input[name="reclamada_end"]', tpl).value='';
    $('input[name="reclamada_email"]', tpl).value='';
    $('input[name="reclamada_tel"]', tpl).value='';
    $('input[name="reclamada_cep"]', tpl).value='';
    $('#reclamadasWrap').appendChild(tpl);
    bindRemoveReclamada(tpl);
    bindDocMasks(tpl);
    bindCEPPhone(tpl);
  });
  function bindRemoveReclamada(scope=document){
    $all('.btnRemoveReclamada', scope).forEach(btn=>{
      btn.onclick = (e)=>{
        const card = e.target.closest('.reclamada');
        const total = $all('.reclamada').length;
        if(total>1) card.remove();
        else toast('Mantenha ao menos 1 reclamada.');
      };
    });
  }
  bindRemoveReclamada();

  // chips pedidos
  $all('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=> addPedido(chip.dataset.preset));
  });
  $('#addPedido')?.addEventListener('click', ()=> addPedido('Pedido personalizado'));

  function addPedido(titulo=''){
    const el = document.createElement('div');
    el.className = 'pedido';
    el.innerHTML = `
      <div class="split">
        <input type="text" class="pedido-titulo" placeholder="Ex.: Horas Extras" value="${titulo}">
        <button type="button" class="mini danger btnRemove">remover</button>
      </div>
      <textarea class="pedido-detalhe" rows="3" placeholder="Detalhe sucinto: período, base legal, reflexos..."></textarea>
      <div class="row between" style="margin-top:6px">
        <small class="muted">Subpedidos (opcional): use para itens como reflexos, bases, períodos</small>
        <button type="button" class="mini addSub">+ subpedido</button>
      </div>
      <div class="subpedidos"></div>
    `;
    pedidosWrap.appendChild(el);
    $('.btnRemove', el).onclick = ()=>{ el.remove(); syncValores(); };
    $('.addSub', el).onclick = ()=> addSubpedido($('.subpedidos', el));
    syncValores();
  }
  function addSubpedido(container, text=''){
    const row = document.createElement('div');
    row.className='subpedido-row';
    row.innerHTML = `
      <input type="text" class="subpedido-txt" placeholder="Ex.: Reflexos em DSR, 13º, férias + 1/3" value="${text}">
      <button type="button" class="mini danger">remover</button>
    `;
    container.appendChild(row);
    $('button', row).onclick = ()=> row.remove();
  }

  $('#addProva')?.addEventListener('click', ()=> addProva());
  function addProva(text=''){
    const el = document.createElement('div');
    el.className = 'prova';
    el.innerHTML = `
      <div class="row gap">
        <input type="text" class="prova-texto" placeholder="Ex.: contracheques, cartões de ponto, testemunhas X e Y" value="${text}">
        <button type="button" class="mini danger btnRemoveProva">remover</button>
      </div>
    `;
    provasWrap.appendChild(el);
    $('.btnRemoveProva', el).onclick = ()=> el.remove();
  }

  function buildValoresFromPedidos(){
    valoresWrap.innerHTML = '';
    const pedidos = getPedidos();
    pedidos.forEach((p, idx)=>{
      const row = document.createElement('div');
      row.className='valor-item';
      row.innerHTML = `
        <div class="grid">
          <label>Pedido
            <input type="text" value="${sanitize(p.titulo)}" data-index="${idx}" class="valor-titulo"/>
          </label>
          <label>Valor estimado (R$)
            <input type="number" min="0" step="0.01" value="" class="valor-num"/>
          </label>
        </div>
      `;
      valoresWrap.appendChild(row);
    });
    valoresWrap.addEventListener('input', sumValores, { once:true });
    sumValores();
  }
  function sumValores(){
    const nums = $all('.valor-num', valoresWrap).map(i=> parseFloat(i.value||'0'));
    const total = nums.reduce((a,b)=>a+(isNaN(b)?0:b),0);
    $('#valorCausa').textContent = fmtBRL(total);
  }
  function syncValores(){ if(step===7) buildValoresFromPedidos(); }

  // ===== validation
  function validateStep(s){
    if(s===0){
      const ok = $('#cidade').value && $('#uf').value;
      if(!ok) toast('Informe cidade e UF.');
      return ok;
    }
    if(s===1){
      const ok = $('#reclamante_nome').value && $('input[name="reclamada_nome"]').value;
      if(!ok) { toast('Informe reclamante e ao menos uma reclamada.'); return false; }

      // CPF reclamante
      const cpf = $('#reclamante_cpf').value.trim();
      if(cpf && !isCPFValido(cpf)) { toast('CPF do reclamante inválido.'); return false; }

      // valida documentos das reclamadas
      let okDocs = true;
      $all('input[name="reclamada_doc"]').forEach(el=>{
        const v = el.value.trim(); if(!v) return;
        const d = onlyDigits(v);
        if(d.length<=11 && !isCPFValido(v)) okDocs=false;
        if(d.length>11 && !isCNPJValido(v)) okDocs=false;
      });
      if(!okDocs){ toast('Documento da reclamada inválido (CPF/CNPJ).'); return false; }
    }
    if(s===3){
      if(!$('#fatos').value.trim()){ toast('Descreva os fatos.'); return false; }
    }
    if(s===4){
      if(getPedidos().length===0){ toast('Adicione pelo menos 1 pedido.'); return false; }
    }
    return true;
  }

  // ===== review + prompt
  function buildReview(){
    const data = collectAll();
    const resumo = [
      `Juízo: ${data.juizo}`,
      `Reclamante: ${data.reclamante.nome}`,
      `Reclamadas: ${data.reclamadas.map(r=>r.nome).join('; ')}`,
      `Contrato: adm ${data.contrato.adm||'-'} / saída ${data.contrato.saida||'-'}; função ${data.contrato.funcao||'-'}; salário ${data.contrato.salario||'-'}; jornada ${data.contrato.jornada||'-'}; controle de ponto ${data.contrato.controlePonto||'-'}; desligamento ${data.contrato.desligamento||'-'}`,
      '',
      `Fatos:\n${data.fatos}`,
      '',
      `Pedidos:\n${data.pedidos.map((p,i)=>`${i+1}) ${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}`).join('\n')}`,
      '',
      `Fundamentos:\n${data.fundamentos||'-'}`,
      '',
      `Provas: ${data.provas.join('; ')||'-'}`,
      `Justiça gratuita: ${data.justicaGratuita?'Sim':'Não'} | Honorários: ${data.honorarios?'Sim':'Não'}`,
      `Valor da Causa: ${fmtBRL(data.valorCausa)}`
    ].join('\n');
    reviewBox.textContent = resumo;
  }

  $('#btnSalvar')?.addEventListener('click', ()=>{ 
    const data = collectAll();
    localStorage.setItem('draft_peticao', JSON.stringify(data));
    saveVersion('manual');
    toast('Rascunho salvo.');
  });
  function loadDraftToForm(){
    const raw = localStorage.getItem('draft_peticao');
    if(!raw){ toast('Não há rascunho salvo.'); return; }
    const d = JSON.parse(raw);
    // preencher campos
    $('#juizoNum').value = d._rawJuizoNum||'';
    const [cidade, uf] = (d.juizo?.match(/de (.*)\/(.*)$/)||['', '', '']).slice(1);
    $('#cidade').value = cidade||'';
    $('#uf').value = uf||'';
    $('#reclamante_nome').value = d.reclamante?.nome||'';
    $('#reclamante_estado_civil').value = d.reclamante?.estado_civil||'';
    $('#reclamante_prof').value = d.reclamante?.prof||'';
    $('#reclamante_cpf').value = d.reclamante?.cpf||'';
    $('#reclamante_rg').value = d.reclamante?.rg||'';
    $('#reclamante_end').value = d.reclamante?.end||'';
    $('#reclamante_email').value = d.reclamante?.email||'';
    $('#reclamante_cep').value = d.reclamante?.cep||'';
    $('#reclamante_tel').value = d.reclamante?.tel||'';
    // reclamada(s)
    const wrap = $('#reclamadasWrap'); wrap.innerHTML='';
    (d.reclamadas||[{}]).forEach((r)=>{
      const card = document.createElement('div');
      card.className = 'card subtle reclamada';
      card.innerHTML = `
        <div class="grid">
          <label>Razão social / Nome
            <input type="text" name="reclamada_nome" value="${r.nome||''}" required />
          </label>
          <label>CNPJ/CPF
            <input type="text" name="reclamada_doc" value="${r.doc||''}" />
          </label>
          <label>Endereço
            <input type="text" name="reclamada_end" value="${r.end||''}" />
          </label>
          <label>E-mail
            <input type="email" name="reclamada_email" value="${r.email||''}" />
          </label>
          <label>Telefone
            <input type="text" name="reclamada_tel" value="${r.tel||''}" />
          </label>
          <label>CEP
            <input type="text" name="reclamada_cep" value="${r.cep||''}" />
          </label>
        </div>
        <div class="row end">
          <button type="button" class="mini danger btnRemoveReclamada">remover</button>
        </div>`;
      wrap.appendChild(card);
    });
    bindRemoveReclamada(wrap);
    bindDocMasks(wrap);
    bindCEPPhone(wrap);

    $('#adm').value = d.contrato?.adm||'';
    $('#saida').value = d.contrato?.saida||'';
    $('#funcao').value = d.contrato?.funcao||'';
    $('#salario').value = d.contrato?.salario||'';
    $('#jornada').value = d.contrato?.jornada||'';
    $('#controlePonto').value = d.contrato?.controlePonto||'';
    $('#desligamento').value = d.contrato?.desligamento||'';
    $('#fatos').value = d.fatos||'';
    $('#fundamentos').value = d.fundamentos||'';
    // pedidos
    pedidosWrap.innerHTML='';
    (d.pedidos||[]).forEach(p=>{
      addPedido(p.titulo);
      const last = $all('.pedido').slice(-1)[0];
      $('.pedido-detalhe', last).value = p.detalhe||'';
      const cont = $('.subpedidos', last);
      (p.subpedidos||[]).forEach(s=> addSubpedido(cont, s));
    });
    // provas
    provasWrap.innerHTML='';
    (d.provas||[]).forEach(p=> addProva(p));
    // valores
    buildValoresFromPedidos();
    toast('Rascunho carregado.');
  }

  $('#btnGerar')?.addEventListener('click', ()=>{
    const data = collectAll();
    const prompt = buildPrompt(data);
    saida.value = prompt;
    saidaIa.value = '';
    wizard.classList.add('hidden');
    resultado.classList.remove('hidden');
    window.scrollTo({top:0, behavior:'smooth'});
    const lint = runLint({ d: collectAll(), promptText: prompt, iaText: '' });
    fillLint(lint);
    updateTokenInfo(prompt, '');
    saveVersion('gerar_prompt');
  });

  $('#btnGerarIA')?.addEventListener('click', async ()=>{
    const data = collectAll();
    const prompt = buildPrompt(data);
    saida.value = prompt;
    wizard.classList.add('hidden');
    resultado.classList.remove('hidden');
    window.scrollTo({top:0, behavior:'smooth'});

    const cfg = loadConfig();
    if(!cfg.apiKey){ toast('Informe sua OpenAI API key em Configurar IA.'); showModal(); return; }
    try{
      addAudit('IA_REQUEST', { model: (cfg.model||'gpt-4o-mini'), promptPreview: prompt.slice(0,1000) });
      showLoading(true);
      const text = await callOpenAI({ prompt, cfg });
      saidaIa.value = text || '(sem conteúdo)';
      toast('Petição gerada com ChatGPT.');
      const lint = runLint({ d: collectAll(), promptText: prompt, iaText: text });
      fillLint(lint);
      updateTokenInfo(prompt, text);
      addAudit('IA_RESPONSE', { tokensApprox: (text||'').length/4, snippet: (text||'').slice(0,1000) });
      saveVersion('gerar_ia');
    }catch(err){
      console.error(err);
      saidaIa.value = `Falha ao gerar com ChatGPT: ${err?.message||err}`;
      toast('Erro ao gerar com ChatGPT.');
    }finally{
      showLoading(false);
    }
  });

  // Refinar o texto já gerado com uma instrução curta
  $('#refinarIa')?.addEventListener('click', async ()=>{
    const base = (saidaIa.value||'').trim();
    if(!base){ toast('Gere o texto com ChatGPT antes.'); return; }
    const instr = prompt('Como refinar? (ex.: “deixar mais conciso”, “incluir súmulas 264/376 para horas extras”, “ajustar pedidos para liquidação por estimativa”)');
    if(!instr) return;
    const cfg = loadConfig();
    if(!cfg.apiKey){ toast('Informe sua OpenAI API key em Configurar IA.'); showModal(); return; }
    try{
      addAudit('IA_REQUEST', { refine:true, instr, model:(cfg.model||'gpt-4o-mini') });
      showLoading(true);
      const refined = await callOpenAI({
        prompt:
`Você é advogado trabalhista brasileiro sênior.
Refine o texto abaixo conforme a instrução entre colchetes.
[INSTRUÇÃO]: ${instr}

[TEXTO-BASE]:
${base}

Mantenha estrutura formal, correções jurídicas e coerência. Devolva apenas o texto final.`,
        cfg
      });
      if(refined) saidaIa.value = refined;
      addAudit('IA_RESPONSE', { refine:true, tokensApprox:(refined||'').length/4, snippet:(refined||'').slice(0,1000) });
      toast('Texto refinado.');
    }catch(err){
      console.error(err);
      toast('Erro ao refinar.');
    }finally{
      showLoading(false);
    }
  });

  function collectAll(){
    const rawJuizoNum = sanitize($('#juizoNum').value||'');
    const juizo = `${rawJuizoNum?rawJuizoNum+' ':''}Vara do Trabalho de ${sanitize($('#cidade').value||'')}/${sanitize($('#uf').value||'')}`;
    const reclamante = {
      nome: sanitize($('#reclamante_nome').value),
      estado_civil: sanitize($('#reclamante_estado_civil').value),
      prof: sanitize($('#reclamante_prof').value),
      cpf: sanitize($('#reclamante_cpf').value),
      rg: sanitize($('#reclamante_rg').value),
      end: sanitize($('#reclamante_end').value),
      cep: sanitize($('#reclamante_cep')?.value),
      tel: sanitize($('#reclamante_tel')?.value),
      email: sanitize($('#reclamante_email').value),
    };
    const reclamadas = $all('.reclamada').map(card=>({
      nome: sanitize($('input[name="reclamada_nome"]', card).value),
      doc: sanitize($('input[name="reclamada_doc"]', card).value),
      end: sanitize($('input[name="reclamada_end"]', card).value),
      cep: sanitize($('input[name="reclamada_cep"]', card)?.value),
      tel: sanitize($('input[name="reclamada_tel"]', card)?.value),
      email: sanitize($('input[name="reclamada_email"]', card).value),
    }));
    const contrato = {
      adm: $('#adm').value, saida: $('#saida').value, funcao: sanitize($('#funcao').value),
      salario: sanitize($('#salario').value), jornada: sanitize($('#jornada').value),
      controlePonto: sanitize($('#controlePonto').value),
      desligamento: sanitize($('#desligamento').value),
    };
    const fatos = sanitize($('#fatos').value);
    const pedidos = getPedidos();
    const fundamentos = sanitize($('#fundamentos').value);
    const provas = $all('.prova-texto').map(i=>sanitize(i.value)).filter(Boolean);
    const justicaGratuita = $('#justicaGratuita').checked;
    const honorarios = $('#honorarios').checked;
    const valorCausa = ($all('.valor-num').map(i=>parseFloat(i.value||'0')).reduce((a,b)=>a+(isNaN(b)?0:b),0)) || 0;

    return { _rawJuizoNum: rawJuizoNum, juizo, reclamante, reclamadas, contrato, fatos, pedidos, fundamentos, provas, justicaGratuita, honorarios, valorCausa };
  }

  function getPedidos(){
    return $all('.pedido').map(p=>{
      const subs = $all('.subpedido-txt', p).map(i=> sanitize(i.value)).filter(Boolean);
      return {
        titulo: sanitize($('.pedido-titulo', p).value),
        detalhe: sanitize($('.pedido-detalhe', p).value),
        subpedidos: subs
      };
    }).filter(p=>p.titulo);
  }

  function buildPrompt(d){
    const reclams = d.reclamadas.map((r,i)=>`${i+1}. ${r.nome}${r.doc?`, ${r.doc}`:''}${r.end?`, ${r.end}`:''}`).join('\n');

    return `
Você é ADVOGADO TRABALHISTA EXPERIENTE no Brasil.
Redija uma **PETIÇÃO INICIAL TRABALHISTA COMPLETA**, fiel ao padrão forense, com:
endereçamento, qualificação, dos fatos, dos fundamentos, pedidos numerados e liquidados quando possível, valor da causa, requerimentos finais (citação/notificação, provas), local/data e assinatura.
Use CLT, CF/88, CPC subsidiário (art. 769 CLT), súmulas/OJs do TST e jurisprudência pertinente. Linguagem clara, técnica e respeitosa.

### Endereçamento
Ao Juízo da ${d.juizo}.

### Qualificação
Reclamante: ${d.reclamante.nome}${d.reclamante.estado_civil?`, ${d.reclamante.estado_civil}`:''}${d.reclamante.prof?`, ${d.reclamante.prof}`:''}${d.reclamante.cpf?`, CPF ${d.reclamante.cpf}`:''}${d.reclamante.rg?`, RG ${d.reclamante.rg}`:''}${d.reclamante.end?`, residente ${d.reclamante.end}`:''}${d.reclamante.email?`, e-mail ${d.reclamante.email}`:''}, por seu advogado.
Reclamadas:
${reclams || '-'}.

### Do Contrato
Admissão: ${d.contrato.adm||'-'}; Saída: ${d.contrato.saida||'-'}; Função: ${d.contrato.funcao||'-'}; Salário: ${d.contrato.salario?`R$ ${d.contrato.salario}`:'-'}; Jornada: ${d.contrato.jornada||'-'}; Controle de ponto: ${d.contrato.controlePonto||'-'}; Desligamento: ${d.contrato.desligamento||'-'}.

### Dos Fatos
${d.fatos||'-'}.

### Dos Fundamentos
${d.fundamentos||'Indicar CLT, CF/88, súmulas/OJs aplicáveis a cada pedido.'}

### Dos Pedidos
${d.pedidos.map((p,i)=>`${i+1}) ${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}${(p.subpedidos||[]).length?`\n  ${(p.subpedidos||[]).map((s,j)=>`${i+1}.${j+1}) ${s}`).join('\n  ')}`:''}`).join('\n')}

### Provas
Protesta provar o alegado por todos os meios em direito admitidos (documental, testemunhal, pericial e depoimento pessoal), notadamente: ${d.provas.join('; ') || 'documentos anexos e prova testemunhal'}.

### Justiça Gratuita / Honorários
${d.justicaGratuita?'Requer os benefícios da justiça gratuita (CLT art. 790, §3º).':''}
${d.honorarios?'Requer honorários de sucumbência (CLT art. 791-A).':''}

### Valor da Causa
${fmtBRL(d.valorCausa)}.

### Requerimentos Finais
Requer notificação/citação das reclamadas para audiência e resposta, sob pena de revelia e confissão; a total procedência; correção monetária e juros legais; e demais cominações.
Termos em que, pede deferimento.`.trim();
  }

  // ===== Fund tips
  const fundTips = $('#fundTips');
  function renderFundTips(){
    if(!fundTips) return;
    fundTips.innerHTML = '';
    Object.entries(FUNDAMENTOS_MAP).forEach(([titulo, bases])=>{
      const div = document.createElement('div');
      div.className='card subtle';
      div.style.padding='12px';
      div.innerHTML = `
        <div class="row between">
          <strong>${titulo}</strong>
          <button type="button" class="mini" data-add="${titulo}">Adicionar pedido</button>
        </div>
        <small class="muted">${bases.join(' • ')}</small>
      `;
      fundTips.appendChild(div);
    });
    fundTips.querySelectorAll('button[data-add]').forEach(btn=>{
      btn.onclick = ()=>{
        const t = btn.getAttribute('data-add');
        addPedido(t);
        const last = $all('.pedido').slice(-1)[0];
        const ta = last.querySelector('.pedido-detalhe');
        ta.value = `Base legal sugerida: ${FUNDAMENTOS_MAP[t].join(' | ')}`;
      };
    });
  }
  renderFundTips();

  // ===== estimativa de tokens (aprox. 4 chars/token)
  function estimateTokens(str){ 
    const chars = (str||'').length;
    return Math.ceil(chars / 4);
  }

  // ===== lint
  function runLint({ d, promptText, iaText }){
    const issues = [];
    if(!d.reclamante?.nome) issues.push('• Nome do reclamante ausente.');
    if(!d.reclamadas?.length || !d.reclamadas[0]?.nome) issues.push('• Ao menos uma reclamada com nome é obrigatória.');
    if(!d.fatos) issues.push('• Descrever os fatos.');
    if(!d.pedidos?.length) issues.push('• Incluir ao menos um pedido.');
    if(d.contrato?.salario && isNaN(Number(String(d.contrato.salario).replace(',','.'))))
      issues.push('• Salário com formato inválido.');
    const pedTit = d.pedidos.map(p=>p.titulo.toLowerCase());
    pedTit.forEach(t=>{
      const p = d.pedidos.find(p=>p.titulo.toLowerCase()===t);
      if(p && (!p.detalhe || p.detalhe.length<8)) issues.push(`• Detalhar fundamentos para “${p.titulo}”.`);
    });
    if(d.valorCausa<=0) issues.push('• Valor da causa não informado (recomendado estimar).');
    const tokPrompt = estimateTokens(promptText);
    const tokIa = estimateTokens(iaText||'');
    issues.push(`• Estimativa de tokens — prompt: ~${tokPrompt}, resposta: ~${tokIa}.`);
    if(selTipoAcao?.value==='equiparacao'){
      if(!d.fatos?.toLowerCase().includes('mesmas funções')) issues.push('• Em equiparação: explicitar identidade de funções, produtividade e perfeição técnica.');
      if(!/paradig/i.test(d.fatos)) issues.push('• Em equiparação: identificar paradigma e período comparado.');
    }
    if(selTipoAcao?.value==='rescisao_indireta'){
      if(!/art\.?\s*483/i.test(d.fundamentos)) issues.push('• Rescisão indireta: citar CLT art. 483 com alínea aplicável.');
    }
    if(d.pedidos.some(p=> /insalubridade/i.test(p.titulo)) && !/nr-15|189|192/i.test(d.fundamentos)) issues.push('• Insalubridade: cite CLT 189–192 e NR-15.');
    if(d.pedidos.some(p=> /periculosidade/i.test(p.titulo)) && !/nr-16|193/i.test(d.fundamentos)) issues.push('• Periculosidade: cite CLT 193 e NR-16.');
    if(d.pedidos.some(p=> /adicional noturno|noturno/i.test(p.titulo)) && !/clt\s*73|súmula\s*60/i.test(d.fundamentos)) issues.push('• Adicional noturno: cite CLT 73 e Súmula TST 60.');
    try{
      const sai = new Date(d.contrato?.saida||'');
      if(d.contrato?.saida){
        const diffAnos = (Date.now() - sai.getTime())/(1000*60*60*24*365.25);
        if(diffAnos>2) issues.push('• Atenção: prescrição bienal possivelmente consumada (saida > 2 anos).');
      }
    }catch(_){}
    if(d.valorCausa>0){
      const SM = 1412.00;
      const salarios = d.valorCausa/SM;
      if(salarios<=40) issues.push('• Rito sumaríssimo sugerido (≤ 40 SM).');
      else issues.push('• Rito ordinário sugerido (> 40 SM).');
    }
    if(d.pedidos.some(p=>/horas extras/i.test(p.titulo)) && !d.pedidos.some(p=>/dsr/i.test(p.titulo))){
      issues.push('• Recomenda-se incluir “DSR sobre Horas Extras”.');
    }
    try { if(!(readDosDocs?.()||[]).length) issues.push('• Dossiê: sem sumário de documentos. Gere o dossiê de protocolo.'); } catch(_){}
    return issues;
  }
  function fillLint(items){
    const ul = $('#lintList'); if(!ul) return;
    ul.innerHTML = '';
    items.forEach(i=>{
      const li = document.createElement('li');
      li.textContent = i;
      ul.appendChild(li);
    });
  }
  function updateTokenInfo(prompt, ia){
    const el = $('#tokenInfo'); if(!el) return;
    el.textContent = `~${estimateTokens(prompt)}t prompt / ~${estimateTokens(ia)}t resp.`;
  }

  // ===== Export/Import caso
  $('#btnExportJson')?.addEventListener('click', ()=>{
    const data = collectAll();
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `caso-trabalhista-${Date.now()}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
    addAudit('EXPORT', { kind:'caso-json' });
  });

  $('#btnImportJson')?.addEventListener('click', ()=>{
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='application/json';
    inp.onchange = async (e)=>{
      const file = e.target.files?.[0]; if(!file) return;
      const text = await file.text();
      try{
        const d = JSON.parse(text);
        localStorage.setItem('draft_peticao', JSON.stringify(d));
        loadDraftToForm();
        setStep(8);
        toast('Caso importado e carregado.');
      }catch(_){ toast('JSON inválido.'); }
    };
    inp.click();
  });

  // ===== OpenAI (client-side BYOK)
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
      method: 'POST',
      headers: { 'Content-Type':'application/json','Authorization': `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const errText = await res.text().catch(()=> '');
      throw new Error(`HTTP ${res.status} – ${errText || res.statusText}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text;
  }

  function showLoading(v){ loading.classList.toggle('hidden', !v); }

  // ===== Exportações PDF/DOCX
  $('#exportPdf')?.addEventListener('click', ()=>{
    const text = (saidaIa.value || saida.value || '').trim();
    if(!text){ toast('Nada para exportar.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    const margin = 48, maxWidth = 515;
    const lines = doc.splitTextToSize(text, maxWidth);
    let y = margin;
    doc.setFont('Times','Normal'); doc.setFontSize(12);
    lines.forEach(l=>{
      if(y > 780){ doc.addPage(); y = margin; }
      doc.text(l, margin, y);
      y += 16;
    });
    doc.save('peticao-inicial.pdf');
    addAudit('EXPORT', { kind:'pdf' });
    toast('PDF exportado.');
  });

  $('#exportDocx')?.addEventListener('click', async ()=>{
    const d = collectAll();
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, LevelFormat } = window.docx;

    const P = (t, opts={}) => new Paragraph({ children:[ new TextRun({ text: t, break:0 }) ], ...opts });
    const H = (t, lvl=HeadingLevel.HEADING_2) => new Paragraph({ text:t.toUpperCase(), heading:lvl, spacing:{ after:120 } });
    const Just = (t)=> P(t, { alignment: AlignmentType.JUSTIFIED, spacing:{ after:120 } });

    const numbering = {
      config: [
        {
          reference: "pedidos",
          levels: [
            { level:0, format: LevelFormat.DECIMAL, text: "%1)", alignment: AlignmentType.START },
            { level:1, format: LevelFormat.DECIMAL, text: "%1.%2)", alignment: AlignmentType.START },
          ],
        }
      ]
    };

    const children = [];
    children.push(new Paragraph({ text:`AO JUÍZO DA ${d.juizo}`.toUpperCase(), alignment: AlignmentType.CENTER, spacing:{ after:200 } }));

    children.push(H("Qualificação", HeadingLevel.HEADING_2));
    children.push(Just(
      `Reclamante: ${d.reclamante.nome || '—'}`
      + (d.reclamante.estado_civil?`, ${d.reclamante.estado_civil}`:'')
      + (d.reclamante.prof?`, ${d.reclamante.prof}`:'')
      + (d.reclamante.cpf?`, CPF ${d.reclamante.cpf}`:'')
      + (d.reclamante.rg?`, RG ${d.reclamante.rg}`:'')
      + (d.reclamante.end?`, residente ${d.reclamante.end}`:'')
      + (d.reclamante.cep?`, CEP ${d.reclamante.cep}`:'')
      + (d.reclamante.tel?`, Tel. ${d.reclamante.tel}`:'')
      + (d.reclamante.email?`, e-mail ${d.reclamante.email}`:'')
      + '.'
    ));
    children.push(Just(
      `Reclamadas: ${
        d.reclamadas.map((r,i)=>`${i+1}. ${r.nome||'—'}${r.doc?`, ${r.doc}`:''}${r.end?`, ${r.end}`:''}${r.cep?`, CEP ${r.cep}`:''}${r.tel?`, Tel. ${r.tel}`:''}${r.email?`, e-mail ${r.email}`:''}.`).join(' ')
      }`
    ));

    children.push(H("Do Contrato"));
    children.push(Just(
      `Admissão: ${d.contrato.adm||'—'}; Saída: ${d.contrato.saida||'—'}; Função: ${d.contrato.funcao||'—'}; `
      + `Salário: ${d.contrato.salario?`R$ ${d.contrato.salario}`:'—'}; Jornada: ${d.contrato.jornada||'—'}; `
      + `Controle de ponto: ${d.contrato.controlePonto||'—'}; Desligamento: ${d.contrato.desligamento||'—'}.`
    ));

    children.push(H("Dos Fatos"));
    children.push(Just(d.fatos || '—'));

    children.push(H("Dos Fundamentos"));
    children.push(Just(d.fundamentos || 'Indicar CLT, CF/88, CPC (art. 769 CLT), súmulas/OJs do TST e jurisprudência aplicável.'));

    // Pedidos — com numeração (fixed)
    children.push(H("Dos Pedidos"));
    (d.pedidos || []).forEach((p) => {
      children.push(new Paragraph({
        numbering: { reference: "pedidos", level: 0 },
        children: [ new TextRun({ text: `${p.titulo}${p.detalhe ? ` — ${p.detalhe}` : ''}` }) ]
      }));
      (p.subpedidos || []).forEach((sp) => {
        children.push(new Paragraph({
          numbering: { reference: "pedidos", level: 1 },
          children: [ new TextRun({ text: sp }) ]
        }));
      });
    });

    children.push(H("Provas"));
    children.push(Just(`Protesta provar o alegado por todos os meios em direito admitidos, notadamente: ${d.provas.join('; ') || 'documentos anexos e prova testemunhal'}.`));

    if(d.justicaGratuita) children.push(Just('Requer os benefícios da justiça gratuita (CLT art. 790, §3º).'));
    if(d.honorarios) children.push(Just('Requer honorários de sucumbência (CLT art. 791-A).'));

    children.push(H("Valor da Causa"));
    children.push(Just(`${fmtBRL(d.valorCausa)}`));

    const perPack = JSON.parse(localStorage.getItem('pericia_pack_v1')||'null');
    if(perPack && perPack.quesitos){
      children.push(H("Quesitos ao Perito"));
      children.push(Just(`Tipo: ${perPack.tipo||'—'}`));
      perPack.quesitos.split('\n').filter(Boolean).forEach(l=>{
        const tx = l.replace(/^\d+\)\s*/,'');
        children.push(new Paragraph({ text: `• ${tx}` }));
      });
      if(perPack.obs) children.push(Just(`Obs.: ${perPack.obs}`));
    }

    children.push(H("Requerimentos Finais"));
    children.push(Just('Requer notificação/citação das reclamadas para audiência e resposta, sob pena de revelia e confissão; a total procedência; correção monetária e juros legais; e demais cominações.'));
    children.push(new Paragraph({ text: new Date().toLocaleDateString('pt-BR') + '.', alignment: AlignmentType.RIGHT, spacing:{ before:200, after:120 } }));
    children.push(new Paragraph({ text: '__________________________________', alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: 'Advogado (OAB nº)', alignment: AlignmentType.CENTER }));

    const doc = new Document({ numbering, sections:[{ properties:{}, children }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'peticao-inicial.docx';
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
    addAudit('EXPORT', { kind:'docx' });
    toast('DOCX (estilizado) exportado.');
  });

  // ===== Modelo Forense (HTML/preview/print)
  function buildForenseHTML(d){
    const safe = (s)=> (s && String(s).trim()) || '—';
    const reclams = d.reclamadas.map((r,i)=>`
      <p><span class="bold">${i+1}. ${safe(r.nome)}</span>${r.doc?`, ${safe(r.doc)}`:''}${r.end?`, ${safe(r.end)}`:''}${r.email?`, e-mail ${safe(r.email)}`:''}.</p>
    `).join('');

    const pedidosList = d.pedidos.map((p,i)=>{
      const idx = `${i+1})`;
      const subs = (p.subpedidos||[]).map((s,j)=>`<li>${i+1}.${j+1}) ${s}</li>`).join('');
      return `
        <li><span class="bold">${idx} ${safe(p.titulo)}</span>${p.detalhe?` — ${safe(p.detalhe)}`:''}
          ${subs?`<ol>${subs}</ol>`:''}
        </li>`;
    }).join('');

    const perPack = JSON.parse(localStorage.getItem('pericia_pack_v1')||'null');
    const perBlock = perPack && perPack.quesitos ? `
      <h2>Quesitos ao Perito</h2>
      <p><strong>Tipo:</strong> ${perPack.tipo || '—'}</p>
      <ol>${perPack.quesitos.split('\n').filter(Boolean).map(l=>`<li>${l.replace(/^\d+\)\s*/,'')}</li>`).join('')}</ol>
      ${perPack.obs ? `<p><em>Obs.:</em> ${perPack.obs}</p>`:''}
      <p><em>Honorários estimados:</em> ${fmtBRL(parseFloat(perPack.honor||0))} — <em>Adiantamento:</em> ${fmtBRL(parseFloat(perPack.adiant||0))}</p>
    ` : '';

    return `
    <div class="doc print-area">
      <h1>Ao Juízo da ${safe(d.juizo)}</h1>

      <h2>Qualificação</h2>
      <p><span class="bold">Reclamante:</span> ${safe(d.reclamante.nome)}
        ${d.reclamante.estado_civil?`, ${safe(d.reclamante.estado_civil)}`:''}
        ${d.reclamante.prof?`, ${safe(d.reclamante.prof)}`:''}
        ${d.reclamante.cpf?`, CPF ${safe(d.reclamante.cpf)}`:''}
        ${d.reclamante.rg?`, RG ${safe(d.reclamante.rg)}`:''}
        ${d.reclamante.end?`, residente ${safe(d.reclamante.end)}`:''}
        ${d.reclamante.email?`, e-mail ${safe(d.reclamante.email)}`:''}.
      </p>

      <p><span class="bold">Reclamadas:</span></p>
      ${reclams || '<p>—</p>'}

      <h2>Do Contrato</h2>
      <p>Admissão: ${safe(d.contrato.adm)}; Saída: ${safe(d.contrato.saida)}; Função: ${safe(d.contrato.funcao)};
      Salário: ${d.contrato.salario?`R$ ${safe(d.contrato.salario)}`:'—'}; Jornada: ${safe(d.contrato.jornada)};
      Controle de ponto: ${safe(d.contrato.controlePonto)}; Desligamento: ${safe(d.contrato.desligamento)}.</p>

      <h2>Dos Fatos</h2>
      <p>${safe(d.fatos)}</p>

      <h2>Dos Fundamentos</h2>
      <p>${d.fundamentos ? safe(d.fundamentos) : 'Indicar CLT, CF/88, CPC subsidiário (art. 769 CLT), súmulas/OJs do TST e jurisprudência aplicável.'}</p>

      <h2>Dos Pedidos</h2>
      <ol>${pedidosList}</ol>

      <h2>Provas</h2>
      <p>Protesta provar o alegado por todos os meios em direito admitidos, notadamente: ${d.provas.join('; ') || 'documentos anexos e prova testemunhal'}.</p>

      ${d.justicaGratuita?'<p>Requer os benefícios da justiça gratuita (CLT art. 790, §3º).</p>':''}
      ${d.honorarios?'<p>Requer honorários de sucumbência (CLT art. 791-A).</p>':''}

      <h2>Valor da Causa</h2>
      <p>${fmtBRL(d.valorCausa)}</p>

      ${perBlock}

      <div class="page-break"></div>

      <h2>Requerimentos Finais</h2>
      <p>Requer notificação/citação das reclamadas para audiência e resposta, sob pena de revelia e confissão; a total procedência; correção monetária e juros legais; e demais cominações.</p>

      <br/><br/>
      <p class="right">${new Date().toLocaleDateString('pt-BR')}.</p>
      <br/><br/>
      <p class="center">__________________________________<br/>Advogado (OAB nº)</p>
    </div>`;
  }

  $('#btnForense')?.addEventListener('click', ()=>{
    const d = collectAll();
    const html = buildForenseHTML(d);
    previewDoc.innerHTML = html;
    wizard.classList.add('hidden');
    resultado.classList.remove('hidden');
    toast('Prévia do modelo forense atualizada.');
  });

  $('#copyHtml')?.addEventListener('click', async ()=>{
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildForenseHTML(collectAll());
    await navigator.clipboard.writeText(wrapper.innerHTML);
    toast('HTML copiado.');
  });

  $('#printDoc')?.addEventListener('click', ()=>{
    if(!previewDoc.innerHTML.trim()){
      previewDoc.innerHTML = buildForenseHTML(collectAll());
    }
    window.print();
  });

  // ===== Máscaras/Validações
  function onlyDigits(s){ return (s||'').replace(/\D+/g,''); }
  function maskCPF(v){
    const d = onlyDigits(v).slice(0,11);
    return d.replace(/(\d{3})(\d)/,'$1.$2')
            .replace(/(\d{3})(\d)/,'$1.$2')
            .replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  }
  function maskCNPJ(v){
    const d = onlyDigits(v).slice(0,14);
    return d.replace(/^(\d{2})(\d)/,'$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
            .replace(/\.(\d{3})(\d)/,'.$1/$2')
            .replace(/(\d{4})(\d)/,'$1-$2');
  }
  function maskCEP(v){ return (v||'').replace(/\D+/g,'').slice(0,8).replace(/(\d{5})(\d{1,3})$/,'$1-$2'); }
  function maskPhone(v){
    const d = (v||'').replace(/\D+/g,'').slice(0,11);
    if(d.length<=10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').trim();
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3').trim();
  }
  const inpCPF = $('#reclamante_cpf');
  inpCPF?.addEventListener('input', e=> e.target.value = maskCPF(e.target.value));
  const inpUF = $('#uf');
  inpUF?.addEventListener('input', e=> e.target.value = e.target.value.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,2));
  function bindDocMasks(scope=document){
    $all('input[name="reclamada_doc"]', scope).forEach(el=>{
      el.addEventListener('input', e=>{
        const raw = onlyDigits(e.target.value);
        e.target.value = raw.length <= 11 ? maskCPF(raw) : maskCNPJ(raw);
      });
    });
  }
  bindDocMasks();
  function bindCEPPhone(scope=document){
    $all('input[name="reclamada_cep"]', scope).forEach(el=> el.addEventListener('input', e=> e.target.value = maskCEP(e.target.value)));
    $all('input[name="reclamada_tel"]', scope).forEach(el=> el.addEventListener('input', e=> e.target.value = maskPhone(e.target.value)));
  }
  bindCEPPhone();
  $('#addReclamada')?.addEventListener('click', ()=> setTimeout(()=>{ bindDocMasks($('#reclamadasWrap')); bindCEPPhone($('#reclamadasWrap')); },0));
  const inpSal = $('#salario');
  inpSal?.addEventListener('blur', e=>{
    const n = Number(String(e.target.value).replace(',','.'));
    if(!isNaN(n)) e.target.value = n.toFixed(2);
  });
  $('#reclamante_cep')?.addEventListener('input', e=> e.target.value = maskCEP(e.target.value));
  $('#reclamante_tel')?.addEventListener('input', e=> e.target.value = maskPhone(e.target.value));

  function isCPFValido(cpf){
    let s = onlyDigits(cpf); if(s.length!==11 || /^(\d)\1+$/.test(s)) return false;
    let soma=0; for(let i=0;i<9;i++) soma+=parseInt(s[i])*(10-i);
    let d1 = 11-(soma%11); d1 = (d1>=10)?0:d1;
    soma=0; for(let i=0;i<10;i++) soma+=parseInt(s[i])*(11-i);
    let d2 = 11-(soma%11); d2 = (d2>=10)?0:d2;
    return s[9]==d1 && s[10]==d2;
  }
  function isCNPJValido(cnpj){
    let s = onlyDigits(cnpj); if(s.length!==14) return false;
    const calc=(base)=>{
      let len = base.length, pos=len-7, sum=0;
      for(let i=len;i>=1;i--){ sum += base[len-i]*pos--; if(pos<2) pos=9; }
      let res = sum%11<2?0:11-(sum%11);
      return res;
    };
    let d1 = calc(s.substring(0,12));
    let d2 = calc(s.substring(0,12)+d1);
    return s[12]==d1 && s[13]==d2;
  }

  // ===== Autosave + field audit
  let autosaveTimer=null, fieldAuditTimer=null;
  document.addEventListener('input', (e)=>{
    if(e.target.closest('#formPeticao')){
      clearTimeout(fieldAuditTimer);
      const name = e.target.id || e.target.name || e.target.className || e.target.tagName;
      const val = (e.target.value ?? '').toString().slice(0,300);
      fieldAuditTimer = setTimeout(()=> addAudit('FIELD', { field: name, value: val }), 1000);

      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(()=> saveVersion('autosave'), 600);
    }
  });

  function saveVersion(kind='manual'){
    const data = collectAll();
    const snap = { id: crypto.randomUUID?.() || String(Date.now()), at: nowISO(), kind, data: deepClone(data) };
    const versions = loadVersions();
    versions.unshift(snap);
    if(versions.length>VMAX) versions.length = VMAX;
    saveVersions(versions);
    localStorage.setItem('draft_peticao', JSON.stringify(data));
    addAudit('VERSION', { kind, id: snap.id });
  }

  // ===== History modal
  $('#btnHistory')?.addEventListener('click', ()=>{ openHistory(); });
  $('#closeHistory')?.addEventListener('click', ()=> historyModal.classList.add('hidden'));
  function openHistory(){
    renderVersionList();
    fillCompareSelects();
    diffView.innerHTML = '';
    historyModal.classList.remove('hidden');
  }
  function renderVersionList(){
    const versions = loadVersions();
    versionList.innerHTML = versions.map(v=>`
      <li data-id="${v.id}">
        <strong>${v.kind==='autosave'?'Auto':'Manual'}</strong> — ${shortTime(v.at)}
        <small>${(v.data?.reclamante?.nome||'—')} vs ${(v.data?.reclamadas?.[0]?.nome||'—')}</small>
      </li>
    `).join('');
    versionList.querySelectorAll('li').forEach(li=>{
      li.onclick = ()=>{
        const id = li.getAttribute('data-id');
        compareB.value = id;
        toast('Versão selecionada para o lado B.');
      };
    });
  }
  function fillCompareSelects(){
    const versions = loadVersions();
    const opts = versions.map(v=> `<option value="${v.id}">${shortTime(v.at)} — ${v.kind}</option>`).join('');
    compareA.innerHTML = opts;
    compareB.innerHTML = opts;
    if(versions[1]){ compareA.value = versions[1].id; }
    if(versions[0]){ compareB.value = versions[0].id; }
  }
  $('#btnCompare')?.addEventListener('click', ()=>{
    const a = getVersionById(compareA.value);
    const b = getVersionById(compareB.value);
    if(!a || !b){ toast('Selecione duas versões.'); return; }
    const txtA = serializeCase(a.data);
    const txtB = serializeCase(b.data);
    diffView.innerHTML = buildDiffHTML(txtA, txtB);
  });
  function getVersionById(id){ return loadVersions().find(v=> v.id===id); }
  function serializeCase(d){
    const ped = (d.pedidos||[]).map((p,i)=>`${i+1}) ${p.titulo} — ${p.detalhe}\n  ${ (p.subpedidos||[]).map((s,j)=>`${i+1}.${j+1}) ${s}`).join('\n') }`).join('\n');
    const recl = (d.reclamadas||[]).map(r=>`${r.nome} | ${r.doc} | ${r.end}`).join('\n');
    return [
      `JUÍZO: ${d.juizo}`,
      `RECLAMANTE: ${d.reclamante?.nome} | ${d.reclamante?.cpf} | ${d.reclamante?.end}`,
      `RECLAMADAS:\n${recl}`,
      `CONTRATO: adm=${d.contrato?.adm} saida=${d.contrato?.saida} func=${d.contrato?.funcao} sal=${d.contrato?.salario}`,
      `FATOS:\n${d.fatos}`,
      `FUNDAMENTOS:\n${d.fundamentos}`,
      `PEDIDOS:\n${ped}`,
      `PROVAS: ${(d.provas||[]).join('; ')}`,
      `JUSTIÇA GRATUITA: ${d.justicaGratuita} | HONORÁRIOS: ${d.honorarios}`,
      `VALOR CAUSA: ${d.valorCausa}`
    ].join('\n');
  }
  function buildDiffHTML(a, b){
    const A = a.split('\n'), B = b.split('\n');
    const lcs = Array(A.length+1).fill(null).map(()=>Array(B.length+1).fill(0));
    for(let i=A.length-1;i>=0;i--){
      for(let j=B.length-1;j>=0;j--){
        lcs[i][j] = A[i]===B[j] ? 1 + lcs[i+1][j+1] : Math.max(lcs[i+1][j], lcs[i][j+1]);
      }
    }
    const out = [];
    let i=0,j=0;
    while(i<A.length && j<B.length){
      if(A[i]===B[j]){ out.push({type:'eq', text:A[i]}); i++; j++; }
      else if(lcs[i+1][j] >= lcs[i][j+1]){ out.push({type:'del', text:A[i]}); i++; }
      else { out.push({type:'add', text:B[j]}); j++; }
    }
    while(i<A.length){ out.push({type:'del', text:A[i++]}); }
    while(j<B.length){ out.push({type:'add', text:B[j++]}); }

    return out.map(seg=>{
      if(seg.type==='add') return `<div class="diff-add">+ ${escapeHtml(seg.text)}</div>`;
      if(seg.type==='del') return `<div class="diff-del">- ${escapeHtml(seg.text)}</div>`;
      return `<div class="diff-eq">&nbsp; ${escapeHtml(seg.text)}</div>`;
    }).join('');
  }
  $('#exportHistory')?.addEventListener('click', ()=>{
    const versions = loadVersions();
    const blob = new Blob([JSON.stringify(versions,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historico-peticao-${Date.now()}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
    addAudit('EXPORT', { kind:'history-json' });
  });
  $('#btnRestore')?.addEventListener('click', ()=>{
    const v = getVersionById(compareB.value);
    if(!v){ toast('Selecione a versão B.'); return; }
    localStorage.setItem('draft_peticao', JSON.stringify(v.data));
    loadDraftToForm();
    setStep(8);
    toast('Versão restaurada no formulário.');
  });
  $('#btnDelete')?.addEventListener('click', ()=>{
    const id = compareB.value;
    const versions = loadVersions().filter(v=> v.id!==id);
    saveVersions(versions);
    renderVersionList();
    fillCompareSelects();
    diffView.innerHTML = '';
    toast('Versão excluída.');
  });

  // ===== Modo Equipe (templates & packs)
  $('#btnEquipe')?.addEventListener('click', ()=>{ openTeam(); });
  $('#closeTeam')?.addEventListener('click', ()=> teamModal.classList.add('hidden'));
  function openTeam(){
    renderTplList(); renderPackList();
    clearTplForm(); clearPackForm();
    teamModal.classList.remove('hidden');
  }
  function renderTplList(){
    const list = loadTeamTemplates();
    teamTplList.innerHTML = list.map(x=>`<li data-id="${x.id}"><strong>${x.name}</strong><small class="muted" style="display:block">${x.updated||''}</small></li>`).join('');
    teamTplList.querySelectorAll('li').forEach(li=>{
      li.onclick = ()=>{
        teamTplList.querySelectorAll('li').forEach(n=>n.classList.remove('active'));
        li.classList.add('active');
        const item = list.find(i=> i.id===li.dataset.id);
        teamTplName.value = item?.name||'';
        teamTplJson.value = JSON.stringify(item?.payload||{}, null, 2);
      };
    });
  }
  function renderPackList(){
    const list = loadPacks();
    packList.innerHTML = list.map(x=>`<li data-id="${x.id}"><strong>${x.name}</strong><small class="muted" style="display:block">${x.updated||''}</small></li>`).join('');
    packList.querySelectorAll('li').forEach(li=>{
      li.onclick = ()=>{
        packList.querySelectorAll('li').forEach(n=>n.classList.remove('active'));
        li.classList.add('active');
        const item = list.find(i=> i.id===li.dataset.id);
        packName.value = item?.name||'';
        packLines.value = (item?.lines||[]).join('\n');
      };
    });
  }
  function clearTplForm(){ teamTplName.value=''; teamTplJson.value=''; }
  function clearPackForm(){ packName.value=''; packLines.value=''; }

  $('#teamTplNew')?.addEventListener('click', ()=>{ clearTplForm(); teamTplList.querySelectorAll('li').forEach(n=>n.classList.remove('active')); });
  $('#teamTplSave')?.addEventListener('click', ()=>{
    try{
      const name = teamTplName.value.trim(); if(!name) return toast('Nome do template obrigatório.');
      const payload = JSON.parse(teamTplJson.value||'{}');
      const list = loadTeamTemplates();
      const active = teamTplList.querySelector('li.active');
      if(active){
        const idx = list.findIndex(i=> i.id===active.dataset.id);
        list[idx] = { ...list[idx], name, payload, updated: new Date().toLocaleString('pt-BR') };
      }else{
        list.unshift({ id: uid(), name, payload, created: new Date().toLocaleString('pt-BR'), updated: new Date().toLocaleString('pt-BR') });
      }
      saveTeamTemplates(list); renderTplList(); toast('Template salvo.');
    }catch{ toast('JSON inválido no template.'); }
  });
  $('#teamTplDelete')?.addEventListener('click', ()=>{
    const active = teamTplList.querySelector('li.active'); if(!active) return toast('Selecione um template.');
    saveTeamTemplates(loadTeamTemplates().filter(i=> i.id!==active.dataset.id));
    renderTplList(); clearTplForm(); toast('Excluído.');
  });
  $('#teamTplExport')?.addEventListener('click', ()=>{
    const active = teamTplList.querySelector('li.active'); if(!active) return toast('Selecione um template.');
    const item = loadTeamTemplates().find(i=> i.id===active.dataset.id);
    const blob = new Blob([JSON.stringify(item,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`template-${item.name}.json`; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  });
  $('#teamTplImportBtn')?.addEventListener('click', ()=> teamTplImport.click());
  $('#teamTplImport')?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    const text = await f.text();
    try{
      const item = JSON.parse(text);
      if(!item.name || !item.payload) throw new Error();
      const list = loadTeamTemplates(); list.unshift({ id: uid(), ...item, updated: new Date().toLocaleString('pt-BR') });
      saveTeamTemplates(list); renderTplList(); toast('Template importado.');
    }catch{ toast('Arquivo inválido.'); }
  });
  $('#teamTplApply')?.addEventListener('click', ()=>{
    const active = teamTplList.querySelector('li.active'); if(!active) return toast('Selecione um template.');
    const item = loadTeamTemplates().find(i=> i.id===active.dataset.id);
    const p = item.payload||{};
    if(p.fatos){ const f=$('#fatos'); f.value = (f.value? f.value+'\n\n':'') + p.fatos; }
    if(Array.isArray(p.fundamentos)){
      const cur = ($('#fundamentos').value||'').split('\n').map(s=>s.trim()).filter(Boolean);
      p.fundamentos.forEach(l=>{ if(!cur.includes(l)) cur.push(l); });
      $('#fundamentos').value = cur.join('\n');
    }
    if(Array.isArray(p.pedidos)){
      const titulosExist = new Set(getPedidos().map(x=>x.titulo.toLowerCase()));
      p.pedidos.forEach(x=>{
        if(!titulosExist.has((x.t||'').toLowerCase())){
          addPedido(x.t||'Pedido');
          const last = $all('.pedido').slice(-1)[0];
          $('.pedido-detalhe', last).value = x.d||'';
          if(Array.isArray(x.sub) && x.sub.length){
            const cont = $('.subpedidos', last);
            x.sub.forEach(s=> addSubpedido(cont, s));
          }
        }
      });
    }
    if(Array.isArray(p.provas)){ p.provas.forEach(x=> addProva(x)); }
    buildValoresFromPedidos();
    addAudit('TEMPLATE', { action:'apply_team', name: item?.name||'' });
    toast('Template de equipe aplicado.');
  });

  // Packs
  $('#packNew')?.addEventListener('click', ()=>{ clearPackForm(); packList.querySelectorAll('li').forEach(n=>n.classList.remove('active')); });
  $('#packSave')?.addEventListener('click', ()=>{
    const name = packName.value.trim(); if(!name) return toast('Nome do pacote obrigatório.');
    const lines = (packLines.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
    const list = loadPacks();
    const active = packList.querySelector('li.active');
    if(active){
      const idx = list.findIndex(i=> i.id===active.dataset.id);
      list[idx] = { ...list[idx], name, lines, updated: new Date().toLocaleString('pt-BR') };
    }else{
      list.unshift({ id: uid(), name, lines, created: new Date().toLocaleString('pt-BR'), updated: new Date().toLocaleString('pt-BR') });
    }
    savePacks(list); renderPackList(); toast('Pacote salvo.');
  });
  $('#packDelete')?.addEventListener('click', ()=>{
    const active = packList.querySelector('li.active'); if(!active) return toast('Selecione um pacote.');
    savePacks(loadPacks().filter(i=> i.id!==active.dataset.id));
    renderPackList(); clearPackForm(); toast('Excluído.');
  });
  $('#packExport')?.addEventListener('click', ()=>{
    const active = packList.querySelector('li.active'); if(!active) return toast('Selecione um pacote.');
    const item = loadPacks().find(i=> i.id===active.dataset.id);
    const blob = new Blob([JSON.stringify(item,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`fund-pack-${item.name}.json`; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  });
  $('#packImportBtn')?.addEventListener('click', ()=> packImport.click());
  $('#packImport')?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    const text = await f.text();
    try{
      const item = JSON.parse(text);
      if(!item.name || !Array.isArray(item.lines)) throw new Error();
      const list = loadPacks(); list.unshift({ id: uid(), ...item, updated: new Date().toLocaleString('pt-BR') });
      savePacks(list); renderPackList(); toast('Pacote importado.');
    }catch{ toast('Arquivo inválido.'); }
  });
  $('#packApply')?.addEventListener('click', ()=>{
    const active = packList.querySelector('li.active'); if(!active) return toast('Selecione um pacote.');
    const item = loadPacks().find(i=> i.id===active.dataset.id);
    const cur = ($('#fundamentos').value||'').split('\n').map(s=>s.trim()).filter(Boolean);
    item.lines.forEach(l=>{ if(!cur.includes(l)) cur.push(l); });
    $('#fundamentos').value = cur.join('\n');
    addAudit('PACK', { action:'apply', name: item?.name||'' });
    toast('Fundamentos aplicados.');
  });

  // Export/Import all
  $('#btnExportAll')?.addEventListener('click', ()=>{
    const data = { templates: loadTeamTemplates(), packs: loadPacks(), exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='equipe-presets.json'; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  });
  $('#btnImportAll')?.addEventListener('click', ()=>{
    const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange = async (e)=>{
      const f = e.target.files?.[0]; if(!f) return;
      try{
        const text = await f.text(); const data = JSON.parse(text);
        if(Array.isArray(data.templates)) saveTeamTemplates(data.templates);
        if(Array.isArray(data.packs)) savePacks(data.packs);
        renderTplList(); renderPackList(); toast('Coleção importada.');
      }catch{ toast('JSON inválido.'); }
    };
    inp.click();
  });

  // Locks por seção
  function initLocks(){
    $all('fieldset.step').forEach((fs, idx)=>{
      let ctl = document.createElement('div');
      ctl.className='row end'; ctl.style.margin='-8px 0 8px';
      ctl.innerHTML = `<button type="button" class="mini" data-lock-step="${idx}">🔒 Bloquear/Desbloquear seção</button>`;
      fs.prepend(ctl);
      applyLockToFieldset(idx, lockedSteps.has(idx));
    });
    $all('button[data-lock-step]').forEach(btn=>{
      btn.onclick = ()=>{
        const stepIdx = Number(btn.getAttribute('data-lock-step'));
        const isLocked = lockedSteps.has(stepIdx);
        if(isLocked) lockedSteps.delete(stepIdx); else lockedSteps.add(stepIdx);
        localStorage.setItem(LOCK_KEY, JSON.stringify([...lockedSteps]));
        applyLockToFieldset(stepIdx, !isLocked);
        addAudit('LOCK', { step: stepIdx, locked: !isLocked });
        toast(!isLocked?'Seção bloqueada.':'Seção desbloqueada.');
      };
    });
  }
  function applyLockToFieldset(idx, lock){
    const fs = $all('fieldset.step')[idx]; if(!fs) return;
    fs.classList.toggle('locked', !!lock);
    fs.disabled = !!lock;
    const btn = fs.querySelector('button[data-lock-step]');
    if(btn){ btn.disabled = false; btn.tabIndex = 0; }
  }
  initLocks();

  // ===== Auditoria modal
  $('#btnAudit')?.addEventListener('click', ()=> openAudit());
  $('#auditClose')?.addEventListener('click', ()=> auditModal.classList.add('hidden'));
  $('#auditFilter')?.addEventListener('change', ()=> renderAuditList());
  $('#auditExport')?.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(loadAudit(),null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`audit-${Date.now()}.json`; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  });
  $('#auditClear')?.addEventListener('click', ()=>{ saveAudit([]); renderAuditList(); auditDetail.textContent=''; toast('Auditoria limpa.'); });
  $('#auditCopy')?.addEventListener('click', async ()=>{ await navigator.clipboard.writeText(auditDetail.textContent||''); toast('Detalhe copiado.'); });
  function openAudit(){ renderAuditList(); auditDetail.textContent=''; auditModal.classList.remove('hidden'); }
  function renderAuditList(){
    const filter = auditFilter?.value||'';
    const items = loadAudit().filter(i=> !filter || i.type===filter);
    auditList.innerHTML = items.map(i=>`
      <li data-id="${i.id}">
        <strong>${i.type}</strong> — ${new Date(i.at).toLocaleString('pt-BR')}
        <small>${i.user||'—'}</small>
      </li>
    `).join('');
    auditList.querySelectorAll('li').forEach(li=>{
      li.onclick = ()=>{
        const id = li.getAttribute('data-id');
        const it = items.find(x=>x.id===id);
        auditDetail.textContent = JSON.stringify(it, null, 2);
      };
    });
  }

  // ===== Templates por tipo de ação + blocos inteligentes
  $('#aplicarTemplate')?.addEventListener('click', ()=> applyTemplate());
  $('#limparTemplate')?.addEventListener('click', ()=> clearTemplateFields());
  $('#tipoAcao')?.addEventListener('change', ()=> applyTemplate());
  function applyTemplate(){
    const key = selTipoAcao?.value;
    if(!key || !TEMPLATES[key]){ toast('Selecione um tipo de ação.'); return; }
    const tpl = TEMPLATES[key];

    const f = $('#fatos');
    f.value = (f.value? f.value.trim()+'\n\n' : '') + tpl.fatos;

    const baseFund = $('#fundamentos').value ? $('#fundamentos').value.split('\n').map(s=>s.trim()).filter(Boolean) : [];
    tpl.fundamentos.forEach(l=>{ if(!baseFund.includes(l)) baseFund.push(l); });
    $('#fundamentos').value = baseFund.join('\n');

    const titulosExist = new Set(getPedidos().map(p=>p.titulo.toLowerCase()));
    tpl.pedidos.forEach(p=>{
      if(!titulosExist.has(p.t.toLowerCase())){
        addPedido(p.t);
        const last = $all('.pedido').slice(-1)[0];
        $('.pedido-detalhe', last).value = p.d;
      }
    });

    (tpl.provas||[]).forEach(p=> addProva(p));

    $all('.blk:checked').forEach(chk=> applySmartBlock(chk.value));

    if(step<7) setStep(7); else buildValoresFromPedidos();
    addAudit('TEMPLATE', { action:'apply', tipo: selTipoAcao?.value || '', blocks: $all('.blk:checked').map(b=>b.value) });
    saveVersion('template');
    toast('Template aplicado.');
  }
  function clearTemplateFields(){
    const isTplPedido = (t)=> {
      const all = [
        ...Object.values(TEMPLATES).flatMap(x=>x.pedidos.map(p=>p.t)),
        ...Object.values(SMART_BLOCKS).filter(b=>b.t).map(b=>b.t)
      ].map(s=>s.toLowerCase());
      return all.includes((t||'').toLowerCase());
    };
    $all('.pedido').forEach(p=>{
      const t = $('.pedido-titulo', p).value;
      if(isTplPedido(t)) p.remove();
    });
    const allProvas = new Set(Object.values(TEMPLATES).flatMap(x=>x.provas||[]).map(s=>s.toLowerCase()));
    $all('.prova-texto').forEach(i=>{ if(allProvas.has((i.value||'').toLowerCase())) i.closest('.prova')?.remove(); });

    const allFund = new Set(Object.values(TEMPLATES).flatMap(x=>x.fundamentos).map(s=>s.trim()));
    const cur = ($('#fundamentos').value||'').split('\n').map(s=>s.trim()).filter(Boolean);
    $('#fundamentos').value = cur.filter(l=> !allFund.has(l)).join('\n');

    buildValoresFromPedidos();
    addAudit('TEMPLATE', { action:'clear' });
    toast('Itens de template removidos.');
  }
  function applySmartBlock(key){
    const blk = SMART_BLOCKS[key]; if(!blk) return;
    if(blk.t){
      const has = getPedidos().some(p=> p.titulo.toLowerCase() === blk.t.toLowerCase());
      if(!has){
        addPedido(blk.t);
        const last = $all('.pedido').slice(-1)[0];
        $('.pedido-detalhe', last).value = blk.d || '';
        const reflex = $all('.blk').find(b=> b.value==='reflexos')?.checked;
        if(reflex && Array.isArray(SMART_BLOCKS.reflexos.sub)){
          const cont = $('.subpedidos', last);
          SMART_BLOCKS.reflexos.sub.forEach(s=> addSubpedido(cont, s));
        }
      }
    } else if(blk.sub){
      $all('.pedido').forEach(card=>{
        const cont = $('.subpedidos', card);
        blk.sub.forEach(s=>{
          const exists = $all('.subpedido-txt', cont).some(i=> i.value.toLowerCase()===s.toLowerCase());
          if(!exists) addSubpedido(cont, s);
        });
      });
    }
  }

  // ===== Perícia
  const PER_KEY='pericia_pack_v1';
  function perSum(){
    const h = parseFloat(perHonor.value||'0')||0;
    const a = parseFloat(perAdiant.value||'0')||0;
    perTotal.textContent = fmtBRL(h + a);
  }
  [perHonor, perAdiant].forEach(el=> el?.addEventListener('input', perSum));
  perObs?.addEventListener('input', savePericiaToCache);
  [perTipo, perQuesitos, perHonor, perAdiant].forEach(el=> el?.addEventListener('input', savePericiaToCache));
  function savePericiaToCache(){
    const pack = {
      tipo: perTipo.value,
      quesitos: perQuesitos.value,
      honor: perHonor.value,
      adiant: perAdiant.value,
      obs: perObs.value
    };
    localStorage.setItem(PER_KEY, JSON.stringify(pack));
  }
  function loadPericiaFromCache(){
    const raw = localStorage.getItem(PER_KEY); if(!raw) return perSum();
    try{
      const p = JSON.parse(raw);
      if(p.tipo) perTipo.value = p.tipo;
      perQuesitos.value = p.quesitos||'';
      perHonor.value = p.honor||'';
      perAdiant.value = p.adiant||'';
      perObs.value = p.obs||'';
      perSum();
    }catch{}
  }
  function renderPerChecklist(){
    const items = PERICIA_CHECKLIST[perTipo.value]||[];
    if(!perChecklist) return;
    perChecklist.innerHTML = '';
    items.forEach(t=>{
      const li = document.createElement('li'); li.textContent = `• ${t}`;
      perChecklist.appendChild(li);
    });
  }
  $('#btnPericia')?.addEventListener('click', ()=>{ openPericia(); });
  $('#perClose')?.addEventListener('click', ()=> periciaModal.classList.add('hidden'));
  function openPericia(){
    loadPericiaFromCache();
    renderPerChecklist();
    periciaModal.classList.remove('hidden');
  }
  $('#perLoadPreset')?.addEventListener('click', ()=>{
    const arr = QUESITOS_PRESETS[perTipo.value]||[];
    perQuesitos.value = arr.map((q,i)=> `${i+1}) ${q}`).join('\n');
    renderPerChecklist();
    toast('Quesitos padrão carregados.');
  });
  $('#perTipo')?.addEventListener('change', renderPerChecklist);
  $('#perAddQ')?.addEventListener('click', ()=>{
    const lines = perQuesitos.value.trim().split('\n').filter(Boolean);
    lines.push(`${lines.length+1}) `);
    perQuesitos.value = lines.join('\n');
  });
  $('#perApplyToForm')?.addEventListener('click', ()=>{
    if(perQuesitos.value.trim()){
      addProva(`Quesitos ao perito (${perTipo.options[perTipo.selectedIndex].text}): ${perQuesitos.value.split('\n').slice(0,1)[0] || 'ver lista completa'}`);
    }
    const base = {
      insalubridade: ["CLT 189–192", "NR-15 (Anexos)"],
      periculosidade: ["CLT 193", "NR-16"],
      noturno: ["CLT 73", "Súmula TST 60"]
    }[perTipo.value] || [];
    if(base.length){
      const cur = ($('#fundamentos').value||'').split('\n').map(s=>s.trim()).filter(Boolean);
      base.forEach(l=>{ if(!cur.includes(l)) cur.push(l); });
      $('#fundamentos').value = cur.join('\n');
    }
    savePericiaToCache();
    addAudit('PACK', { action:'apply_pericia', tipo: perTipo.value });
    toast('Perícia inserida no caso.');
  });
  $('#perExport')?.addEventListener('click', ()=>{
    const header = `Quesitos — ${perTipo.options[perTipo.selectedIndex].text}\n\n`;
    const body = perQuesitos.value || '';
    const obs = perObs.value ? `\n\nObservações: ${perObs.value}\n` : '';
    const custos = `\nHonorários: ${fmtBRL(parseFloat(perHonor.value||0))} | Adiantamento: ${fmtBRL(parseFloat(perAdiant.value||0))}\n`;
    const blob = new Blob([header + body + obs + custos], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `quesitos-${perTipo.value}.txt`; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
    addAudit('EXPORT', { kind:'quesitos-txt', tipo: perTipo.value });
    toast('Quesitos exportados.');
  });

  // ===== Calculadora
  $('#btnCalc')?.addEventListener('click', ()=>{
    if(!(c_sal.value||'').trim()){
      const sal = parseFloat(($('#salario').value||'').replace(',','.'))||0;
      if(sal>0) c_sal.value = sal.toFixed(2);
    }
    calcModal.classList.remove('hidden');
    calcUpdate();
  });
  $('#calcClose')?.addEventListener('click', ()=> calcModal.classList.add('hidden'));
  [c_sal,c_sem,c_meses,c_he50,c_he100,c_not,c_not_perc,c_uteis,c_desc].forEach(el=>{
    el?.addEventListener('input', calcUpdate);
  });
  function calcUpdate(){
    const sal = parseFloat(c_sal.value||0)||0;
    const sem = parseFloat(c_sem.value||44)||44;
    const meses = parseFloat(c_meses.value||1)||1;

    const h50 = parseFloat(c_he50.value||0)||0;
    const h100 = parseFloat(c_he100.value||0)||0;
    const hNot = parseFloat(c_not.value||0)||0;
    const pNot = (parseFloat(c_not_perc.value||20)||20)/100;

    const uteis = parseFloat(c_uteis.value||22)||22;
    const desc = parseFloat(c_desc.value||8)||8;

    const hora = sem>0 ? sal/(sem*4.5) : 0;
    const valHE = (h50*hora*1.5) + (h100*hora*2);
    const valNot = hNot*hora*pNot;
    const valDSR = uteis>0 ? (valHE/uteis)*desc : 0;

    const totalMes = valHE + valNot + valDSR;
    const totalPer = totalMes * meses;

    c_hora.textContent = fmtBRL(hora);
    c_val_he.textContent = fmtBRL(valHE);
    c_val_not.textContent = fmtBRL(valNot);
    c_val_dsr.textContent = fmtBRL(valDSR);
    c_total_mes.textContent = fmtBRL(totalMes);
    c_total_per.textContent = fmtBRL(totalPer);
    return { hora, valHE, valNot, valDSR, totalMes, totalPer };
  }
  $('#calcApply')?.addEventListener('click', ()=>{
    const res = calcUpdate();

    ensurePedido('Horas Extras', `Estimativa com base em ${c_he50.value||0}h (50%) e ${c_he100.value||0}h (100%) por mês, divisor ${c_sem.value||44}×4,5.`);
    ensurePedido('Adicional Noturno', `Estimativa sobre ${c_not.value||0}h/mês com ${c_not_perc.value||20}%`);
    ensurePedido('DSR sobre Horas Extras', `Método proporcional (extras/dias úteis × descansos)`);

    buildValoresFromPedidos();

    setValorByTitulo('Horas Extras', res.valHE * (parseFloat(c_meses.value||1)||1));
    setValorByTitulo('Adicional Noturno', res.valNot * (parseFloat(c_meses.value||1)||1));
    setValorByTitulo('DSR sobre Horas Extras', res.valDSR * (parseFloat(c_meses.value||1)||1));

    sumValores();
    calcModal.classList.add('hidden');
    toast('Valores estimados aplicados.');
    addAudit?.('PACK', { action:'calc_apply', meses: Number(c_meses.value||1) });
  });
  function ensurePedido(titulo, detalhe=''){
    const has = getPedidos().some(p=> p.titulo.toLowerCase()===titulo.toLowerCase());
    if(!has){
      addPedido(titulo);
      const last = $all('.pedido').slice(-1)[0];
      $('.pedido-detalhe', last).value = detalhe;
    }
  }
  function setValorByTitulo(titulo, valor){
    const items = $all('.valor-item');
    let row = [...items].find(it=> $('.valor-titulo', it)?.value?.toLowerCase()===titulo.toLowerCase());
    if(!row){
      const extra = document.createElement('div');
      extra.className = 'valor-item';
      extra.innerHTML = `
        <div class="grid">
          <label>Pedido
            <input type="text" class="valor-titulo" value="${titulo}"/>
          </label>
          <label>Valor estimado (R$)
            <input type="number" class="valor-num" min="0" step="0.01" />
          </label>
        </div>`;
      valoresWrap.appendChild(extra);
      row = extra;
    }
    const num = $('.valor-num', row);
    if(num){ num.value = (valor||0).toFixed(2); }
  }

  // ===== Dossiê
  const DOS_KEY='dos_pack_v1';
  function loadDos(){ return JSON.parse(localStorage.getItem(DOS_KEY)||'null'); }
  function saveDos(p){ localStorage.setItem(DOS_KEY, JSON.stringify(p)); }
  function addDocRow({titulo='',tipo='PDF',pag='—'}={}){
    const row = document.createElement('div');
    row.className='valor-item';
    row.innerHTML=`
      <div class="grid" style="grid-template-columns:1fr 120px 120px">
        <label>Título <input type="text" class="dos-titulo" value="${titulo}"></label>
        <label>Tipo <input type="text" class="dos-tipo" value="${tipo}"></label>
        <label>Páginas <input type="text" class="dos-pag" value="${pag}"></label>
      </div>
      <div class="row end"><button class="mini danger dos-del" type="button">remover</button></div>
    `;
    dosDocs.appendChild(row);
    $('.dos-del',row).onclick=()=> row.remove();
  }
  $('#btnDossie')?.addEventListener('click', ()=>{
    dossieModal.classList.remove('hidden');
    dosDocs.innerHTML='';
    const d = collectAll();
    const base = (d.provas||[]).map((p,i)=>({ titulo:`${p}`, tipo:'PDF', pag:'—' }));
    const essentials = [
      { titulo:'Procuração/mandato', tipo:'PDF', pag:'—' },
      { titulo:'Comprovação de hipossuficiência (se houver)', tipo:'PDF', pag:'—' },
      { titulo:'Documentos pessoais do Reclamante', tipo:'PDF', pag:'—' },
    ];
    [...essentials, ...base].forEach(addDocRow);
    const cache = loadDos();
    if(cache){
      dosOrgao.value = cache.orgao||'';
      dosRef.value = cache.ref||'';
      dosResp.value = cache.resp||'';
      dosObs.value = cache.obs||'';
      if(Array.isArray(cache.docs) && cache.docs.length){
        dosDocs.innerHTML='';
        cache.docs.forEach(addDocRow);
      }
    }
    buildDossiePreview();
  });
  $('#dosClose')?.addEventListener('click', ()=> dossieModal.classList.add('hidden'));
  [dosOrgao,dosRef,dosResp,dosObs].forEach(el=> el?.addEventListener('input', ()=>{ saveDosPack(); buildDossiePreview(); }));
  $('#dosAdd')?.addEventListener('click', ()=>{ addDocRow({}); });
  $('#dosBuild')?.addEventListener('click', ()=> buildDossiePreview());
  $('#dosCopyHtml')?.addEventListener('click', async ()=>{
    const wrap=document.createElement('div'); wrap.innerHTML = buildDossieHTML(collectAll(), readDosDocs());
    await navigator.clipboard.writeText(wrap.innerHTML); toast('HTML do dossiê copiado.');
  });
  $('#dosPrint')?.addEventListener('click', ()=>{
    if(!dosPreview.innerHTML.trim()) buildDossiePreview();
    window.print();
  });
  function readDosDocs(){
    return $all('.valor-item', dosDocs).map(el=>({
      titulo: sanitize($('.dos-titulo', el).value), 
      tipo: sanitize($('.dos-tipo', el).value), 
      pag: sanitize($('.dos-pag', el).value)
    })).filter(x=>x.titulo);
  }
  function saveDosPack(){
    saveDos({ orgao:dosOrgao.value, ref:dosRef.value, resp:dosResp.value, obs:dosObs.value, docs: readDosDocs() });
  }
  function buildDossieHTML(d, docs){
    const capa = `
    <div class="doc">
      <h1>${sanitize(dosOrgao.value||d.juizo||'Vara do Trabalho')}</h1>
      <p class="center"><span class="bold">Reclamante:</span> ${sanitize(d.reclamante?.nome||'—')}</p>
      <p class="center"><span class="bold">Reclamadas:</span> ${d.reclamadas.map(r=>sanitize(r.nome)).join(' | ')||'—'}</p>
      ${dosRef.value?`<p class="center"><span class="bold">Referência interna:</span> ${sanitize(dosRef.value)}</p>`:''}
      <br/><br/>
      <p class="center">PETIÇÃO INICIAL TRABALHISTA</p>
      <br/><br/><br/>
      <p class="right">${new Date().toLocaleDateString('pt-BR')}</p>
      <p class="right">${sanitize(dosResp.value||'')}</p>
      <div class="page-break"></div>
    </div>`;

    const sumario = `
    <div class="doc">
      <h2>Sumário de Documentos</h2>
      <ol>
        ${docs.map((x,i)=> `<li><span class="bold">${i+1}. ${escapeHtml(x.titulo)}</span> — ${escapeHtml(x.tipo)} — pág. ${escapeHtml(x.pag||'—')}</li>`).join('')}
      </ol>
      ${dosObs.value?`<p><em>${escapeHtml(dosObs.value)}</em></p>`:''}
    </div>`;

    return capa + sumario;
  }
  function buildDossiePreview(){
    const d = collectAll();
    const html = buildDossieHTML(d, readDosDocs());
    dosPreview.innerHTML = html;
    addAudit?.('EXPORT', { kind:'dossie-preview' });
  }

  // ===== Lint extra recomendação já adicionada na runLint

});
