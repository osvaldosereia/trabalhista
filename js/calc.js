/* calc.js — calculadora tradicional e por IA */
(function(){
  const { $, fmtBRL, toast } = window.Clara;
  const c_sal=$('#c_sal'), c_sem=$('#c_sem'), c_meses=$('#c_meses'), c_he50=$('#c_he50'), c_he100=$('#c_he100'), c_not=$('#c_not'), c_not_perc=$('#c_not_perc'), c_uteis=$('#c_uteis'), c_desc=$('#c_desc');
  const c_hora=$('#c_hora'), c_val_he=$('#c_val_he'), c_val_not=$('#c_val_not'), c_val_dsr=$('#c_val_dsr'), c_total_mes=$('#c_total_mes'), c_total_per=$('#c_total_per');

  function calcUpdate(){
    const sal = parseFloat(c_sal?.value||0)||0, sem = parseFloat(c_sem?.value||44)||44, meses=parseFloat(c_meses?.value||1)||1;
    const h50=parseFloat(c_he50?.value||0)||0, h100=parseFloat(c_he100?.value||0)||0, hNot=parseFloat(c_not?.value||0)||0, pNot=(parseFloat(c_not_perc?.value||20)||20)/100;
    const uteis=parseFloat(c_uteis?.value||22)||22, desc=parseFloat(c_desc?.value||8)||8;
    const hora = sem>0? sal/(sem*4.5):0, valHE=(h50*hora*1.5)+(h100*hora*2), valNot=hNot*hora*pNot, valDSR=uteis>0?(valHE/uteis)*desc:0;
    c_hora && (c_hora.textContent = fmtBRL(hora)); c_val_he && (c_val_he.textContent = fmtBRL(valHE)); c_val_not && (c_val_not.textContent = fmtBRL(valNot));
    c_val_dsr && (c_val_dsr.textContent = fmtBRL(valDSR)); c_total_mes && (c_total_mes.textContent = fmtBRL(valHE+valNot+valDSR)); c_total_per && (c_total_per.textContent = fmtBRL((valHE+valNot+valDSR)*meses));
    return { hora, valHE, valNot, valDSR, totalMes: valHE+valNot+valDSR, totalPer: (valHE+valNot+valDSR)*meses };
  }
  ;[c_sal,c_sem,c_meses,c_he50,c_he100,c_not,c_not_perc,c_uteis,c_desc].forEach(el=> el?.addEventListener('input', calcUpdate));
  document.getElementById('btnCalc')?.addEventListener('click', ()=>{ document.getElementById('calcModal')?.classList.remove('hidden'); calcUpdate(); });
  document.getElementById('calcClose')?.addEventListener('click', ()=> document.getElementById('calcModal')?.classList.add('hidden'));

  function ensurePedido(titulo, detalhe=''){
    const wrap = document.getElementById('pedidosWrap');
    const list = Array.from(wrap?.querySelectorAll('.pedido')||[]).map(p=> p.querySelector('.pedido-titulo')?.value?.trim().toLowerCase());
    if(!list.includes((titulo||'').toLowerCase())){
      window.Clara.form?.addPedido(titulo);
      const last = Array.from(wrap.querySelectorAll('.pedido')).slice(-1)[0];
      last?.querySelector('.pedido-detalhe') && (last.querySelector('.pedido-detalhe').value = detalhe);
    }
  }
  function setValorByTitulo(titulo, valor){
    const cont = document.getElementById('valoresWrap');
    let row = Array.from(cont?.querySelectorAll('.valor-item')||[]).find(it=> it.querySelector('.valor-titulo')?.value?.toLowerCase()===titulo.toLowerCase());
    if(!row){
      const extra = document.createElement('div');
      extra.className = 'valor-item';
      extra.innerHTML = `<div class="grid"><label>Pedido <input type="text" class="valor-titulo" value="${titulo}"/></label><label>Valor estimado (R$)<input type="number" class="valor-num" min="0" step="0.01"/></label></div>`;
      cont?.appendChild(extra); row = extra;
    }
    const num = row.querySelector('.valor-num'); if(num) num.value = Number(valor||0).toFixed(2);
  }

  document.getElementById('calcApply')?.addEventListener('click', ()=>{
    const res = calcUpdate();
    ensurePedido('Horas Extras', `Estimativa com base em ${c_he50?.value||0}h (50%) e ${c_he100?.value||0}h (100%) por mês.`);
    ensurePedido('Adicional Noturno', `Estimativa sobre ${c_not?.value||0}h/mês com ${c_not_perc?.value||20}%`);
    ensurePedido('DSR sobre Horas Extras', `Método proporcional`);
    window.Clara.form?.buildValoresFromPedidos();
    const meses = (parseFloat(c_meses?.value||1)||1);
    setValorByTitulo('Horas Extras', res.valHE * meses);
    setValorByTitulo('Adicional Noturno', res.valNot * meses);
    setValorByTitulo('DSR sobre Horas Extras', res.valDSR * meses);
    window.Clara.form?.sumValores(); document.getElementById('calcModal')?.classList.add('hidden'); toast('Valores estimados aplicados');
  });

  // IA
  document.getElementById('calcApplyIA')?.addEventListener('click', async ()=>{
    const cfg = window.Clara.ia?.loadCfg(); if(!cfg?.apiKey){ toast('Cole sua OpenAI API key em Configurar IA','bad'); document.getElementById('modal')?.classList.remove('hidden'); return; }
    try{
      document.getElementById('loading')?.classList.remove('hidden');
      const base = window.Clara.collect?.();
      const calcInputs = { salario: document.getElementById('salario')?.value, he50: c_he50?.value, he100: c_he100?.value, noturno_horas: c_not?.value, perc_noturno: c_not_perc?.value, divisor_semanal: c_sem?.value, meses: c_meses?.value };
      const prompt = `Você é perito/advogado trabalhista. Estime valores para HE 50/100, Noturno e DSR sobre HE, retornando JSON {hora,valHE,valNot,valDSR,totalMes,totalPer}.

[DADOS FORMULÁRIO]
${JSON.stringify(base, null, 2)}

[ENTRADAS CALCULADORA]
${JSON.stringify(calcInputs, null, 2)}

[DOCUMENTOS TRANSCRITOS]
${window.Clara.state.docsText || '(sem docs)'}`;
      const text = await window.Clara.ia.callOpenAI({ prompt, cfg });
      let j=null; try{ j = JSON.parse(text); }catch{}
      if(!j){ toast('IA não retornou JSON válido','warn'); return; }
      ensurePedido('Horas Extras', 'Estimativa (IA)');
      ensurePedido('Adicional Noturno', 'Estimativa (IA)');
      ensurePedido('DSR sobre Horas Extras', 'Estimativa (IA)');
      window.Clara.form?.buildValoresFromPedidos();
      const meses = (parseFloat(c_meses?.value||1)||1);
      setValorByTitulo('Horas Extras', Number(j.valHE)*meses);
      setValorByTitulo('Adicional Noturno', Number(j.valNot)*meses);
      setValorByTitulo('DSR sobre Horas Extras', Number(j.valDSR)*meses);
      window.Clara.form?.sumValores(); document.getElementById('calcModal')?.classList.add('hidden');
      toast('Cálculo aplicado pela IA');
    }catch(e){ toast('Erro no cálculo por IA','bad'); }finally{ document.getElementById('loading')?.classList.add('hidden'); }
  });
})();
