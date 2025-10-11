/* Clara – App JS (completo)
   - Tema claro/escuro + toasts
   - Wizard com 9 etapas
   - Sugestões por tema (fatos, fundamentos, pedidos) com filtros
   - Upload de PDF/TXT (PDF.js) para leitura local (modelo e docs)
   - Pedidos dinâmicos + cálculo de Valor da Causa
   - Gerador de Prompt e chamada OpenAI (chat.completions)
   - Histórico de versões (compare, restaurar, excluir, exportar)
   - Auditoria (eventos, filtro, exportar, copiar)
   - Equipe: Templates e Pacotes de Fundamentos (CRUD + aplicar)
   - Perícia: cálculo, quesitos, export .txt, checklist
   - Dossiê de Protocolo: montar lista e prévia impressa
   - Exportar PDF/DOCX (com verificação de libs) + imprimir/HTML copy
   - Importar/Exportar JSON do caso
*/
(() => {
  // ----------------------- Helpers/DOM -----------------------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const fmt = v => (Number.isFinite(v)? v:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const unfmt = s => Number(String(s||'').replace(/[^\d,-]/g,'').replace(/\./g,'').replace(',','.'))||0;
  const uid = (p='id') => p+'_'+Math.random().toString(36).slice(2,8);
  const nowISO = () => new Date().toISOString();

  // ----------------------- Toasts -----------------------
  const toasts = $('#toasts');
  function toast(msg, type='good', t=3000){
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    toasts?.appendChild(el);
    setTimeout(()=>{ el.remove(); }, t);
  }

  // ----------------------- Theme -----------------------
  on($('#btnTheme'),'click', () => {
    document.body.classList.toggle('theme-dark');
    const dark = document.body.classList.contains('theme-dark');
    $('#btnTheme').textContent = 'Tema: ' + (dark ? 'Escuro' : 'Claro');
    logAudit('LOCK','THEME', {dark});
  });

  // ----------------------- State -----------------------
  const state = {
    step: 0,
    docsText: '',
    tplText: '',
    pedidos: [],         // mirror do DOM para export
    valores: {},         // nome->valor
    history: [],         // versões
    audit: [],           // eventos
    teamTemplates: [],   // {id,name,json}
    fundPacks: [],       // {id,name,lines[]}
    config: JSON.parse(localStorage.getItem('cfg')||'{}')
  };

  // Persistência simples
  function saveLS(key, data){ localStorage.setItem(key, JSON.stringify(data)); }
  function loadLS(key, fallback){ try{ return JSON.parse(localStorage.getItem(key))||fallback; }catch{ return fallback; } }

  // ----------------------- Auditoria -----------------------
  function logAudit(type, label, detail){
    const item = { ts: nowISO(), type, label, detail };
    state.audit.push(item);
    saveLS('audit', state.audit);
    // stream na UI se aberta
    const li = document.createElement('li');
    li.textContent = `[${item.ts}] ${type} · ${label}`;
    $('#auditList')?.appendChild(li);
  }
  function initAudit(){
    state.audit = loadLS('audit', []);
    const list = $('#auditList'); if(!list) return;
    list.innerHTML = '';
    state.audit.forEach((a, idx) => {
      const li = document.createElement('li');
      li.textContent = `[${a.ts}] ${a.type} · ${a.label}`;
      li.dataset.idx = idx;
      on(li,'click',()=>{
        $$('#auditList li').forEach(x=>x.classList.remove('active'));
        li.classList.add('active');
        $('#auditDetail').textContent = JSON.stringify(a, null, 2);
      });
      list.appendChild(li);
    });
    on($('#auditFilter'),'change', e => {
      list.innerHTML = '';
      state.audit.filter(a => !e.target.value || a.type===e.target.value).forEach((a,idx)=>{
        const li = document.createElement('li');
        li.textContent = `[${a.ts}] ${a.type} · ${a.label}`;
        on(li,'click',()=> $('#auditDetail').textContent = JSON.stringify(a, null, 2));
        list.appendChild(li);
      });
    });
    on($('#auditCopy'),'click',()=>{
      navigator.clipboard.writeText($('#auditDetail').textContent||'').then(()=>toast('Detalhe copiado','good'));
    });
    on($('#auditExport'),'click',()=>{
      downloadJSON('audit.json', state.audit);
      logAudit('EXPORT','AUDIT', {count: state.audit.length});
      toast('Auditoria exportada','good');
    });
    on($('#auditClear'),'click',()=>{
      if(!confirm('Limpar auditoria?')) return;
      state.audit = [];
      saveLS('audit', state.audit);
      list.innerHTML = '';
      $('#auditDetail').textContent = '';
      toast('Auditoria limpa','warn');
    });
  }

  // ----------------------- Histórico -----------------------
  function snapshotVersion(){
    const v = {
      id: uid('v'),
      ts: nowISO(),
      step: state.step,
      case: extractCase(),
      prompt: $('#saida').value,
      ia: $('#saidaIa').value
    };
    state.history.unshift(v);
    saveLS('history', state.history);
    logAudit('VERSION','SNAPSHOT', {id:v.id});
    paintHistory();
  }
  function paintHistory(){
    const ul = $('#versionList'); if(!ul) return;
    ul.innerHTML='';
    state.history.forEach(v=>{
      const li = document.createElement('li');
      li.textContent = `${new Date(v.ts).toLocaleString('pt-BR')} · ${v.id}`;
      li.dataset.id = v.id;
      on(li,'click',()=>{
        $$('#versionList li').forEach(x=>x.classList.remove('active'));
        li.classList.add('active');
        // select in dropdowns
        addOptionIfMissing($('#compareA'), v.id);
        addOptionIfMissing($('#compareB'), v.id);
        $('#compareB').value = v.id;
      });
      ul.appendChild(li);
    });
    // refresh selects
    const A = $('#compareA'), B = $('#compareB');
    A.innerHTML = ''; B.innerHTML='';
    state.history.forEach(v => {
      const o1 = new Option(`${v.id} @ ${new Date(v.ts).toLocaleString('pt-BR')}`, v.id);
      const o2 = o1.cloneNode(true);
      A.add(o1); B.add(o2);
    });
  }
  function addOptionIfMissing(sel, val){
    if(!Array.from(sel.options).some(o=>o.value===val)){
      sel.add(new Option(val, val));
    }
  }
  function getVersion(id){ return state.history.find(v=>v.id===id); }
  function diff(a,b){
    // simples line-by-line
    const sa = JSON.stringify(a, null, 2).split('\n');
    const sb = JSON.stringify(b, null, 2).split('\n');
    const max = Math.max(sa.length,sb.length);
    const out=[];
    for(let i=0;i<max;i++){
      const la=sa[i]||'', lb=sb[i]||'';
      if(la===lb){ out.push('  '+la); }
      else{ out.push('- '+la); out.push('+ '+lb); }
    }
    return out.join('\n');
  }
  function initHistory(){
    state.history = loadLS('history', []);
    paintHistory();
    on($('#btnHistory'),'click', ()=> { $('#historyModal').classList.remove('hidden'); logAudit('LOCK','HISTORY_OPEN'); });
    on($('#closeHistory'),'click', ()=> $('#historyModal').classList.add('hidden'));
    on($('#exportHistory'),'click',()=>{
      downloadJSON('history.json', state.history);
      logAudit('EXPORT','HISTORY',{count:state.history.length});
      toast('Histórico exportado','good');
    });
    on($('#btnCompare'),'click',()=>{
      const A = getVersion($('#compareA').value);
      const B = getVersion($('#compareB').value);
      if(!A||!B){ toast('Selecione A e B','warn'); return; }
      $('#diffView').textContent = diff(A.case, B.case);
      logAudit('VERSION','COMPARE',{A:A.id,B:B.id});
    });
    on($('#btnRestore'),'click',()=>{
      const B = getVersion($('#compareB').value); if(!B){ toast('Selecione B','warn'); return; }
      hydrateCase(B.case);
      $('#saida').value = B.prompt||'';
      $('#saidaIa').value = B.ia||'';
      toast('Versão restaurada','good');
      logAudit('VERSION','RESTORE',{id:B.id});
    });
    on($('#btnDelete'),'click',()=>{
      const id = $('#compareB').value; if(!id) return;
      state.history = state.history.filter(v=>v.id!==id);
      saveLS('history', state.history);
      paintHistory();
      toast('Versão excluída','warn');
      logAudit('VERSION','DELETE',{id});
    });
  }

  // ----------------------- Equipe: Templates & Fundamentos -----------------------
  function initTeam(){
    state.teamTemplates = loadLS('teamTemplates', []);
    state.fundPacks = loadLS('fundPacks', []);
    paintTeamLists();
    // open/close
    on($('#btnEquipe'),'click',()=> $('#teamModal').classList.remove('hidden'));
    on($('#closeTeam'),'click',()=> $('#teamModal').classList.add('hidden'));
    // templates
    on($('#teamTplNew'),'click',()=>{
      $('#teamTplName').value='';
      $('#teamTplJson').value='{"tipoAcao":"horas_extras","fundamentos":[],"pedidos":[]}';
    });
    on($('#teamTplSave'),'click',()=>{
      const name = $('#teamTplName').value.trim();
      const json = $('#teamTplJson').value;
      if(!name){ toast('Dê um nome ao template','warn'); return; }
      let parsed;
      try{ parsed = JSON.parse(json); }catch{ toast('JSON inválido','bad'); return; }
      const ex = state.teamTemplates.find(t=>t.name===name);
      if(ex){ ex.json = parsed; }
      else{ state.teamTemplates.push({id:uid('tpl'), name, json:parsed}); }
      saveLS('teamTemplates', state.teamTemplates);
      paintTeamLists();
      toast('Template salvo','good'); logAudit('TEMPLATE','SAVE',{name});
    });
    on($('#teamTplApply'),'click',()=>{
      const name = $('#teamTplName').value.trim();
      const tpl = state.teamTemplates.find(t=>t.name===name);
      if(!tpl){ toast('Template não encontrado','warn'); return; }
      applyTemplateToForm(tpl.json);
      toast('Template aplicado no formulário','good'); logAudit('TEMPLATE','APPLY',{name});
    });
    on($('#teamTplDelete'),'click',()=>{
      const name = $('#teamTplName').value.trim();
      state.teamTemplates = state.teamTemplates.filter(t=>t.name!==name);
      saveLS('teamTemplates', state.teamTemplates);
      paintTeamLists(); toast('Template excluído','warn'); logAudit('TEMPLATE','DELETE',{name});
    });
    on($('#teamTplExport'),'click',()=>{
      downloadJSON('templates.json', state.teamTemplates);
      toast('Templates exportados','good');
    });
    on($('#teamTplImportBtn'),'click',()=> $('#teamTplImport').click());
    on($('#teamTplImport'),'change', async (e)=>{
      const f = e.target.files?.[0]; if(!f) return;
      try{
        const t = JSON.parse(await f.text());
        state.teamTemplates = t; saveLS('teamTemplates', t);
        paintTeamLists(); toast('Templates importados','good');
      }catch{ toast('Arquivo inválido','bad'); }
    });

    // packs
    on($('#packNew'),'click',()=>{
      $('#packName').value='';
      $('#packLines').value='CLT art. 58\nCLT art. 59\nSúmula 338';
    });
    on($('#packSave'),'click',()=>{
      const name = $('#packName').value.trim();
      const lines = $('#packLines').value.split('\n').map(s=>s.trim()).filter(Boolean);
      if(!name){ toast('Dê um nome ao pacote','warn'); return; }
      const ex = state.fundPacks.find(p=>p.name===name);
      if(ex){ ex.lines = lines; }
      else{ state.fundPacks.push({id:uid('pack'), name, lines}); }
      saveLS('fundPacks', state.fundPacks);
      paintTeamLists(); toast('Pacote salvo','good'); logAudit('PACK','SAVE',{name});
    });
    on($('#packApply'),'click',()=>{
      const name = $('#packName').value.trim();
      const p = state.fundPacks.find(x=>x.name===name);
      if(!p){ toast('Pacote não encontrado','warn'); return; }
      const cur = $('#fundamentos').value.split('\n').filter(Boolean);
      $('#fundamentos').value = Array.from(new Set(cur.concat(p.lines))).join('\n');
      toast('Fundamentos aplicados','good'); logAudit('PACK','APPLY',{name});
    });
    on($('#packDelete'),'click',()=>{
      const name = $('#packName').value.trim();
      state.fundPacks = state.fundPacks.filter(p=>p.name!==name);
      saveLS('fundPacks', state.fundPacks);
      paintTeamLists(); toast('Pacote excluído','warn'); logAudit('PACK','DELETE',{name});
    });
    on($('#packExport'),'click',()=>{
      downloadJSON('fund_packs.json', state.fundPacks);
      toast('Pacotes exportados','good');
    });
    on($('#packImportBtn'),'click',()=> $('#packImport').click());
    on($('#packImport'),'change', async (e)=>{
      const f = e.target.files?.[0]; if(!f) return;
      try{
        const t = JSON.parse(await f.text());
        state.fundPacks = t; saveLS('fundPacks', t);
        paintTeamLists(); toast('Pacotes importados','good');
      }catch{ toast('Arquivo inválido','bad'); }
    });

    on($('#btnExportAll'),'click',()=>{
      downloadJSON('collection.json', {templates: state.teamTemplates, packs: state.fundPacks});
      toast('Coleção exportada','good');
    });
    on($('#btnImportAll'),'click',()=>{
      const i = document.createElement('input');
      i.type='file'; i.accept='application/json';
      on(i,'change', async e=>{
        const f = e.target.files?.[0]; if(!f) return;
        try{
          const j = JSON.parse(await f.text());
          if(j.templates) state.teamTemplates = j.templates;
          if(j.packs) state.fundPacks = j.packs;
          saveLS('teamTemplates', state.teamTemplates);
          saveLS('fundPacks', state.fundPacks);
          paintTeamLists(); toast('Coleção importada','good');
        }catch{ toast('Arquivo inválido','bad'); }
      });
      i.click();
    });
  }
  function paintTeamLists(){
    // templates
    const ul = $('#teamTplList'); if(ul){
      ul.innerHTML='';
      state.teamTemplates.forEach(t=>{
        const li = document.createElement('li');
        li.textContent = t.name;
        on(li,'click',()=>{
          $$('#teamTplList li').forEach(x=>x.classList.remove('active'));
          li.classList.add('active');
          $('#teamTplName').value = t.name;
          $('#teamTplJson').value = JSON.stringify(t.json, null, 2);
        });
        ul.appendChild(li);
      });
    }
    // packs
    const up = $('#packList'); if(up){
      up.innerHTML='';
      state.fundPacks.forEach(p=>{
        const li = document.createElement('li');
        li.textContent = p.name;
        on(li,'click',()=>{
          $$('#packList li').forEach(x=>x.classList.remove('active'));
          li.classList.add('active');
          $('#packName').value = p.name;
          $('#packLines').value = p.lines.join('\n');
        });
        up.appendChild(li);
      });
    }
  }
  function applyTemplateToForm(tpl){
    // tipoAcao
    if(tpl.tipoAcao) $('#tipoAcao').value = tpl.tipoAcao;
    // fundamentos
    if(Array.isArray(tpl.fundamentos)){
      const cur = $('#fundamentos').value.split('\n').filter(Boolean);
      $('#fundamentos').value = Array.from(new Set(cur.concat(tpl.fundamentos))).join('\n');
    }
    // pedidos
    if(Array.isArray(tpl.pedidos)){
      tpl.pedidos.forEach(p => addPedido(p.nome||p, p.base||'', p.desc||'', p.val||''));
      rebuildValores();
    }
  }

  // ----------------------- Perícia -----------------------
  function initPericia(){
    on($('#btnPericia'),'click',()=> $('#periciaModal').classList.remove('hidden'));
    on($('#perClose'),'click',()=> $('#periciaModal').classList.add('hidden'));
    const calc = () => {
      const h = Number($('#perHonor').value||0);
      const a = Number($('#perAdiant').value||0);
      $('#perTotal').textContent = fmt(h - a);
    };
    ['input','change'].forEach(ev=>{
      on($('#perHonor'),ev,calc);
      on($('#perAdiant'),ev,calc);
    });
    on($('#perLoadPreset'),'click',()=>{
      const tipo = $('#perTipo').value;
      const map = {
        insalubridade: ["Descrever atividades e agentes nocivos.","Informar EPI fornecido e eficácia.","Medições conforme NR-15."],
        periculosidade: ["Descrever contato com inflamáveis/eletricidade.","Analisar tempo de exposição.","NR-16 aplicável?"],
        noturno: ["Jornadas entre 22h-5h.","Prorrogação após 5h.","Registros de ponto e recibos."]
      };
      $('#perQuesitos').value = (map[tipo]||[]).map((q,i)=>`${i+1}) ${q}`).join('\n');
      toast('Quesitos padrão carregados','good');
    });
    on($('#perAddQ'),'click',()=>{
      const cur = $('#perQuesitos').value;
      $('#perQuesitos').value = (cur?cur+'\n':'') + (($('#perQuesitos').value.split('\n').length+1)+') Novo quesito');
    });
    on($('#perApplyToForm'),'click',()=>{
      const bloco = `PERÍCIA: ${$('#perTipo').value}\nHonorários: ${$('#perHonor').value}\nAdiantamento: ${$('#perAdiant').value}\nQuesitos:\n${$('#perQuesitos').value}\nObs:\n${$('#perObs').value}`;
      $('#fundamentos').value = ($('#fundamentos').value? $('#fundamentos').value+'\n':'') + bloco;
      toast('Perícia inserida no caso','good');
    });
    on($('#perExport'),'click',()=>{
      const txt = `Quesitos de Perícia\nTipo: ${$('#perTipo').value}\n\n${$('#perQuesitos').value}\n\nObs:\n${$('#perObs').value}`;
      downloadText('quesitos.txt', txt);
      toast('Quesitos exportados','good');
    });
  }

  // ----------------------- Dossiê -----------------------
  function initDossie(){
    on($('#btnDossie'),'click',()=> $('#dossieModal').classList.remove('hidden'));
    on($('#dosClose'),'click',()=> $('#dossieModal').classList.add('hidden'));
    on($('#dosAdd'),'click',()=>{
      const id = uid('doc');
      const d = document.createElement('div');
      d.className='row gap';
      d.dataset.id=id;
      d.innerHTML = `<input placeholder="Nome do documento" style="flex:1">
                     <input placeholder="Nº / Ref.">
                     <button class="mini danger" type="button">remover</button>`;
      d.querySelector('.danger').onclick = ()=> d.remove();
      $('#dosDocs').appendChild(d);
    });
    on($('#dosBuild'),'click',()=>{
      const org = $('#dosOrgao').value;
      const ref = $('#dosRef').value;
      const resp = $('#dosResp').value;
      const obs = $('#dosObs').value;
      const docs = Array.from($('#dosDocs').children).map(r=>{
        const [a,b] = r.querySelectorAll('input');
        return `• ${a.value} (${b.value})`;
      }).join('\n');
      const html = `<div class="print-area"><h2>Dossiê de Protocolo</h2>
        <p><b>Órgão/Seção:</b> ${org}<br><b>Ref. interna:</b> ${ref}<br><b>Responsável:</b> ${resp}</p>
        <h3>Documentos</h3><pre>${docs}</pre>
        <h3>Observações</h3><p>${obs}</p></div>`;
      $('#dosPreview').innerHTML = html;
      toast('Prévia atualizada','good');
    });
    on($('#dosCopyHtml'),'click',()=>{
      navigator.clipboard.writeText($('#dosPreview').innerText).then(()=>toast('HTML copiado','good'));
    });
    on($('#dosPrint'),'click',()=> window.print());
  }

  // ----------------------- Calculadora -----------------------
  function initCalc(){
    on($('#btnCalc'),'click',()=> $('#calcModal').classList.remove('hidden'));
    on($('#calcClose'),'click',()=> $('#calcModal').classList.add('hidden'));
    const recompute = ()=>{
      const sal = Number($('#c_sal').value||0);
      const sem = Number($('#c_sem').value||44);
      const meses = Number($('#c_meses').value||1);
      const he50 = Number($('#c_he50').value||0);
      const he100= Number($('#c_he100').value||0);
      const noth = Number($('#c_not').value||0);
      const notp = Number($('#c_not_perc').value||20)/100;
      const uteis= Number($('#c_uteis').value||22);
      const desc = Number($('#c_desc').value||8);
      const valorHora = (sal / (sem*4.5)) || 0;
      const vhe = (he50*valorHora*1.5 + he100*valorHora*2);
      const vnot= (noth*valorHora* (1+notp));
      const dsr = (vhe / Math.max(1,uteis))*desc;
      const mes = vhe + vnot + dsr;
      const per = mes * meses;
      $('#c_hora').textContent = fmt(valorHora);
      $('#c_val_he').textContent = fmt(vhe);
      $('#c_val_not').textContent = fmt(vnot);
      $('#c_val_dsr').textContent = fmt(dsr);
      $('#c_total_mes').textContent = fmt(mes);
      $('#c_total_per').textContent = fmt(per);
    };
    ['c_sal','c_sem','c_meses','c_he50','c_he100','c_not','c_not_perc','c_uteis','c_desc'].forEach(id=>{
      on($('#'+id),'input',recompute);
      on($('#'+id),'change',recompute);
    });
    on($('#calcApply'),'click',()=>{
      const total = $('#c_total_per').textContent;
      // aplica no último pedido ou cria um
      let last = $$('#pedidosWrap .pedido').slice(-1)[0];
      if(!last){ addPedido('Horas Extras 50%'); last = $$('#pedidosWrap .pedido').slice(-1)[0]; }
      last.querySelector('[name=p_val]').value = total;
      rebuildValores();
      toast('Estimativa aplicada ao último pedido','good');
    });
    recompute();
  }

  // ----------------------- Catálogo temático -----------------------
  const CATS = {
    horas_extras: {
      title: "Horas Extras",
      fatos: [
        "Jornada habitual superior a 8h diárias e 44h semanais sem pagamento integral",
        "Cartões de ponto com marcações invariáveis (presunção de veracidade invertida)",
        "Compensação irregular/banco de horas sem acordo válido"
      ],
      fundamentos: [
        "CF/88 art. 7º XIII e XVI",
        "CLT arts. 58, 59, 74 §2º",
        "Súmula TST 85 (compensação)",
        "Súmula TST 338 (cartão de ponto)",
        "Súmula TST 264 (base de cálculo HE)",
        "OJ 415 (reflexos das HE)"
      ],
      pedidos: [
        "Horas extras 50% com reflexos",
        "Horas extras 100% (domingos/feriados)",
        "Integração ao DSR, 13º, férias+1/3, FGTS+40%",
        "Multa do art. 477 se rescisão"
      ]
    },
    intervalo: {
      title: "Intervalo Intrajornada",
      fatos: [
        "Intervalo intrajornada suprimido parcial/totais em jornadas superiores a 6h",
        "Escala que inviabiliza pausa adequada (picos de atendimento, plantões)"
      ],
      fundamentos: [
        "CLT art. 71 e §4º (redação conforme período)",
        "Súmula TST 437",
        "NR-17 ergonomia (apoio)"
      ],
      pedidos: [
        "Pagamento de 1h extra por dia de supressão com adicional de 50%",
        "Reflexos em DSR/13º/férias+1/3/FGTS"
      ]
    },
    adicional_noturno: {
      title: "Adicional Noturno",
      fatos: [
        "Trabalho entre 22h e 5h com pagamento parcial/inexistente",
        "Prorrogação de jornada noturna após 5h sem adicional"
      ],
      fundamentos: [
        "CLT art. 73",
        "Súmula TST 60 (prorrogação do noturno)"
      ],
      pedidos: [
        "Adicional noturno + reflexos",
        "Prorrogação de noturno após 5h com adicional"
      ]
    },
    rescisao_indireta: {
      title: "Rescisão Indireta",
      fatos: [
        "Atrasos reiterados de salários/FGTS",
        "Exigência de atividades além do contrato com prejuízo",
        "Assédio/rigor excessivo, ambiente hostil"
      ],
      fundamentos: [
        "CLT art. 483 (alíneas)",
        "CF/88 art. 1º, III; art. 7º",
        "Súmula TST 212 (ônus rescisão)"
      ],
      pedidos: [
        "Reconhecimento da rescisão indireta",
        "Verbas rescisórias como dispensa sem justa causa",
        "Liberação do FGTS + 40% e seguro-desemprego"
      ]
    },
    equiparacao: {
      title: "Equiparação Salarial",
      fatos: [
        "Funções idênticas com mesmo empregador/localidade e produtividade equivalente",
        "Tempo na função não superior a 2 anos em relação ao paradigma"
      ],
      fundamentos: [
        "CLT art. 461",
        "Súmula TST 6"
      ],
      pedidos: [
        "Diferenças salariais com reflexos",
        "Anotações/retificação em CTPS"
      ]
    },
    insalubridade: {
      title: "Insalubridade",
      fatos: [
        "Exposição habitual a agentes nocivos (químicos, biológicos, físicos)",
        "EPI ineficaz/fornecimento irregular"
      ],
      fundamentos: [
        "CLT art. 189-192",
        "NR-15 (Anexos)",
        "Súmula TST 289 (EPI)"
      ],
      pedidos: [
        "Adicional de insalubridade (grau a apurar) + reflexos",
        "Perícia técnica com quesitos"
      ]
    },
    periculosidade: {
      title: "Periculosidade",
      fatos: [
        "Contato permanente com inflamáveis/eletricidade/roubos (segurança)"
      ],
      fundamentos: [
        "CLT art. 193",
        "NR-16 (Anexos)",
        "Súmula TST 364"
      ],
      pedidos: [
        "Adicional de periculosidade + reflexos",
        "Perícia técnica com quesitos"
      ]
    },
    fgts_multa: {
      title: "FGTS e Multas",
      fatos: [
        "Ausência de depósitos mensais de FGTS",
        "Pagamento rescisório fora do prazo"
      ],
      fundamentos: [
        "Lei 8.036/90 (FGTS)",
        "CLT art. 477 (multa)",
        "CLT art. 467 (verbas incontroversas)"
      ],
      pedidos: [
        "Regularização FGTS + 40%",
        "Multa do art. 477",
        "Multa do art. 467"
      ]
    },
    dano_moral: {
      title: "Dano Moral",
      fatos: [
        "Ofensas reiteradas perante colegas/clientes",
        "Humilhação pública/rigor excessivo",
        "Condições indignas de trabalho"
      ],
      fundamentos: [
        "CF/88 art. 1º, III; art. 5º X",
        "CLT art. 223-A e seguintes",
        "Súmula TST 392 (competência)"
      ],
      pedidos: [
        "Indenização por dano moral (valor a arbitrar)"
      ]
    }
  };
  const THEMES = Object.keys(CATS);

  function fillThemeSelects(){
    const opts = THEMES.map(k => `<option value="${k}">${CATS[k].title}</option>`).join('');
    $('#fatosTema').innerHTML = opts;
    $('#fundTema').innerHTML = opts;
    $('#pedidoTema').innerHTML = opts;
  }
  function fillFacts(theme){
    const list = CATS[theme]?.fatos || [];
    const sel = $('#fatosSug'); sel.innerHTML='';
    list.forEach(s => { const o=document.createElement('option'); o.textContent = s; sel.appendChild(o); });
  }
  function fillFundamentos(theme){
    const list = CATS[theme]?.fundamentos || [];
    const sel = $('#fundSelect'); sel.innerHTML='';
    list.forEach(s => { const o=document.createElement('option'); o.textContent = s; sel.appendChild(o); });
  }
  function fillPedidos(theme){
    const list = CATS[theme]?.pedidos || [];
    const chips = $('#pedidoChips'); chips.innerHTML='';
    list.forEach(p => { const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=p; b.addEventListener('click',()=>addPedido(p)); chips.appendChild(b); });
  }

  // ----------------------- Wizard -----------------------
  const stepsEls = $$('#stepsList li');
  function setStep(n){
    state.step = Math.max(0, Math.min(8, n));
    $$('#wizard .step').forEach((f,i)=>f.classList.toggle('hidden', i!==state.step));
    stepsEls.forEach((li,i)=>li.classList.toggle('active', i===state.step));
    $('#progress span').style.width = (state.step/8*100)+'%';
    logAudit('LOCK','STEP', {step: state.step});
  }
  on($('#btnIniciar'),'click', ()=>{ $('#intro').classList.add('hidden'); $('#wizard').classList.remove('hidden'); setStep(0); toast('Novo caso iniciado','good'); });
  on($('#btnPrev'),'click', ()=> setStep(state.step-1));
  on($('#btnNext'),'click', ()=> setStep(state.step+1));

  // ----------------------- Partes: Reclamadas dinâmicas -----------------------
  on($('#addReclamada'),'click', () => {
    const tpl = document.createElement('div');
    tpl.className='card subtle reclamada';
    tpl.innerHTML = $('#reclamadasWrap .reclamada').innerHTML;
    tpl.querySelector('.btnRemoveReclamada').onclick = ()=> tpl.remove();
    $('#reclamadasWrap').appendChild(tpl);
    toast('Reclamada adicionada','good');
  });
  $$('.btnRemoveReclamada').forEach(b=> b.onclick = (e)=> e.currentTarget.closest('.reclamada').remove());

  // ----------------------- Pedidos + Valores -----------------------
  function addPedido(nome='', base='', desc='', val=''){
    const wrap = $('#pedidosWrap');
    const d = document.createElement('div');
    d.className='pedido';
    d.innerHTML = `
      <div class="grid">
        <label>Pedido <input name="p_nome" value="${nome}"></label>
        <label>Base legal <input name="p_base" value="${base}" placeholder="Ex.: CLT art. 71; Súmula 437"></label>
      </div>
      <div class="subpedido-row">
        <input name="p_desc" value="${desc}" placeholder="Descrição adicional" style="flex:1">
        <input name="p_val" value="${val}" placeholder="Valor estimado (R$)" style="width:220px">
        <button type="button" class="mini danger">remover</button>
      </div>`;
    d.querySelector('.danger').onclick = ()=>{ d.remove(); rebuildValores(); };
    d.querySelector('[name=p_val]').addEventListener('input', rebuildValores);
    wrap.appendChild(d);
    rebuildValores();
  }
  on($('#addPedido'),'click', ()=> addPedido(''));

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

  // ----------------------- Uploads PDF/TXT -----------------------
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
  on($('#docUpload'),'change', async (e)=>{
    let acc='';
    const files = Array.from(e.target.files||[]);
    for(const f of files){
      if(f.type==='application/pdf'){ acc += await pdfToText(f); toast(`PDF lido: ${f.name}`,'good'); }
      else if(f.type.startsWith('text/')){ acc += await f.text(); toast(`TXT lido: ${f.name}`,'good'); }
      else { toast(`Tipo não suportado: ${f.name}`,'warn'); }
    }
    state.docsText = acc.slice(0, 120000);
    logAudit('FIELD','DOCS_UPLOAD',{len: state.docsText.length});
  });
  on($('#tplPdf'),'change', async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    if(f.type!=='application/pdf'){ toast('Envie um PDF de modelo','warn'); return; }
    state.tplText = (await pdfToText(f)).slice(0, 60000);
    toast('Modelo PDF processado','good');
    logAudit('FIELD','TEMPLATE_PDF',{len: state.tplText.length});
  });

  // ----------------------- Sugestões (tema → selects) -----------------------
  on($('#fundSelect'),'change', ()=>{
    const linhas = Array.from($('#fundSelect').selectedOptions).map(o=>o.value);
    $('#fundamentos').value = Array.from(new Set((($('#fundamentos').value||'').split('\n').concat(linhas)).filter(Boolean))).join('\n');
  });
  on($('#fatosSug'),'change', ()=>{
    const textos = Array.from($('#fatosSug').selectedOptions).map(o=>`• ${o.value}`);
    const cur = $('#fatos').value ? $('#fatos').value + "\n" : "";
    $('#fatos').value = cur + textos.join('\n');
  });
  on($('#fatosTema'),'change', e => fillFacts(e.target.value));
  on($('#fundTema'),'change', e => fillFundamentos(e.target.value));
  on($('#pedidoTema'),'change', e => fillPedidos(e.target.value));

  // ----------------------- Prompt & OpenAI -----------------------
  function extractCase(){
    return {
      juizo: {num: $('#juizoNum').value, cidade: $('#cidade').value, uf: $('#uf').value},
      recl: {nome: $('#reclamante_nome').value, estado: $('#reclamante_estado_civil').value, prof: $('#reclamante_prof').value,
             cpf: $('#reclamante_cpf').value, rg: $('#reclamante_rg').value, email: $('#reclamante_email').value,
             tel: $('#reclamante_tel').value, cep: $('#reclamante_cep').value, end: $('#reclamante_end').value },
      recladas: $$('#reclamadasWrap .reclamada').map(r=> ({
        nome: r.querySelector('[name=reclamada_nome]').value,
        doc:  r.querySelector('[name=reclamada_doc]').value,
        email:r.querySelector('[name=reclamada_email]').value,
        tel:  r.querySelector('[name=reclamada_tel]').value,
        cep:  r.querySelector('[name=reclamada_cep]').value,
        end:  r.querySelector('[name=reclamada_end]').value
      })),
      contrato: {adm: $('#adm').value, saida: $('#saida').value, funcao: $('#funcao').value, salario: $('#salario').value, jornada: $('#jornada').value, controle: $('#controlePonto').value, deslig: $('#desligamento').value},
      fatos: $('#fatos').value,
      pedidos: $$('#pedidosWrap .pedido').map(p=> ({
        nome: p.querySelector('[name=p_nome]').value,
        base: p.querySelector('[name=p_base]').value,
        desc: p.querySelector('[name=p_desc]').value,
        val:  p.querySelector('[name=p_val]').value
      })),
      fundamentos: $('#fundamentos').value,
      valores:{valorCausa: $('#valorCausa').textContent, grat: $('#justicaGratuita').checked, honor: $('#honorarios').checked},
      anexos:{modeloPdf: state.tplText? 'sim':'não', docsLen: state.docsText.length}
    };
  }
  function buildPrompt(){
    const partes = extractCase();
    return `ATUE COMO ADVOGADO TRABALHISTA SÊNIOR.
Use o TEMPLATE (se houver) APENAS COMO ESTILO. Faça a peça inicial completa, estruturada e fundamentada.

DADOS DO CASO:
${JSON.stringify(partes, null, 2)}

SE HOUVER MODELO PDF (abaixo), OBSERVE TÍTULOS/ESTILO, NÃO COPIE ERROS:
<<<MODELO_PDF_INSPIRACAO>>>
${state.tplText || '(sem modelo)'}
<<<FIM_MODELO>>>

SE HOUVER DOCUMENTOS (holerites/ponto/etc), RESUMA E CONSISTENTIZE COM OS FATOS/PEDIDOS:
<<<DOCUMENTOS_TRANSCRITOS>>>
${state.docsText || '(sem docs)'}
<<<FIM_DOCS>>>

INSTRUÇÕES:
- Estruture com endereçamento, qualificação, fatos, fundamentos, pedidos, valor da causa e requerimentos finais.
- Use linguagem clara, técnica e objetiva.
- Numere itens e pedidos; destaque bases legais (CLT, CF/88, súmulas).
- Calcule valores quando possível com os dados fornecidos ou explique a metodologia.
- Inclua bloco de provas e protestos.
- Saída em texto puro, sem markdown.`;
  }
  on($('#btnGerar'),'click', ()=> { $('#saida').value = buildPrompt(); toast('Prompt gerado','good'); updateTokenInfo(); });

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
    logAudit('IA_RESPONSE','OK',{id:j.id, model:j.model});
    return j.choices?.[0]?.message?.content || '';
  }
  on($('#btnGerarIA'),'click', async ()=>{
    try{
      $('#loading').classList.remove('hidden');
      const prompt = buildPrompt();
      $('#saida').value = prompt;
      logAudit('IA_REQUEST','SEND',{len: prompt.length});
      const text = await callOpenAI(prompt);
      $('#saidaIa').value = text;
      toast('IA gerou a peça','good');
      setStep(8);
      $('#wizard').classList.add('hidden');
      $('#resultado').classList.remove('hidden');
      snapshotVersion();
      updateTokenInfo();
    }catch(e){
      $('#saidaIa').value = 'Falha ao gerar com ChatGPT: ' + e.message;
      toast('Erro ao gerar: verifique quota/chave','bad');
      logAudit('IA_RESPONSE','ERROR',{msg:e.message});
    }finally{
      $('#loading').classList.add('hidden');
    }
  });

  // ----------------------- Token estimate -----------------------
  function roughTokens(txt){ return Math.ceil((txt||'').length / 4); } // heurística
  function updateTokenInfo(){
    const p = roughTokens($('#saida').value);
    const r = roughTokens($('#saidaIa').value);
    $('#tokenInfo').textContent = `~${p}t prompt / ~${r}t resp.`;
  }

  // ----------------------- Resultado: copiar/exportar -----------------------
  on($('#copiar'),'click', ()=> navigator.clipboard.writeText($('#saida').value).then(()=>toast('Prompt copiado','good')));
  on($('#copiarIa'),'click', ()=> navigator.clipboard.writeText($('#saidaIa').value).then(()=>toast('Texto copiado','good')));
  on($('#copyHtml'),'click', ()=> {
    navigator.clipboard.writeText($('#previewDoc').innerHTML).then(()=>toast('HTML copiado','good'));
  });
  on($('#printDoc'),'click', ()=> window.print());

  // Export PDF (se jsPDF disponível)
  on($('#exportPdf'),'click', ()=>{
    if(!window.jspdf?.jsPDF){ toast('Biblioteca jsPDF não encontrada','warn'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt', format:'a4'});
    const text = $('#saidaIa').value || $('#saida').value;
    const lines = doc.splitTextToSize(text, 520);
    let y=60; doc.setFontSize(12);
    lines.forEach(l=>{ if(y>780){ doc.addPage(); y=60; } doc.text(l, 40, y); y+=16; });
    doc.save('peticao.pdf');
    logAudit('EXPORT','PDF',{pages: doc.getNumberOfPages()});
    toast('PDF exportado','good');
  });

  // Export DOCX (se docx disponível)
  on($('#exportDocx'),'click', async ()=>{
    if(!window.docx?.Document){ toast('Biblioteca docx não encontrada','warn'); return; }
    const { Document, Packer, Paragraph } = window.docx;
    const text = ($('#saidaIa').value || $('#saida').value).split('\n').map(t=> new Paragraph(t));
    const doc = new Document({ sections: [{ properties:{}, children: text }] });
    const blob = await Packer.toBlob(doc);
    downloadBlob('peticao.docx', blob);
    logAudit('EXPORT','DOCX',{ok:true});
    toast('DOCX exportado','good');
  });

  // JSON do caso
  on($('#btnExportJson'),'click', ()=>{
    downloadJSON('caso.json', extractCase());
    toast('JSON do caso exportado','good');
  });
  on($('#btnImportJson'),'click', ()=>{
    const i = document.createElement('input');
    i.type='file'; i.accept='application/json';
    on(i,'change', async e=>{
      const f = e.target.files?.[0]; if(!f) return;
      try{
        const j = JSON.parse(await f.text());
        hydrateCase(j); toast('Caso importado','good'); rebuildValores();
      }catch{ toast('Arquivo inválido','bad'); }
    });
    i.click();
  });

  function hydrateCase(c){
    $('#juizoNum').value = c.juizo?.num||'';
    $('#cidade').value = c.juizo?.cidade||'';
    $('#uf').value = c.juizo?.uf||'';
    $('#reclamante_nome').value = c.recl?.nome||'';
    $('#reclamante_estado_civil').value = c.recl?.estado||c.recl?.estado_civil||'';
    $('#reclamante_prof').value = c.recl?.prof||'';
    $('#reclamante_cpf').value = c.recl?.cpf||'';
    $('#reclamante_rg').value = c.recl?.rg||'';
    $('#reclamante_email').value = c.recl?.email||'';
    $('#reclamante_tel').value = c.recl?.tel||'';
    $('#reclamante_cep').value = c.recl?.cep||'';
    $('#reclamante_end').value = c.recl?.end||'';
    // recladas
    $('#reclamadasWrap').innerHTML = '';
    (c.recladas||[]).forEach(rc => {
      addReclamadaRow(rc);
    });
    // contrato
    $('#adm').value = c.contrato?.adm||'';
    $('#saida').value = c.contrato?.saida||'';
    $('#funcao').value = c.contrato?.funcao||'';
    $('#salario').value = c.contrato?.salario||'';
    $('#jornada').value = c.contrato?.jornada||'';
    $('#controlePonto').value = c.contrato?.controle||'';
    $('#desligamento').value = c.contrato?.deslig||'';
    // fatos/fundamentos/pedidos
    $('#fatos').value = c.fatos||'';
    $('#fundamentos').value = c.fundamentos||'';
    $('#pedidosWrap').innerHTML = '';
    (c.pedidos||[]).forEach(p=> addPedido(p.nome, p.base, p.desc, p.val));
    $('#justicaGratuita').checked = !!c.valores?.grat;
    $('#honorarios').checked = !!c.valores?.honor;
  }
  function addReclamadaRow(rc){
    const tpl = document.createElement('div');
    tpl.className='card subtle reclamada';
    tpl.innerHTML = $('#reclamadasWrap .reclamada')?.innerHTML || `
      <div class="grid">
        <label>Razão social / Nome <input name="reclamada_nome"></label>
        <label>CNPJ/CPF <input name="reclamada_doc"></label>
        <label>E-mail <input name="reclamada_email" type="email"></label>
        <label>Telefone <input name="reclamada_tel"></label>
        <label>CEP <input name="reclamada_cep"></label>
        <label>Endereço <input name="reclamada_end"></label>
      </div>
      <div class="row end"><button type="button" class="mini danger btnRemoveReclamada">remover</button></div>`;
    $('#reclamadasWrap').appendChild(tpl);
    tpl.querySelector('[name=reclamada_nome]').value = rc?.nome||'';
    tpl.querySelector('[name=reclamada_doc]').value = rc?.doc||'';
    tpl.querySelector('[name=reclamada_email]').value = rc?.email||'';
    tpl.querySelector('[name=reclamada_tel]').value = rc?.tel||'';
    tpl.querySelector('[name=reclamada_cep]').value = rc?.cep||'';
    tpl.querySelector('[name=reclamada_end]').value = rc?.end||'';
    tpl.querySelector('.btnRemoveReclamada').onclick = ()=> tpl.remove();
  }

  // ----------------------- Config Modal -----------------------
  on($('#btnConfig'),'click', ()=> $('#modal').classList.remove('hidden'));
  on($('#closeConfig'),'click', ()=> $('#modal').classList.add('hidden'));
  on($('#saveConfig'),'click', ()=>{
    state.config = {
      apiKey: $('#apiKey').value,
      model: $('#model').value,
      temperature: $('#temperature').value,
      maxTokens: $('#maxTokens').value
    };
    saveLS('cfg', state.config);
    $('#modal').classList.add('hidden');
    toast('Configuração salva','good');
  });

  // ----------------------- History/Audit buttons in header -----------------------
  on($('#btnAudit'),'click',()=> { $('#auditModal').classList.remove('hidden'); initAudit(); });
  on($('#auditClose'),'click',()=> $('#auditModal').classList.add('hidden'));

  // ----------------------- Revisão / Lint simples -----------------------
  function runLint(){
    const l = [];
    const c = extractCase();
    if(!c.recl?.nome) l.push('• Nome do reclamante não preenchido');
    if(!(c.recladas||[]).length) l.push('• Nenhuma reclamada informada');
    if(!c.contrato?.adm) l.push('• Data de admissão ausente');
    if(!c.fatos) l.push('• Narrativa de fatos vazia');
    if(!(c.pedidos||[]).length) l.push('• Nenhum pedido adicionado');
    $('#lintList').innerHTML = l.map(x=>`<li>${x}</li>`).join('');
    $('#review').textContent = JSON.stringify(c, null, 2);
  }

  // Botões de revisão
  on($('#btnSalvar'),'click', ()=>{ snapshotVersion(); toast('Rascunho salvo no histórico','good'); });
  on($('#btnForense'),'click', ()=>{ $('#previewDoc').innerText = $('#saidaIa').value || $('#saida').value; toast('Prévia atualizada','good'); runLint(); });

  // ----------------------- Utils de download -----------------------
  function downloadJSON(name, obj){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    downloadBlob(name, blob);
  }
  function downloadText(name, txt){
    const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
    downloadBlob(name, blob);
  }
  function downloadBlob(name, blob){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
  }

  // ----------------------- Init -----------------------
  function init(){
    // carregar LS
    state.audit = loadLS('audit', []);
    state.history = loadLS('history', []);
    state.teamTemplates = loadLS('teamTemplates', []);
    state.fundPacks = loadLS('fundPacks', []);

    // preencher selects de tema
    fillThemeSelects();
    const first = THEMES[0];
    fillFacts(first); fillFundamentos(first); fillPedidos(first);
    $('#fatosTema').value = first; $('#fundTema').value = first; $('#pedidoTema').value = first;

    // config defaults
    if(state.config.apiKey){ $('#apiKey').value = state.config.apiKey; }
    if(state.config.model){ $('#model').value = state.config.model; }
    setStep(0);

    // history paint, audit init lazy
    paintHistory();

    // revisão sempre na etapa 8
    const obs = new MutationObserver(()=>{
      if(!$('#wizard').classList.contains('hidden') && state.step===8){
        runLint();
      }
    });
    obs.observe($('#wizard'), {attributes:true, attributeFilter:['class']});
  }

  init();
})();
