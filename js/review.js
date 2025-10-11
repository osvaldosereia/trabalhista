/* review.js — lint e tokens, coleta e carregamento de rascunho */
(function(){
  const { $, $$, fmtBRL, storage, toast } = window.Clara;

  function collectAll(){
    const rawJuizoNum = (document.getElementById('juizoNum')?.value||'').trim();
    const juizo = `${rawJuizoNum?rawJuizoNum+' ':''}Vara do Trabalho de ${(document.getElementById('cidade')?.value||'').trim()}/${(document.getElementById('uf')?.value||'').trim()}`;
    const reclamante = {
      nome: (document.getElementById('reclamante_nome')?.value||'').trim(),
      estado_civil: (document.getElementById('reclamante_estado_civil')?.value||'').trim(),
      prof: (document.getElementById('reclamante_prof')?.value||'').trim(),
      cpf: (document.getElementById('reclamante_cpf')?.value||'').trim(),
      rg: (document.getElementById('reclamante_rg')?.value||'').trim(),
      end: (document.getElementById('reclamante_end')?.value||'').trim(),
      cep: (document.getElementById('reclamante_cep')?.value||'').trim(),
      tel: (document.getElementById('reclamante_tel')?.value||'').trim(),
      email: (document.getElementById('reclamante_email')?.value||'').trim(),
    };
    const reclamadas = $$('.reclamada').map(card=> ({
      nome: card.querySelector('input[name="reclamada_nome"]')?.value?.trim()||'',
      doc: card.querySelector('input[name="reclamada_doc"]')?.value?.trim()||'',
      end: card.querySelector('input[name="reclamada_end"]')?.value?.trim()||'',
      cep: card.querySelector('input[name="reclamada_cep"]')?.value?.trim()||'',
      tel: card.querySelector('input[name="reclamada_tel"]')?.value?.trim()||'',
      email: card.querySelector('input[name="reclamada_email"]')?.value?.trim()||'',
    }));
    const contrato = {
      adm: document.getElementById('adm')?.value, saida: document.getElementById('saida')?.value, funcao: (document.getElementById('funcao')?.value||'').trim(),
      salario: (document.getElementById('salario')?.value||'').trim(), jornada: (document.getElementById('jornada')?.value||'').trim(),
      controlePonto: (document.getElementById('controlePonto')?.value||'').trim(), desligamento: (document.getElementById('desligamento')?.value||'').trim(),
    };
    const fatos = (document.getElementById('fatos')?.value||'').trim();
    const pedidos = window.Clara.form?.getPedidos?.() || [];
    const fundamentos = (document.getElementById('fundamentos')?.value||'').trim();
    const provas = Array.from(document.querySelectorAll('.prova-texto')).map(i=> i.value.trim()).filter(Boolean);
    const justicaGratuita = document.getElementById('justicaGratuita')?.checked;
    const honorarios = document.getElementById('honorarios')?.checked;
    const valorCausa = (Array.from(document.querySelectorAll('.valor-num')).map(i=> parseFloat(i.value||'0')).reduce((a,b)=>a+(isNaN(b)?0:b),0)) || 0;
    return { _rawJuizoNum: rawJuizoNum, juizo, reclamante, reclamadas, contrato, fatos, pedidos, fundamentos, provas, justicaGratuita, honorarios, valorCausa };
  }

  function loadDraftToForm(){
    const raw = localStorage.getItem('draft_peticao'); if(!raw){ toast('Sem rascunho salvo','warn'); return; }
    const d = JSON.parse(raw);
    document.getElementById('juizoNum') && (document.getElementById('juizoNum').value = d._rawJuizoNum||'');
    const [cidade, uf] = (d.juizo?.match(/de (.*)\/(.*)$/)||['','','']).slice(1);
    document.getElementById('cidade') && (document.getElementById('cidade').value = cidade||'');
    document.getElementById('uf') && (document.getElementById('uf').value = uf||'');
    document.getElementById('reclamante_nome') && (document.getElementById('reclamante_nome').value = d.reclamante?.nome||'');
    document.getElementById('reclamante_estado_civil') && (document.getElementById('reclamante_estado_civil').value = d.reclamante?.estado_civil||'');
    document.getElementById('reclamante_prof') && (document.getElementById('reclamante_prof').value = d.reclamante?.prof||'');
    document.getElementById('reclamante_cpf') && (document.getElementById('reclamante_cpf').value = d.reclamante?.cpf||'');
    document.getElementById('reclamante_rg') && (document.getElementById('reclamante_rg').value = d.reclamante?.rg||'');
    document.getElementById('reclamante_end') && (document.getElementById('reclamante_end').value = d.reclamante?.end||'');
    document.getElementById('reclamante_email') && (document.getElementById('reclamante_email').value = d.reclamante?.email||'');
    document.getElementById('reclamante_cep') && (document.getElementById('reclamante_cep').value = d.reclamante?.cep||'');
    document.getElementById('reclamante_tel') && (document.getElementById('reclamante_tel').value = d.reclamante?.tel||'');
    const wrap = document.getElementById('reclamadasWrap'); if(wrap){ wrap.innerHTML=''; (d.reclamadas||[{}]).forEach(r=>{
      const card = document.createElement('div');
      card.className='card subtle reclamada';
      card.innerHTML = `<div class="grid">
        <label>Razão social / Nome <input name="reclamada_nome" value="${(r.nome||'')}"></label>
        <label>CNPJ/CPF <input name="reclamada_doc" value="${(r.doc||'')}"></label>
        <label>Endereço <input name="reclamada_end" value="${(r.end||'')}"></label>
        <label>E-mail <input name="reclamada_email" value="${(r.email||'')}" type="email"></label>
        <label>Telefone <input name="reclamada_tel" value="${(r.tel||'')}"></label>
        <label>CEP <input name="reclamada_cep" value="${(r.cep||'')}"></label>
      </div><div class="row end"><button type="button" class="mini danger btnRemoveReclamada">remover</button></div>`;
      wrap.appendChild(card);
    }); }
    document.getElementById('adm') && (document.getElementById('adm').value = d.contrato?.adm||'');
    document.getElementById('saida') && (document.getElementById('saida').value = d.contrato?.saida||'');
    document.getElementById('funcao') && (document.getElementById('funcao').value = d.contrato?.funcao||'');
    document.getElementById('salario') && (document.getElementById('salario').value = d.contrato?.salario||'');
    document.getElementById('jornada') && (document.getElementById('jornada').value = d.contrato?.jornada||'');
    document.getElementById('controlePonto') && (document.getElementById('controlePonto').value = d.contrato?.controlePonto||'');
    document.getElementById('desligamento') && (document.getElementById('desligamento').value = d.contrato?.desligamento||'');
    document.getElementById('fatos') && (document.getElementById('fatos').value = d.fatos||'');
    document.getElementById('fundamentos') && (document.getElementById('fundamentos').value = d.fundamentos||'');
    const pedidosWrap = document.getElementById('pedidosWrap'); pedidosWrap && (pedidosWrap.innerHTML='');
    (d.pedidos||[]).forEach(p=>{
      window.Clara.form?.addPedido(p.titulo);
      const last = Array.from(document.querySelectorAll('.pedido')).slice(-1)[0];
      last?.querySelector('.pedido-detalhe') && (last.querySelector('.pedido-detalhe').value = p.detalhe||'');
      const cont = last?.querySelector('.subpedidos');
      (p.subpedidos||[]).forEach(s=>{
        const row = document.createElement('div');
        row.className='subpedido-row';
        row.innerHTML = `<input type="text" class="subpedido-txt" value="${s}"><button type="button" class="mini danger">remover</button>`;
        cont?.appendChild(row);
        row.querySelector('button')?.addEventListener('click', ()=> row.remove());
      });
    });
    const provasWrap = document.getElementById('provasWrap'); provasWrap && (provasWrap.innerHTML='');
    (d.provas||[]).forEach(p=>{
      const el = document.createElement('div');
      el.className='prova';
      el.innerHTML = `<div class="row gap"><input type="text" class="prova-texto" value="${p}"><button type="button" class="mini danger btnRemoveProva">remover</button></div>`;
      provasWrap?.appendChild(el);
      el.querySelector('.btnRemoveProva')?.addEventListener('click', ()=> el.remove());
    });
    window.Clara.form?.buildValoresFromPedidos();
    toast('Rascunho carregado');
  }

  function estimateTokens(str){ return Math.ceil((str||'').length/4); }
  function runLint({ d, promptText, iaText }){
    const issues=[];
    if(!d.reclamante?.nome) issues.push('• Nome do reclamante ausente.');
    if(!d.reclamadas?.length || !d.reclamadas[0]?.nome) issues.push('• Ao menos uma reclamada é obrigatória.');
    if(!d.fatos) issues.push('• Descrever os fatos.');
    if(!d.pedidos?.length) issues.push('• Incluir ao menos um pedido.');
    if((d.valorCausa||0)<=0) issues.push('• Valor da causa não informado (recomendado estimar).');
    issues.push(`• Tokens ~ prompt: ${estimateTokens(promptText)} | resposta: ${estimateTokens(iaText||'')}`);
    return issues;
  }
  function fillLint(items){ const ul=document.getElementById('lintList'); if(!ul) return; ul.innerHTML=''; items.forEach(i=>{ const li=document.createElement('li'); li.textContent=i; ul.appendChild(li); }); }
  function lintAndTokens(prompt, ia){ const el=document.getElementById('tokenInfo'); const d = collectAll();
    if(el) el.textContent = `~${estimateTokens(prompt)}t prompt / ~${estimateTokens(ia)}t resp.`;
    const lint = runLint({ d, promptText: prompt, iaText: ia }); fillLint(lint);
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
      `Valor da Causa: ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(d.valorCausa||0)}`
    ].join('\n');
    const reviewBox = document.getElementById('review'); reviewBox && (reviewBox.textContent = resumo);
  }

  // expose
  window.Clara.collect = collectAll;
  window.Clara.review = { lintAndTokens, buildReview, estimateTokens };
  window.addEventListener('input', (e)=>{
    if(e.target.closest('#formPeticao')){
      clearTimeout(window.__autosave);
      window.__autosave = setTimeout(()=> window.Clara.history?.saveVersion('autosave'), 600);
    }
  });
})(); 
