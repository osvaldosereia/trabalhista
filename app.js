/********************************************
 * BLOCO 1 · ESTADO INICIAL E CONSTANTES
 ********************************************/
const PIECES = [
  // Por ora, somente Petição Inicial
  ['inicial_reclamacao','Petição Inicial – Reclamação']
];

const STEPS = [
  ['docs','Documentos'],
  ['config','Configuração'],
  ['partes','Partes'],
  ['contrato','Contrato'],
  ['blocos','Blocos & Condicionais'],
  ['provas','Provas & Anexos'],
  ['pedidos','Pedidos'],            // NOVO
  ['estilo','Estilo'],
  ['preview','Preview do Prompt']
];

// Catálogo de pedidos para Petição Inicial (pode crescer facilmente)
const CATALOGO_PEDIDOS = [
  {key:'vinculo_ctps', label:'Reconhecimento/retificação de vínculo e anotação em CTPS', fundamento:'CLT arts. 2º-3º'},
  {key:'verbas', label:'Pagamento de verbas (jornada, adicionais, rescisórias, FGTS, indenizações)', fundamento:'CLT/CF/Normas'},
  {key:'m477', label:'Multa do art. 477, §8º, CLT', fundamento:'CLT art. 477 §8º'},
  {key:'m467', label:'Multa do art. 467, CLT', fundamento:'CLT art. 467'},
  {key:'guias', label:'Entrega de TRCT, chave FGTS e guias do seguro-desemprego (ou indenização substitutiva)', fundamento:'CLT'},
  {key:'tutela', label:'Tutela de urgência (quando requerida)', fundamento:'CPC art. 300'},
  {key:'honorarios', label:'Honorários sucumbenciais', fundamento:'CLT art. 791-A'},
  {key:'correcao_juros', label:'Correção monetária e juros', fundamento:'Súmulas/precedentes'},
  {key:'oficios', label:'Expedição de ofícios (MPT/SRTE/INSS/CEF), se cabível', fundamento:'Poder geral de cautela'}
];

/********************************************
 * BLOCO 2 · MAPEAMENTO DE DOCUMENTOS
 ********************************************/
const DOC_TEMPLATES = {
  inicial_reclamacao: [
    {key:'cpf_rg',         label:'Documentos pessoais (RG/CPF)', fields:[
      'partes.reclamante.cpf','partes.reclamante.qualificacao','partes.reclamante.endereco'
    ]},
    {key:'comprov_endereco',label:'Comprovante de endereço', fields:['partes.reclamante.endereco']},
    {key:'ctps',           label:'CTPS (páginas do contrato)', fields:[
      'contrato.admissao','contrato.funcao','contrato.salario','contrato.cbo','contrato.ctps.status'
    ]},
    {key:'trct',           label:'TRCT', fields:[
      'rescisao.aviso.tipo','rescisao.decimo.status','rescisao.ferias.status'
    ]},
    {key:'chave_fgts',     label:'Chave/Extrato FGTS', fields:['fgts.diferencas','fgts.multa40']},
    {key:'holerites',      label:'Holerites/Recibos', fields:['contrato.salario','jornada.descricao']},
    {key:'espelhos_ponto', label:'Espelhos de ponto', fields:[
      'jornada.descricao','jornada.intervalos','jornada.hx.percentuais'
    ]},
    {key:'cct_act',        label:'CCT/ACT', fields:['normas.tipo','normas.id','normas.vigencia','normas.clausulas']},
    {key:'aso_ppra_ltc',   label:'ASO/PPRA/LTCAT/PCMSO', fields:[
      'adicionais.insal.grau','adicionais.insal.epi.status','adicionais.peric.agente'
    ]},
    {key:'comprovantes_sd',label:'Guias Seguro-Desemprego', fields:[]},
    {key:'laudos',         label:'Laudos/Relatórios técnicos', fields:[
      'adicionais.insal.grau','adicionais.peric.agente'
    ]}
  ]
};

/********************************************
 * BLOCO 3 · FORMULÁRIO PADRÃO E MEMÓRIA
 ********************************************/
const DEFAULT_FORM = {
  peca:"inicial_reclamacao",
  rito:"ordinario",
  metadados:{vara:"",comarca:"",UF:""},
  docsSelecionados:[],
  partes:{
    reclamante:{nome:"",cpf:"",qualificacao:"",endereco:"",contatos:""},
    reclamadas:[{razao:"",cnpj:"",endereco:"",contatos:""}]
  },
  contrato:{
    admissao:"",dispensa:"", aviso:{tipo:"indenizado",projecao:""},
    funcao:"",cbo:"", salario:"", variaveis:"",
    local:"", modo:"interno", ctps:{status:"sim",retificacoes:""}
  },
  blocos:{vinculo:true,jornada:true,adicionais:true,rescisao:true,fgts:true,estabilidades:false,indenizacoes:false,normas:false,tutela:false},
  jornada:{descricao:"", hx:{percentuais:"50%,100%"}, intervalos:"", dsr:"",regimes:"", sobreaviso:"", teletrabalho:""},
  adicionais:{noturno:{opcoes:"", justificativa:""}, insal:{ativo:false, grau:"", epi:{status:""}}, peric:{ativo:false, agente:""}},
  rescisao:{aviso:{tipo:"indenizado"},decimo:{status:"proporcional"},ferias:{status:"proporcionais"},multas:{m477:true,m467:true}},
  fgts:{diferencas:true,multa40:true,liberacao:true},
  estabilidades:{tipo:"",fatos:"",pretensao:"reintegracao"},
  indenizacoes:{morais:{ativo:false,fatos:""},materiais:{ativo:false,itens:""},existenciais:{ativo:false,fatos:""}},
  normas:{ativo:false,tipo:"CCT",id:"",vigencia:"", clausulas:""},
  tutela:{ativo:false, tipos:"", fundamentos:""},
  honorarios_atualizacao:{honorarios:"10%", indice:"IPCA-e", juros:"convencional"},
  valor_causa:{modo:"global", total:""},
  provas:{n_testemunhas:0, pericias:"", docs_exibir:"", oficios:""},
  pedidos:{
    selecionados: ['vinculo_ctps','verbas','m477','m467','guias','honorarios','correcao_juros','oficios'], // default
    personalizados: [] // [{texto:'Pedido X', fundamento:'…'}]
  },
  estilo:{
    centered_header:true, mostrar_identificacao_adv:true, mostrar_numero_processo:false,
    citacao_artigos:"texto_completo", citacao_sumulas_oj:"referencia_curta",
    jurisprudencia:"links_e_identificacao", fontes_obrigatorias:true,
    calculos:"tabelado", mostrar_formulas:false,
    pedidos_formato:"numerados_extenso", separar_fazer_pagar:true,
    tutela_destaque:"capitulo_padrao", caixas_titulo:true, linhas_separadoras:true
  },
  anexos:[]
};

