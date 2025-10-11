/* ui.js — tema, navegação, validação, prévia, review */
(function(){
  const { $, $$, state, toast, fmtBRL, escapeHtml } = window.Clara;

  // tema claro forçado
  document.body?.classList.remove('theme-dark');
  $('#btnTheme')?.addEventListener('click', ()=>{
    document.body.classList.remove('theme-dark');
    toast('Tema fixo: claro','warn');
  });

  const wizard = $('#wizard'), resultado = $('#resultado'), intro = $('#intro');
  const stepsList = $('#stepsList')?.querySelectorAll('li') || [];
  const progressBar = $('#progress span');
  const MAX_STEP = 8;

  function setStep(i){
    state.step = Math.max(0, Math.min(MAX_STEP, i));
    $$('.step').forEach((el, idx)=> el.classList.toggle('hidden', idx!==state.step));
    stepsList.forEach((li, idx)=> li.classList.toggle('active', idx===state.step));
    progressBar && (progressBar.style.width = `${(state.step/MAX_STEP)*100}%`);
    if(state.step===MAX_STEP){ window.Clara.review?.buildReview(); }
  }

  function showResultado(){
    wizard?.classList.add('hidden'); resultado?.classList.remove('hidden'); window.scrollTo({top:0, behavior:'smooth'});
  }
  function backToWizard(){ resultado?.classList.add('hidden'); wizard?.classList.remove('hidden'); setStep(MAX_STEP); }

  function buildForenseHTML(d){
    const safe = s => (s && String(s).trim()) || '—';
    const reclams = (d.reclamadas||[]).map((r,i)=>`<p><span class="bold">${i+1}. ${safe(r.nome)}</span>${r.doc?`, ${safe(r.doc)}`:''}${r.end?`, ${safe(r.end)}`:''}${r.email?`, e-mail ${safe(r.email)}`:''}.</p>`).join('');
    const pedidosList = (d.pedidos||[]).map((p,i)=>{
      const subs = (p.subpedidos||[]).map((s,j)=>`<li>${i+1}.${j+1}) ${escapeHtml(s)}</li>`).join('');
      return `<li><span class="bold">${i+1}) ${escapeHtml(p.titulo)}</span>${p.detalhe?` — ${escapeHtml(p.detalhe)}`:''}${subs?`<ol>${subs}</ol>`:''}</li>`;
    }).join('');
    return `<div class="doc print-area">
      <h1>Ao Juízo da ${safe(d.juizo)}</h1>
      <h2>Qualificação</h2>
      <p><span class="bold">Reclamante:</span> ${safe(d.reclamante?.nome)}.</p>
      <p><span class="bold">Reclamadas:</span></p>${reclams||'<p>—</p>'}
      <h2>Do Contrato</h2>
      <p>Admissão: ${safe(d.contrato?.adm)}; Saída: ${safe(d.contrato?.saida)}; Função: ${safe(d.contrato?.funcao)}; Salário: ${d.contrato?.salario?`R$ ${safe(d.contrato.salario)}`:'—'}; Jornada: ${safe(d.contrato?.jornada)}; Controle de ponto: ${safe(d.contrato?.controlePonto)}; Desligamento: ${safe(d.contrato?.desligamento)}.</p>
      <h2>Dos Fatos</h2><p>${safe(d.fatos)}</p>
      <h2>Dos Fundamentos</h2><p>${d.fundamentos || 'Indicar CLT, CF/88, CPC (art. 769 CLT), súmulas/OJs do TST e jurisprudência aplicável.'}</p>
      <h2>Dos Pedidos</h2><ol>${pedidosList}</ol>
      <h2>Provas</h2><p>Protesta provar o alegado por todos os meios em direito admitidos, notadamente: ${(d.provas||[]).join('; ') || 'documentos anexos e prova testemunhal'}.</p>
      ${d.justicaGratuita?'<p>Requer os benefícios da justiça gratuita (CLT art. 790, §3º).</p>':''}
      ${d.honorarios?'<p>Requer honorários de sucumbência (CLT art. 791-A).</p>':''}
      <h2>Valor da Causa</h2><p>${fmtBRL(d.valorCausa||0)}</p>
      <h2>Requerimentos Finais</h2><p>Requer notificação/citação das reclamadas; procedência integral; correção e juros; e demais cominações.</p>
      <p class="right">${new Date().toLocaleDateString('pt-BR')}.</p><p class="center">__________________________________<br/>Advogado (OAB nº)</p></div>`;
  }

  window.Clara.ui = { setStep, showResultado, backToWizard, buildForenseHTML };
})();