let FORM = loadLocal() || clone(DEFAULT_FORM);
let currentStep = 'docs';
let piecesNav, stepsNav, main;

/********************************************
 * BLOCO 4 · HELPERS GERAIS
 ********************************************/
function qs(s,root=document){return root.querySelector(s)}
function qsa(s,root=document){return Array.from(root.querySelectorAll(s))}
function clone(o){return JSON.parse(JSON.stringify(o))}
function saveLocal(){localStorage.setItem('gpw:form', JSON.stringify(FORM))}
function loadLocal(){try{return JSON.parse(localStorage.getItem('gpw:form'))}catch{return null}}
function fmt(n){ if(n===''||n==null) return ''; const x=Number(String(n).replace(/\./g,'').replace(',','.')); return isFinite(x)?x.toLocaleString('pt-BR',{minimumFractionDigits:2}):n }
function dl(name, text){const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'})); a.download=name; a.click(); URL.revokeObjectURL(a.href)}
function copy(text){navigator.clipboard && navigator.clipboard.writeText(text)}
function getAt(obj,path){return path.split('.').reduce((o,k)=>o&&o[k],obj)}
function setAt(obj,path,val){const ks=path.split('.'); const last=ks.pop(); const tgt=ks.reduce((o,k)=>(o[k]??(o[k]={})),obj); tgt[last]=val}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

/********************************************
 * BLOCO 5 · LÓGICA DE DOCUMENTOS/ANEXOS
 ********************************************/
function docsDisponiveisDaPeca(){
  const base = DOC_TEMPLATES[FORM.peca] || [];
  // Unifica por key (evita duplicados)
  const byKey={}; base.forEach(d=>byKey[d.key]=d);
  return Object.values(byKey);
}
function hasDoc(key){return FORM.docsSelecionados.includes(key)}
function camposSupridosPorDocs(){
  const map = {};
  docsDisponiveisDaPeca().forEach(d=>{
    if(hasDoc(d.key)){ (d.fields||[]).forEach(f=>map[f]=true) }
  });
  return map;
}
// Força reprocessar campos marcados como "Documento anexo" (útil após mudar docs)
function applyDocsToUI(){ render(); debouncePreview() }

/********************************************
 * BLOCO 6 · UI: NAVEGAÇÃO
 ********************************************/
function renderNav(){
  piecesNav.innerHTML='';
  PIECES.forEach(([val,label])=>{
    const b=document.createElement('button');
    b.className='btn chip'+(FORM.peca===val?' active':'');
    b.textContent=label;
    b.onclick=()=>{
      FORM.peca=val;
      FORM.docsSelecionados=[];
      saveLocal(); render();
    };
    piecesNav.appendChild(b);
  });

  stepsNav.innerHTML='';
  STEPS.forEach(([id,label])=>{
    const b=document.createElement('button');
    b.className='btn'+(currentStep===id?' active':'');
    b.textContent=label;
    b.onclick=()=>{currentStep=id; render()};
    stepsNav.appendChild(b);
  });
}

/********************************************
 * BLOCO 7 · COMPONENTES DE FORM
 ********************************************/
function checkRow(label, path){
  const id='i_'+path.replace(/[^a-z0-9]/gi,'_');
  return `<div class="col-6 switch"><input id="${id}" type="checkbox" ${getAt(FORM,path)?'checked':''}> <label for="${id}" class="label">${label}</label></div>`;
}
function bindCheck(el, path){
  if(!el) return; el.checked=!!getAt(FORM,path);
  el.addEventListener('change',()=>{setAt(FORM,path, el.checked); saveLocal(); render(); debouncePreview()});
}
function selectRow(label, path, options){
  const id='i_'+path.replace(/[^a-z0-9]/gi,'_');
  const opts = options.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('');
  return `<div class="col-6"><div class="label">${label}</div><select id="${id}">${opts}</select></div>`;
}
function bindSelect(el, path){
  if(!el) return; el.value=getAt(FORM,path) ?? '';
  el.addEventListener('change',()=>{setAt(FORM,path, el.value); saveLocal(); render(); debouncePreview()});
}

// Campo com marcação “Documento anexo” automática
function fieldWithAnexo({label,path, type='text', placeholder='' , col='col-6'}){
  const supridos = camposSupridosPorDocs();
  const id = 'i_'+path.replace(/[^a-z0-9]/gi,'_');
  const idAnexo = id+'_anexo';
  const checked = !!supridos[path];
  const value = getAt(FORM,path) ?? '';
  const disabled = checked;

  return `
  <div class="${col}">
    <div class="label">${label}</div>
    <input id="${id}" type="${type}" placeholder="${placeholder}" ${disabled?'disabled':''} value="${escapeHtml(value)}"/>
    <div class="field-anexo">
      <input type="checkbox" id="${idAnexo}" ${checked?'checked':''}/>
      <label for="${idAnexo}">( ) Documento anexo</label>
      <small class="small">${checked?'marcado automaticamente pelos documentos escolhidos':'marque se virá do anexo'}</small>
    </div>
  </div>`;
}
function bindFieldWithAnexo(root,path){
  const id = '#i_'+path.replace(/[^a-z0-9]/gi,'_');
  const idAnexo = id+'_anexo';
  const input = qs(id,root);
  const check = qs(idAnexo,root);

  if(input){
    input.addEventListener('input',()=>{setAt(FORM,path, input.type==='number'?Number(input.value):input.value); saveLocal(); debouncePreview()});
    const val = getAt(FORM,path); if(val!=null) input.value = val;
  }
  if(check){
    check.addEventListener('change',()=>{
      if(input) input.disabled = check.checked;
      saveLocal(); debouncePreview();
    });
  }
}

/********************************************
 * BLOCO 8 · RENDERS POR ETAPA
 ********************************************/
function render(){
  renderNav();
  main.innerHTML='';

  // botão rápido para forçar reprocessar marcações de anexos
  const bar = document.createElement('div');
  bar.className='card section';
  bar.innerHTML = `<div class="row"><div class="col-12"><button class="btn" id="btnRefreshAnexos">Atualizar campos (anexos)</button></div></div>`;
  main.appendChild(bar);
  qs('#btnRefreshAnexos',bar).onclick = applyDocsToUI;

  if(currentStep==='docs')     renderDocs();
  if(currentStep==='config')   renderConfig();
  if(currentStep==='partes')   renderPartes();
  if(currentStep==='contrato') renderContrato();
  if(currentStep==='blocos')   renderBlocos();
  if(currentStep==='provas')   renderProvas();
  if(currentStep==='pedidos')  renderPedidos();     // NOVO
  if(currentStep==='estilo')   renderEstilo();
  if(currentStep==='preview')  renderPreview();
}

/* 8.1 Documentos */
function renderDocs(){
  const card=document.createElement('div'); card.className='card section';
  const docs = docsDisponiveisDaPeca();
  card.innerHTML = `
    <div class="label">1) Selecione os documentos que serão anexados ao prompt</div>
    <div class="row"><div class="col-12">
      <div class="doc-list">
        ${docs.map(d=>`
          <label class="doc-item">
            <span class="doc-label">${d.label}</span>
            <input type="checkbox" data-doc="${d.key}" ${hasDoc(d.key)?'checked':''}>
          </label>
        `).join('')}
      </div>
    </div></div>
    <div class="hr"></div>
    <div class="small">Ao marcar um documento aqui, os campos correspondentes nas demais etapas já aparecerão com <span class="kbd">( ) Documento anexo</span> marcado.</div>
  `;
  main.appendChild(card);

  qsa('[data-doc]',card).forEach(ch=>{
    ch.addEventListener('change',()=>{
      const key = ch.getAttribute('data-doc');
      if(ch.checked){ if(!hasDoc(key)) FORM.docsSelecionados.push(key) }
      else { FORM.docsSelecionados = FORM.docsSelecionados.filter(k=>k!==key) }
      saveLocal(); applyDocsToUI(); // reprocessa imediatamente as próximas páginas
    });
  });
}

/* 8.2 Configuração geral */
function renderConfig(){
  const c=document.createElement('div'); c.className='card section';
  c.innerHTML = `
    <div class="row">
      <div class="col-6">
        <div class="label">Rito</div>
        <select id="i_rito">
          <option value="ordinario">Ordinário</option>
          <option value="sumarissimo">Sumaríssimo</option>
        </select>
      </div>
      ${fieldWithAnexo({label:'Vara',path:'metadados.vara'})}
      ${fieldWithAnexo({label:'Comarca',path:'metadados.comarca'})}
      ${fieldWithAnexo({label:'UF',path:'metadados.UF'})}
    </div>
  `;
  main.appendChild(c);
  const sel=qs('#i_rito',c); sel.value=FORM.rito;
  sel.addEventListener('change',e=>{FORM.rito=e.target.value; saveLocal(); debouncePreview()});
  ['metadados.vara','metadados.comarca','metadados.UF'].forEach(p=>bindFieldWithAnexo(c,p));
}

/* 8.3 Partes */
function renderPartes(){
  const c=document.createElement('div'); c.className='card section';
  c.innerHTML = `
    <div class="row">
      ${fieldWithAnexo({label:'Reclamante — Nome',path:'partes.reclamante.nome'})}
      ${fieldWithAnexo({label:'Reclamante — CPF',path:'partes.reclamante.cpf'})}
      ${fieldWithAnexo({label:'Qualificação',path:'partes.reclamante.qualificacao'})}
      ${fieldWithAnexo({label:'Endereço',path:'partes.reclamante.endereco',col:'col-12'})}
      ${fieldWithAnexo({label:'Contatos',path:'partes.reclamante.contatos',col:'col-12'})}
    </div>
    <div class="hr"></div>
    <div class="label">Reclamadas</div>
    <div id="reclamadas"></div>
    <div><button class="btn" id="addRec">+ Adicionar Reclamada</button></div>
  `;
  main.appendChild(c);

  const wrap=qs('#reclamadas',c); wrap.innerHTML='';
  FORM.partes.reclamadas.forEach((rec,idx)=>{
    const g=document.createElement('div'); g.className='row';
    g.innerHTML = `
      ${fieldWithAnexo({label:'Razão Social',path:`partes.reclamadas.${idx}.razao`})}
      ${fieldWithAnexo({label:'CNPJ',path:`partes.reclamadas.${idx}.cnpj`})}
      ${fieldWithAnexo({label:'Endereço',path:`partes.reclamadas.${idx}.endereco`,col:'col-12'})}
      ${fieldWithAnexo({label:'Contatos',path:`partes.reclamadas.${idx}.contatos`,col:'col-12'})}
      <div class="col-12"><button class="btn" data-del="${idx}">Remover</button></div>
    `;
    wrap.appendChild(g);
    ['razao','cnpj','endereco','contatos'].forEach(k=>bindFieldWithAnexo(g,`partes.reclamadas.${idx}.${k}`));
    qs(`[data-del="${idx}"]`,g).onclick=()=>{
      FORM.partes.reclamadas.splice(idx,1);
      if(FORM.partes.reclamadas.length===0) FORM.partes.reclamadas.push({razao:"",cnpj:"",endereco:"",contatos:""});
      saveLocal(); render();
    };
  });
  qs('#addRec',c).onclick=()=>{FORM.partes.reclamadas.push({razao:"",cnpj:"",endereco:"",contatos:""}); saveLocal(); render();}
}

/* 8.4 Contrato */
function renderContrato(){
  const c=document.createElement('div'); c.className='card section';
  c.innerHTML = `
    <div class="row">
      ${fieldWithAnexo({label:'Admissão',path:'contrato.admissao',type:'date'})}
      ${fieldWithAnexo({label:'Dispensa',path:'contrato.dispensa',type:'date'})}
      <div class="col-6">
        <div class="label">Aviso</div>
        <select id="i_contrato_aviso_tipo">
          <option value="trabalhado">Trabalhado</option>
          <option value="indenizado">Indenizado</option>
        </select>
        <div class="small">Se constar no TRCT, marque “Documento anexo” nos campos relacionados.</div>
      </div>
      ${fieldWithAnexo({label:'Projeção do Aviso',path:'contrato.aviso.projecao',type:'date'})}
      ${fieldWithAnexo({label:'Função',path:'contrato.funcao'})}
      ${fieldWithAnexo({label:'CBO',path:'contrato.cbo'})}
      ${fieldWithAnexo({label:'Salário-base (R$)',path:'contrato.salario',type:'number'})}
      ${fieldWithAnexo({label:'Variáveis (texto)',path:'contrato.variaveis',col:'col-12'})}
      ${fieldWithAnexo({label:'Local',path:'contrato.local'})}
      <div class="col-6">
        <div class="label">Modo</div>
        <select id="i_contrato_modo">
          <option value="interno">Interno</option>
          <option value="externo">Externo</option>
          <option value="hibrido">Híbrido</option>
        </select>
      </div>
    </div>
    <div class="hr"></div>
    <div class="row">
      ${fieldWithAnexo({label:'CTPS anotada? (sim/não)',path:'contrato.ctps.status'})}
      ${fieldWithAnexo({label:'Retificações CTPS',path:'contrato.ctps.retificacoes',col:'col-12'})}
    </div>
  `;
  main.appendChild(c);
  qs('#i_contrato_aviso_tipo',c).value=FORM.contrato.aviso.tipo;
  qs('#i_contrato_modo',c).value=FORM.contrato.modo;
  qs('#i_contrato_aviso_tipo',c).addEventListener('change',e=>{FORM.contrato.aviso.tipo=e.target.value; saveLocal(); debouncePreview()});
  qs('#i_contrato_modo',c).addEventListener('change',e=>{FORM.contrato.modo=e.target.value; saveLocal(); debouncePreview()});
  ['contrato.admissao','contrato.dispensa','contrato.aviso.projecao','contrato.funcao','contrato.cbo','contrato.salario','contrato.variaveis','contrato.local','contrato.ctps.status','contrato.ctps.retificacoes']
    .forEach(p=>bindFieldWithAnexo(c,p));
}

/* 8.5 Blocos e condicionais */
function renderBlocos(){
  const c=document.createElement('div'); c.className='card section';
  c.innerHTML = `
    <div class="row">
      ${checkRow('Vínculo/CTPS','blocos.vinculo')}
      ${checkRow('Jornada/Horas/DSR','blocos.jornada')}
      ${checkRow('Adicionais (noturno/insal/peric)','blocos.adicionais')}
      ${checkRow('Rescisão/Multas','blocos.rescisao')}
      ${checkRow('FGTS','blocos.fgts')}
      ${checkRow('Estabilidades','blocos.estabilidades')}
      ${checkRow('Indenizações','blocos.indenizacoes')}
      ${checkRow('Normas Coletivas','blocos.normas')}
      ${checkRow('Tutela de Urgência','blocos.tutela')}
    </div>
  `;
  main.appendChild(c);
  Object.keys(FORM.blocos).forEach(k=>bindCheck(qs('#i_blocos_'+k,c),'blocos.'+k));

  if(FORM.blocos.jornada){
    const j=document.createElement('div'); j.className='card section';
    j.innerHTML = `
      <div class="label">Jornada e Horas</div>
      <div class="row">
        ${fieldWithAnexo({label:'Descrição da jornada',path:'jornada.descricao',col:'col-12'})}
        ${fieldWithAnexo({label:'Percentuais de horas extras',path:'jornada.hx.percentuais'})}
        ${fieldWithAnexo({label:'Intervalos (intra/inter)',path:'jornada.intervalos'})}
        ${fieldWithAnexo({label:'DSR',path:'jornada.dsr'})}
        ${fieldWithAnexo({label:'Regimes inválidos',path:'jornada.regimes',col:'col-12'})}
        ${fieldWithAnexo({label:'Sobreaviso/tempo à disposição',path:'jornada.sobreaviso',col:'col-12'})}
        ${fieldWithAnexo({label:'Teletrabalho',path:'jornada.teletrabalho'})}
      </div>`;
    main.appendChild(j);
    ['jornada.descricao','jornada.hx.percentuais','jornada.intervalos','jornada.dsr','jornada.regimes','jornada.sobreaviso','jornada.teletrabalho']
      .forEach(p=>bindFieldWithAnexo(j,p));
  }

  if(FORM.blocos.adicionais){
    const a=document.createElement('div'); a.className='card section';
    a.innerHTML = `
      <div class="label">Adicionais</div>
      <div class="row">
        ${fieldWithAnexo({label:'Noturno — justificativa',path:'adicionais.noturno.justificativa',col:'col-12'})}
        ${fieldWithAnexo({label:'Noturno — opções',path:'adicionais.noturno.opcoes',col:'col-12'})}
        ${checkRow('Insalubridade ativa?','adicionais.insal.ativo')}
        ${fieldWithAnexo({label:'Insalubridade — grau',path:'adicionais.insal.grau'})}
        ${fieldWithAnexo({label:'EPI — status',path:'adicionais.insal.epi.status'})}
        ${checkRow('Periculosidade ativa?','adicionais.peric.ativo')}
        ${fieldWithAnexo({label:'Periculosidade — agente',path:'adicionais.peric.agente'})}
      </div>`;
    main.appendChild(a);
    bindCheck(qs('#i_adicionais_insal_ativo',a),'adicionais.insal.ativo');
    bindCheck(qs('#i_adicionais_peric_ativo',a),'adicionais.peric.ativo');
    ['adicionais.noturno.justificativa','adicionais.noturno.opcoes','adicionais.insal.grau','adicionais.insal.epi.status','adicionais.peric.agente']
      .forEach(p=>bindFieldWithAnexo(a,p));
  }

  if(FORM.blocos.rescisao){
    const r=document.createElement('div'); r.className='card section';
    r.innerHTML = `
      <div class="label">Rescisão</div>
      <div class="row">
        <div class="col-6">
          <div class="label">Aviso</div>
          <select id="i_resc_aviso">
            <option value="trabalhado">Trabalhado</option>
            <option value="indenizado">Indenizado</option>
          </select>
        </div>
        <div class="col-6">
          <div class="label">13º</div>
          <select id="i_resc_13">
            <option value="vencido">Vencido</option>
            <option value="proporcional">Proporcional</option>
          </select>
        </div>
        <div class="col-6">
          <div class="label">Férias</div>
          <select id="i_resc_ferias">
            <option value="vencidas">Vencidas</option>
            <option value="proporcionais">Proporcionais</option>
          </select>
        </div>
        ${checkRow('Multa art. 477 §8º','rescisao.multas.m477')}
        ${checkRow('Multa art. 467','rescisao.multas.m467')}
      </div>`;
    main.appendChild(r);
    qs('#i_resc_aviso',r).value=FORM.rescisao.aviso.tipo;
    qs('#i_resc_13',r).value=FORM.rescisao.decimo.status;
    qs('#i_resc_ferias',r).value=FORM.rescisao.ferias.status;
    qs('#i_resc_aviso',r).addEventListener('change',e=>{FORM.rescisao.aviso.tipo=e.target.value; saveLocal(); debouncePreview()});
    qs('#i_resc_13',r).addEventListener('change',e=>{FORM.rescisao.decimo.status=e.target.value; saveLocal(); debouncePreview()});
    qs('#i_resc_ferias',r).addEventListener('change',e=>{FORM.rescisao.ferias.status=e.target.value; saveLocal(); debouncePreview()});
    bindCheck(qs('#i_rescisao_multas_m477',r),'rescisao.multas.m477');
    bindCheck(qs('#i_rescisao_multas_m467',r),'rescisao.multas.m467');
  }

  if(FORM.blocos.fgts){
    const f=document.createElement('div'); f.className='card section';
    f.innerHTML = `
      <div class="label">FGTS</div>
      <div class="row">
        ${checkRow('Diferenças mensais','fgts.diferencas')}
        ${checkRow('Multa 40%','fgts.multa40')}
        ${checkRow('Liberação/Chave','fgts.liberacao')}
      </div>`;
    main.appendChild(f);
    ['diferencas','multa40','liberacao'].forEach(k=>bindCheck(qs('#i_fgts_'+k,f),'fgts.'+k));
  }

  if(FORM.blocos.estabilidades){
    const e=document.createElement('div'); e.className='card section';
    e.innerHTML = `
      <div class="label">Estabilidades</div>
      <div class="row">
        <div class="col-6">
          <div class="label">Tipo</div>
          <select id="i_estab_tipo">
            <option value="">(selecione)</option>
            <option value="gestante">Gestante</option>
            <option value="acidentaria">Acidentária</option>
            <option value="cipa">CIPA</option>
            <option value="sindical">Dirigente sindical</option>
            <option value="preaposentadoria">Pré-aposentadoria</option>
          </select>
        </div>
        <div class="col-6">
          <div class="label">Pretensão</div>
          <select id="i_estab_pret">
            <option value="reintegracao">Reintegração</option>
            <option value="indenizacao">Indenização</option>
          </select>
        </div>
        ${fieldWithAnexo({label:'Fatos',path:'estabilidades.fatos',col:'col-12'})}
      </div>`;
    main.appendChild(e);
    qs('#i_estab_tipo',e).value=FORM.estabilidades.tipo;
    qs('#i_estab_pret',e).value=FORM.estabilidades.pretensao;
    qs('#i_estab_tipo',e).addEventListener('change',e2=>{FORM.estabilidades.tipo=e2.target.value; saveLocal(); debouncePreview()});
    qs('#i_estab_pret',e).addEventListener('change',e2=>{FORM.estabilidades.pretensao=e2.target.value; saveLocal(); debouncePreview()});
    bindFieldWithAnexo(e,'estabilidades.fatos');
  }

  if(FORM.blocos.indenizacoes){
    const d=document.createElement('div'); d.className='card section';
    d.innerHTML=`
      <div class="label">Indenizações</div>
      <div class="row">
        ${checkRow('Danos Morais','indenizacoes.morais.ativo')}
        ${fieldWithAnexo({label:'Fatos — Morais',path:'indenizacoes.morais.fatos',col:'col-12'})}
        ${checkRow('Danos Materiais','indenizacoes.materiais.ativo')}
        ${fieldWithAnexo({label:'Itens — Materiais',path:'indenizacoes.materiais.itens',col:'col-12'})}
        ${checkRow('Danos Existenciais','indenizacoes.existenciais.ativo')}
        ${fieldWithAnexo({label:'Fatos — Existenciais',path:'indenizacoes.existenciais.fatos',col:'col-12'})}
      </div>`;
    main.appendChild(d);
    bindCheck(qs('#i_indenizacoes_morais_ativo',d),'indenizacoes.morais.ativo');
    bindFieldWithAnexo(d,'indenizacoes.morais.fatos');
    bindCheck(qs('#i_indenizacoes_materiais_ativo',d),'indenizacoes.materiais.ativo');
    bindFieldWithAnexo(d,'indenizacoes.materiais.itens');
    bindCheck(qs('#i_indenizacoes_existenciais_ativo',d),'indenizacoes.existenciais.ativo');
    bindFieldWithAnexo(d,'indenizacoes.existenciais.fatos');
  }

  if(FORM.blocos.normas){
    const n=document.createElement('div'); n.className='card section';
    n.innerHTML = `
      <div class="label">Normas Coletivas</div>
      <div class="row">
        <div class="col-6">
          <div class="label">Tipo</div>
          <select id="i_normas_tipo"><option value="CCT">CCT</option><option value="ACT">ACT</option></select>
        </div>
        ${fieldWithAnexo({label:'Identificação',path:'normas.id'})}
        ${fieldWithAnexo({label:'Vigência',path:'normas.vigencia'})}
        ${fieldWithAnexo({label:'Cláusulas (lista)',path:'normas.clausulas',col:'col-12'})}
      </div>`;
    main.appendChild(n);
    qs('#i_normas_tipo',n).value=FORM.normas.tipo;
    qs('#i_normas_tipo',n).addEventListener('change',e=>{FORM.normas.tipo=e.target.value; saveLocal(); debouncePreview()});
    ['normas.id','normas.vigencia','normas.clausulas'].forEach(p=>bindFieldWithAnexo(n,p));
  }

  if(FORM.blocos.tutela){
    const t=document.createElement('div'); t.className='card section';
    t.innerHTML=`
      <div class="label">Tutela de Urgência</div>
      <div class="row">
        ${fieldWithAnexo({label:'Tipos de tutela',path:'tutela.tipos',col:'col-12'})}
        ${fieldWithAnexo({label:'Fundamentos',path:'tutela.fundamentos',col:'col-12'})}
      </div>`;
    main.appendChild(t);
    ['tutela.tipos','tutela.fundamentos'].forEach(p=>bindFieldWithAnexo(t,p));
  }
}

/* 8.6 Provas */
function renderProvas(){
  const c=document.createElement('div'); c.className='card section';
  c.innerHTML = `
    <div class="row">
      ${fieldWithAnexo({label:'Nº Testemunhas',path:'provas.n_testemunhas',type:'number'})}
      ${fieldWithAnexo({label:'Perícias (lista)',path:'provas.pericias',col:'col-12'})}
      ${fieldWithAnexo({label:'Exibição de documentos',path:'provas.docs_exibir',col:'col-12'})}
      ${fieldWithAnexo({label:'Ofícios',path:'provas.oficios',col:'col-12'})}
    </div>
    <div class="hr"></div>
    <div class="label">Tags de Anexo (opcional)</div>
    <div class="row">
      <div class="col-12">
        <textarea id="i_anexosText" placeholder="Uma por linha. Ex.: [[ANEXO: TIPO=Holerite, MES=05/2024, ARQUIVO=hol_0524.pdf]]"></textarea>
      </div>
    </div>
  `;
  main.appendChild(c);
  const ta = qs('#i_anexosText',c);
  ta.value=(FORM.anexos||[]).join('\n');
  ta.addEventListener('input',()=>{FORM.anexos=ta.value.split(/\n+/).map(s=>s.trim()).filter(Boolean); saveLocal(); debouncePreview()});
  ['provas.n_testemunhas','provas.pericias','provas.docs_exibir','provas.oficios'].forEach(p=>bindFieldWithAnexo(c,p));
}

/* 8.7 Pedidos (personalizável) */
function renderPedidos(){
  const c=document.createElement('div'); c.className='card section';
  const selecionados = new Set(FORM.pedidos.selecionados);
  c.innerHTML = `
    <div class="label">Selecione os pedidos que farão parte da petição</div>
    <div class="row"><div class="col-12">
      <div class="doc-list">
        ${CATALOGO_PEDIDOS.map(p=>`
          <label class="doc-item">
            <span class="doc-label">${p.label} <span class="small">(${p.fundamento})</span></span>
            <input type="checkbox" data-pedido="${p.key}" ${selecionados.has(p.key)?'checked':''}>
          </label>
        `).join('')}
      </div>
    </div></div>

    <div class="hr"></div>
    <div class="label">Pedidos personalizados</div>
    <div id="customWrap"></div>
    <div class="row">
      <div class="col-6"><input id="i_custom_pedido" placeholder="Descrição do pedido"></div>
      <div class="col-6"><input id="i_custom_fund" placeholder="Fundamento (opcional)"></div>
      <div class="col-12"><button class="btn" id="btnAddCustom">+ Adicionar pedido personalizado</button></div>
    </div>
  `;
  main.appendChild(c);

  // Marca/desmarca do catálogo
  qsa('[data-pedido]',c).forEach(ch=>{
    ch.addEventListener('change',()=>{
      const key = ch.getAttribute('data-pedido');
      if(ch.checked){ if(!FORM.pedidos.selecionados.includes(key)) FORM.pedidos.selecionados.push(key); }
      else { FORM.pedidos.selecionados = FORM.pedidos.selecionados.filter(k=>k!==key); }
      saveLocal(); debouncePreview();
    });
  });

  // Lista e remoção dos personalizados
  const wrap = qs('#customWrap',c);
  const renderCustom = ()=>{
    wrap.innerHTML = (FORM.pedidos.personalizados||[]).map((p,i)=>`
      <div class="row" data-i="${i}">
        <div class="col-8"><div class="label">Pedido</div><input value="${escapeHtml(p.texto||'')}" data-f="texto"></div>
        <div class="col-4"><div class="label">Fundamento</div><input value="${escapeHtml(p.fundamento||'')}" data-f="fundamento"></div>
        <div class="col-12"><button class="btn" data-del="${i}">Remover</button></div>
      </div>
    `).join('') || '<div class="small">Nenhum pedido personalizado adicionado.</div>';

    qsa('[data-del]',wrap).forEach(btn=>{
      btn.onclick=()=>{
        const i = Number(btn.getAttribute('data-del'));
        FORM.pedidos.personalizados.splice(i,1);
        saveLocal(); renderPedidos();
      };
    });
    qsa('[data-f]',wrap).forEach(inp=>{
      inp.addEventListener('input',()=>{
        const row = inp.closest('[data-i]'); const i=Number(row.getAttribute('data-i'));
        const f = inp.getAttribute('data-f');
        FORM.pedidos.personalizados[i][f]=inp.value; saveLocal(); debouncePreview();
      });
    });
  };
  renderCustom();

  // Adição
  qs('#btnAddCustom',c).onclick=()=>{
    const t=qs('#i_custom_pedido',c).value.trim();
    const f=qs('#i_custom_fund',c).value.trim();
    if(!t) return alert('Descreva o pedido.');
    FORM.pedidos.personalizados.push({texto:t, fundamento:f});
    qs('#i_custom_pedido',c).value=''; qs('#i_custom_fund',c).value='';
    saveLocal(); renderPedidos(); debouncePreview();
  };
}

/* 8.8 Estilo */
function renderEstilo(){
  const c=document.createElement('div'); c.className='card section';
  c.innerHTML = `
    <div class="row">
      ${checkRow('Cabeçalho centralizado','estilo.centered_header')}
      ${checkRow('Mostrar identificação do advogado','estilo.mostrar_identificacao_adv')}
      ${checkRow('Mostrar nº do processo','estilo.mostrar_numero_processo')}
      ${selectRow('Citação de artigos','estilo.citacao_artigos',[["texto_completo","Texto completo"],["referencia_curta","Referência curta"]])}
      ${selectRow('Súmulas/OJs','estilo.citacao_sumulas_oj',[["texto_completo","Texto completo"],["referencia_curta","Referência curta"]])}
      ${selectRow('Jurisprudência','estilo.jurisprudencia',[
        ["links_e_identificacao","Links + identificação"],
        ["ementa_resumida_com_link","Ementa resumida + link"],
        ["ementa_completa","Ementa completa"]
      ])}
      ${checkRow('Fontes obrigatórias (Planalto/LexML/TST/Jusbrasil)','estilo.fontes_obrigatorias')}
      ${selectRow('Cálculos','estilo.calculos',[["resumo","Resumo"],["detalhado_por_rubrica","Detalhado por rubrica"],["tabelado","Tabelado"]])}
      ${checkRow('Mostrar fórmulas','estilo.mostrar_formulas')}
      ${selectRow('Formato dos pedidos','estilo.pedidos_formato',[["numerados_curto","Numerados curtos"],["numerados_extenso","Numerados extensos"],["tabelado_com_reflexos","Tabelado com reflexos"]])}
      ${checkRow('Separar obrigações de fazer e pagar','estilo.separar_fazer_pagar')}
      ${selectRow('Destaque da tutela','estilo.tutela_destaque',[["capitulo_padrao","Capítulo padrão"],["caixa_resumo","Caixa-resumo"]])}
      ${checkRow('Caixas de título','estilo.caixas_titulo')}
      ${checkRow('Linhas separadoras','estilo.linhas_separadoras')}
    </div>
  `;
  main.appendChild(c);
  ['centered_header','mostrar_identificacao_adv','mostrar_numero_processo','fontes_obrigatorias','mostrar_formulas','separar_fazer_pagar','caixas_titulo','linhas_separadoras']
    .forEach(k=>bindCheck(qs('#i_estilo_'+k,c),'estilo.'+k));
  ['citacao_artigos','citacao_sumulas_oj','jurisprudencia','calculos','pedidos_formato','tutela_destaque']
    .forEach(k=>bindSelect(qs('#i_estilo_'+k,c),'estilo.'+k));
}

/* 8.9 Preview */
function renderPreview(){
  const card=document.createElement('div'); card.className='card section';
  card.innerHTML = `
    <div class="small">O prompt abaixo orienta o GPT a extrair dados de **documentos anexados** quando o campo estiver marcado como “Documento anexo”.</div>
    <div class="preview" id="previewBox"></div>
    <div class="row" style="margin-top:8px">
      <div class="col-12">
        <button class="btn" id="btnCopy">Copiar Prompt</button>
        <button class="btn" id="btnTxt">Baixar .txt</button>
        <button class="btn" id="btnSave">Baixar JSON</button>
        <button class="btn" id="btnLoad">Carregar JSON</button>
        <button class="btn" id="btnReset">Limpar</button>
      </div>
    </div>
  `;
  main.appendChild(card);
  updatePreview();
  bindHeaderActions(); // botões vivem aqui agora
}

/********************************************
 * BLOCO 9 · PROMPT BUILDER
 ********************************************/
function templatePrompt(F){
  const docsLabels = docsDisponiveisDaPeca()
    .filter(d=>F.docsSelecionados.includes(d.key))
    .map(d=>d.label);
  const supridos = camposSupridosPorDocs();

  const header = F.estilo.centered_header
    ? '<div align="center">\n<strong>JUSTIÇA DO TRABALHO</strong><br>\n<strong>VARA DO TRABALHO DE ' +
      (F.metadados.comarca||'') + '/' + (F.metadados.UF||'') + '</strong>\n</div>'
    : '**JUSTIÇA DO TRABALHO — VARA DO TRABALHO DE ' + (F.metadados.comarca||'') + '/' + (F.metadados.UF||'') + '**';

  const citArt = F.estilo.citacao_artigos==='texto_completo'
    ? 'Transcreva os dispositivos estritamente necessários (caput, §§, incisos).'
    : 'Use referência curta: “art. X, CLT/CF/Lei X”.';
  const citOJ  = F.estilo.citacao_sumulas_oj==='texto_completo'
    ? 'Reproduza a súmula/ementa quando essencial.'
    : 'Mencione número/órgão com link.';
  const jurOptsMap = {
    links_e_identificacao:'Indique tribunal, classe, nº, relator, data e link.',
    ementa_resumida_com_link:'Traga ementa resumida com referência e link.',
    ementa_completa:'Traga ementa completa com referência e link.'
  };
  const jurOpts = jurOptsMap[F.estilo.jurisprudencia] || '';

  const anexoList = (F.anexos||[]).map(a=>'  - '+a).join('\n');
  const docsIntroLines = [
    '### INSTRUÇÕES DE EXTRAÇÃO AOS MODELOS',
    '- Você deve **extrair dados de todos os documentos anexados** (PDF/Imagem) citados abaixo **sempre que o campo estiver marcado como “Documento anexo”**.',
    '- **Priorize o anexo** quando houver conflito entre valor digitado e marcado como anexo.',
    '- Para campos marcados como anexo mas **sem documento correspondente**, sinalize “DADO PENDENTE” e prossiga.',
    '- Realize OCR robusto e normalize datas (AAAA-MM-DD), valores (pt-BR), CNPJs/CPFs, CBO, cargos e rubricas.',
    '',
    '**Documentos informados para esta peça**:',
    (docsLabels.length? ('- '+docsLabels.join('\n- ')) : '(nenhum marcado)'),
    (anexoList? ['','**Tags adicionais**:', anexoList].join('\n') : '')
  ].join('\n');

  const camposAnexo = Object.keys(supridos).filter(k=>supridos[k]).sort();

  const persona = 'Atue como advogado trabalhista brasileiro altamente experiente. Fundamente em CLT, CF/88, CPC, Súmulas/OJs TST, precedentes STF/STJ, normas coletivas. Cite Planalto/LexML/TST/CNJ/INSS/portais TRTs e Jusbrasil com links.';

  const fundamentos = [];
  if(F.blocos.vinculo)   fundamentos.push('- **Vínculo/CTPS**: reconhecimento/retificação conforme CLT arts. 2º-3º.');
  if(F.blocos.jornada)   fundamentos.push('- **Jornada/Horas**: '+(F.jornada.descricao||'')+'; HX '+(F.jornada.hx.percentuais||'')+'; Intervalos '+(F.jornada.intervalos||'')+'.');
  if(F.blocos.adicionais){
    const noturno = 'Noturno ' + (F.adicionais.noturno.justificativa || '');
    const insal   = 'Insalubridade ' + (F.adicionais.insal.ativo ? ('grau ' + (F.adicionais.insal.grau||'') + ' EPI ' + (F.adicionais.insal.epi.status||'')) : 'não');
    const peric   = 'Periculosidade ' + (F.adicionais.peric.ativo ? (F.adicionais.peric.agente||'') : 'não');
    fundamentos.push('- **Adicionais**: '+noturno+'; '+insal+'; '+peric+'.');
  }
  if(F.blocos.rescisao)  fundamentos.push('- **Rescisão/Multas**: Aviso '+(F.rescisao.aviso.tipo||'')+'; 13º '+(F.rescisao.decimo.status||'')+'; Férias '+(F.rescisao.ferias.status||'')+' + 1/3; Multas 477/467 se cabíveis.');
  if(F.blocos.fgts)      fundamentos.push('- **FGTS**: diferenças mensais, multa 40%, liberação/chave.');
  if(F.blocos.estabilidades) fundamentos.push('- **Estabilidade**: '+(F.estabilidades.tipo||'')+'; fatos '+(F.estabilidades.fatos||'')+'; pretensão '+(F.estabilidades.pretensao||'')+'.');
  if(F.blocos.indenizacoes) fundamentos.push('- **Indenizações**: morais '+(F.indenizacoes.morais.ativo?(F.indenizacoes.morais.fatos||''):'não')+'; materiais '+(F.indenizacoes.materiais.ativo?(F.indenizacoes.materiais.itens||''):'não')+'; existenciais '+(F.indenizacoes.existenciais.ativo?(F.indenizacoes.existenciais.fatos||''):'não')+'.');
  if(F.blocos.normas)   fundamentos.push('- **Normas coletivas**: '+(F.normas.tipo||'')+' '+(F.normas.id||'')+', vigência '+(F.normas.vigencia||'')+'; cláusulas '+(F.normas.clausulas||'')+'.');
  if(F.blocos.tutela)   fundamentos.push('- **Tutela de urgência**: '+(F.tutela.tipos||'')+'; fundamentos '+(F.tutela.fundamentos||'')+'.');

  // Pedidos selecionados + personalizados
  const selecionados = (F.pedidos.selecionados||[]).map(k=>{
    const p = CATALOGO_PEDIDOS.find(x=>x.key===k);
    return p ? {texto:p.label, fundamento:p.fundamento} : null;
  }).filter(Boolean);
  const personalizados = (F.pedidos.personalizados||[]).map(p=>({texto:p.texto, fundamento:p.fundamento||''}));
  const listaPedidos = [...selecionados, ...personalizados];

  let pedidosSec = listaPedidos.map((p,i)=>{
    const num = i+1;
    const fund = p.fundamento?` — *${p.fundamento}*`:'';
    return `${num}. ${p.texto}${fund}.`;
  }).join('\n');
  if(!pedidosSec) pedidosSec = '— (nenhum pedido selecionado)';

  if(F.estilo.pedidos_formato==='tabelado_com_reflexos'){
    pedidosSec = [
      '| Nº | Pedido | Fundamento | Reflexos | Valor Estimado |',
      '|---:|---|---|---|---:|',
      ...listaPedidos.map((p,i)=>`| ${i+1} | ${p.texto} | ${p.fundamento||'—'} | — | — |`)
    ].join('\n');
  }

  // Cálculos
  let calcSec = '- Critérios resumidos por rubrica com bases e reflexos.';
  if(F.estilo.calculos==='detalhado_por_rubrica'){
    calcSec = '- Para cada rubrica: fórmula, base, quantidade, reflexos e subtotal.';
  } else if(F.estilo.calculos==='tabelado'){
    calcSec = [
      '| Rubrica | Período | Base de Cálculo | Quantidade/Fator | Reflexos | Valor (R$) |',
      '|---|---|---:|---:|---|---:|',
      '| Exemplo | 01/2023–12/2023 | R$ 2.500,00 | 50h x 50% | Férias/13º/FGTS | 1.234,56 |',
      '**Total estimado**: R$ ' + fmt(F.valor_causa.total)
    ].join('\n');
  }

  return [
    '# PROMPT-MESTRE · PEÇA TRABALHISTA (Brasil)',
    '',
    '## PERSONA',
    'Atue como advogado trabalhista brasileiro altamente experiente. Fundamente em CLT, CF/88, CPC, Súmulas/OJs TST, precedentes STF/STJ, normas coletivas. Cite Planalto/LexML/TST/CNJ/INSS/portais TRTs e Jusbrasil com links.',
    '',
    docsIntroLines,
    '',
    '## OPÇÕES DE ESTILO',
    '- Cabeçalho centralizado: ' + (F.estilo.centered_header?'sim':'não'),
    '- Citações: artigos=' + F.estilo.citacao_artigos + '; súmulas/OJs=' + F.estilo.citacao_sumulas_oj + '; jurisprudência=' + F.estilo.jurisprudencia,
    '- Cálculos: ' + F.estilo.calculos + '; fórmulas ' + (F.estilo.mostrar_formulas?'sim':'não'),
    '- Pedidos: ' + F.estilo.pedidos_formato + '; separar fazer/pagar ' + (F.estilo.separar_fazer_pagar?'sim':'não'),
    '- Campos “Documento anexo”: ' + (camposAnexo.length?camposAnexo.join(', '):'(nenhum)'),
    '',
    '## SAÍDA (somente a peça em Markdown)',
    header,
    '',
    '**EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA ' + (F.metadados.vara||'') + ' VARA DO TRABALHO DE ' + (F.metadados.comarca||'') + '/' + (F.metadados.UF||'') + '**',
    '',
    '**' + (F.partes.reclamante.nome||'[nome]') + '**, ' + (F.partes.reclamante.qualificacao||'[qualificação]') + ', CPF ' + (F.partes.reclamante.cpf||'[cpf]') + ', endereço ' + (F.partes.reclamante.endereco||'[endereço]') + ', por seu advogado, vem propor **' + ((PIECES.find(p=>p[0]===F.peca)||[])[1]||F.peca) + '** em face de **' + ((F.partes.reclamadas||[]).map(r=>r.razao).filter(Boolean).join('; ')||'[reclamada]') + '**.',
    '',
    '### Dos Fatos e do Contrato',
    '- Admissão: ' + (F.contrato.admissao||'(doc anexo se marcado)') + '; Dispensa: ' + (F.contrato.dispensa||'(doc anexo se marcado)') + '; Aviso ' + (F.contrato.aviso.tipo||'') + ' com projeção até ' + (F.contrato.aviso.projecao||'') + '.',
    '- Função/CBO: ' + (F.contrato.funcao||'') + ' (' + (F.contrato.cbo||'') + '); Salário-base: R$ ' + fmt(F.contrato.salario) + '; Variáveis: ' + (F.contrato.variaveis||'') + '.',
    '- Local/Modo: ' + (F.contrato.local||'') + ' (' + (F.contrato.modo||'') + ').',
    '- CTPS: ' + (F.contrato.ctps.status||'') + (F.contrato.ctps.retificacoes?(' - '+F.contrato.ctps.retificacoes):'') + '.',
    '',
    '### Fundamentos',
    fundamentos.join('\n') || '—',
    '',
    '### Dos Cálculos e Critérios',
    calcSec,
    '',
    '### Dos Pedidos',
    pedidosSec,
    '',
    '### Do Valor da Causa',
    '- ' + F.valor_causa.modo + ': R$ **' + fmt(F.valor_causa.total) + '**. Estimativa não limita a condenação (IN 41/2018).',
    '',
    '### Provas',
    '- Documental: ' + (F.provas.docs_exibir||'conforme anexos [[ANEXO]]'),
    '- Testemunhal: ' + (F.provas.n_testemunhas||0),
    '- Perícias: ' + (F.provas.pericias||''),
    '- Ofícios: ' + (F.provas.oficios||''),
    '',
    '### Referências e Links',
    '- **CLT/CF/Leis**: https://www.planalto.gov.br ; https://www.lexml.gov.br',
    '- **TST**: https://www.tst.jus.br',
    '- **TRTs**: Portais regionais',
    '- **Jusbrasil**: pesquisa de jurisprudência',
    '',
    '> Política de citação: ' + citArt + ' ' + citOJ + ' ' + jurOpts
  ].join('\n');
}

/********************************************
 * BLOCO 10 · PREVIEW E AÇÕES
 ********************************************/
function updatePreview(){
  const box = qs('#previewBox');
  if (box) box.textContent = templatePrompt(FORM);
}
let _deb;
function debouncePreview(){ clearTimeout(_deb); _deb=setTimeout(updatePreview, 200) }

function bindHeaderActions(){
  const btnCopy = qs('#btnCopy');
  const btnTxt  = qs('#btnTxt');
  const btnSave = qs('#btnSave');
  const btnReset= qs('#btnReset');
  const btnLoad = qs('#btnLoad');

  if(btnCopy) btnCopy.onclick = ()=>copy(templatePrompt(FORM));
  if(btnTxt)  btnTxt.onclick  = ()=>dl('prompt_trabalhista.txt', templatePrompt(FORM));
  if(btnSave) btnSave.onclick = ()=>dl('dados_gerador.json', JSON.stringify(FORM,null,2));
  if(btnReset)btnReset.onclick= ()=>{ if(confirm('Limpar formulário e recomeçar?')){ FORM=clone(DEFAULT_FORM); saveLocal(); render(); updatePreview(); } };
  if(btnLoad) btnLoad.onclick = ()=>{
    const i=document.createElement('input'); i.type='file'; i.accept='application/json';
    i.onchange=()=>{const f=i.files[0]; if(!f) return; const r=new FileReader();
      r.onload=()=>{ try{FORM=JSON.parse(r.result); saveLocal(); render(); updatePreview();}catch(e){alert('JSON inválido')} };
      r.readAsText(f);
    }; i.click();
  };
}

/********************************************
 * BLOCO 11 · BOOT
 ********************************************/
if (!window.__APP_BOOTED__) window.__APP_BOOTED__ = false;

function init(){
  if (window.__APP_BOOTED__) return;
  window.__APP_BOOTED__ = true;

  piecesNav = qs('#piecesNav');
  stepsNav  = qs('#stepsNav');
  main      = qs('#main');

  renderNav(); render(); updatePreview();
}

window.addEventListener('DOMContentLoaded', init);
