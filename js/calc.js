/* calc.js — calculadora tradicional e por IA (lê anexos e gera relatório) */
(function () {
  const { $, fmtBRL, toast } = window.Clara;

  // inputs
  const c_sal = $('#c_sal'), c_sem = $('#c_sem'), c_meses = $('#c_meses'),
        c_he50 = $('#c_he50'), c_he100 = $('#c_he100'),
        c_not = $('#c_not'), c_not_perc = $('#c_not_perc'),
        c_uteis = $('#c_uteis'), c_desc = $('#c_desc');

  // outputs
  const c_hora = $('#c_hora'), c_val_he = $('#c_val_he'),
        c_val_not = $('#c_val_not'), c_val_dsr = $('#c_val_dsr'),
        c_total_mes = $('#c_total_mes'), c_total_per = $('#c_total_per');

  function calcUpdate(){
    const sal = parseFloat(c_sal?.value||0)||0;
    const sem = parseFloat(c_sem?.value||44)||44;
    const meses = parseFloat(c_meses?.value||1)||1;

    const h50 = parseFloat(c_he50?.value||0)||0;
    const h100 = parseFloat(c_he100?.value||0)||0;
    const hNot = parseFloat(c_not?.value||0)||0;
    const pNot = (parseFloat(c_not_perc?.value||20)||20)/100;

    const uteis = parseFloat(c_uteis?.value||22)||22;
    const desc = parseFloat(c_desc?.value||8)||8;

    const hora = sem>0? sal/(sem*4.5):0;
    const valHE = (h50*hora*1.5)+(h100*hora*2);
    const valNot = hNot*hora*pNot;
    const valDSR = uteis>0?(valHE/uteis)*desc:0;

    if (c_hora) c_hora.textContent = fmtBRL(hora);
    if (c_val_he) c_val_he.textContent = fmtBRL(valHE);
    if (c_val_not) c_val_not.textContent = fmtBRL(valNot);
    if (c_val_dsr) c_val_dsr.textContent = fmtBRL(valDSR);
    if (c_total_mes) c_total_mes.textContent = fmtBRL(valHE+valNot+valDSR);
    if (c_total_per) c_total_per.textContent = fmtBRL((valHE+valNot+valDSR)*meses);

    return { hora, valHE, valNot, valDSR, totalMes: valHE+valNot+valDSR, totalPer: (valHE+valNot+valDSR)*meses };
  }

  ;[c_sal,c_sem,c_meses,c_he50,c_he100,c_not,c_not_perc,c_uteis,c_desc].forEach(el=> el?.addEventListener('input', calcUpdate));

  $('#btnCalc')?.addEventListener('click', ()=>{
    $('#calcModal')?.classList.remove('hidden');
    calcUpdate();
  });
  $('#calcClose')?.addEventListener('click', ()=> $('#calcModal')?.classList.add('hidden'));

  function ensurePedido(titulo, detalhe=''){
    const wrap = $('#pedidosWrap');
    const list = Array.from(wrap?.querySelectorAll('.pedido')||[]).map(p=> p.querySelector('.pedido-titulo')?.value?.trim().toLowerCase());
    if(!list.includes((titulo||'').toLowerCase())){
      window.Clara.form?.addPedido(titulo);
      const last = Array.from(wrap.querySelectorAll('.pedido')).slice(-1)[0];
      last?.querySelector('.pedido-detalhe') && (last.querySelector('.pedido-detalhe').value = detalhe);
    }
  }

  function setValorByTitulo(titulo, valor){
    const cont = $('#valoresWrap');
    let row = Array.from(cont?.querySelectorAll('.valor-item')||[]).find(it=> it.querySelector('.valor-titulo')?.value?.toLowerCase()===titulo.toLowerCase());
    if(!row){
      const extra = document.createElement('div');
      extra.className = 'valor-item';
      extra.innerHTML = `<div class="grid">
        <label>Pedido <input type="text" class="valor-titulo" value="${titulo}"/></label>
        <label>Valor estimado (R$)<input type="number" class="valor-num" min="0" step="0.01"/></label>
      </div>`;
      cont?.appendChild(extra); row = extra;
    }
    const num = row.querySelector('.valor-num'); if(num) num.value = Number(valor||0).toFixed(2);
  }

  // Aplicar estimativas manuais
  $('#calcApply')?.addEventListener('click', ()=>{
    const res = calcUpdate();
    ensurePedido('Horas Extras', `Estimativa com base em ${c_he50?.value||0}h (50%) e ${c_he100?.value||0}h (100%) por mês.`);
    ensurePedido('Adicional Noturno', `Estimativa sobre ${c_not?.value||0}h/mês com ${c_not_perc?.value||20}%`);
    ensurePedido('DSR sobre Horas Extras', `Método proporcional`);
    window.Clara.form?.buildValoresFromPedidos();
    const meses = (parseFloat(c_meses?.value||1)||1);
    setValorByTitulo('Horas Extras', res.valHE * meses);
    setValorByTitulo('Adicional Noturno', res.valNot * meses);
    setValorByTitulo('DSR sobre Horas Extras', res.valDSR * meses);
    window.Clara.form?.sumValores();
    $('#calcModal')?.classList.add('hidden');
    toast('Valores estimados aplicados');
  });

  // IA — estimar a partir do formulário e de documentos anexados
  $('#calcApplyIA')?.addEventListener('click', async ()=>{
    const cfg = window.Clara.ia?.loadCfg();
    if(!cfg?.apiKey){ toast('Cole sua OpenAI API key em Configurar IA','bad'); $('#modal')?.classList.remove('hidden'); return; }
    try{
      $('#loading')?.classList.remove('hidden');
      const base = window.Clara.collect?.();
      const calcInputs = {
        salario: $('#salario')?.value, he50: c_he50?.value, he100: c_he100?.value,
        noturno_horas: c_not?.value, perc_noturno: c_not_perc?.value,
        divisor_semanal: c_sem?.value, meses: c_meses?.value
      };
      const docs = (window.Clara.state?.docsText||'').slice(0, 30000);
      const prompt = `Você é perito/advogado trabalhista. Analise os documentos transcritos e os dados do formulário e estime os valores:
- hora (valor-hora)
- valHE (HE 50% + 100% mês)
- valNot (adicional noturno mês)
- valDSR (DSR sobre HE mês)
- totalMes
- totalPer (multiplicado pelos meses)
Retorne JSON puro no formato: {"hora":..., "valHE":..., "valNot":..., "valDSR":..., "totalMes":..., "totalPer":...}
Em seguida, após o JSON, produza um relatório curto (markdown) explicando hipóteses adotadas e trechos relevantes dos documentos.

[DADOS FORMULÁRIO]
${JSON.stringify(base, null, 2)}

[ENTRADAS CALCULADORA]
${JSON.stringify(calcInputs, null, 2)}

[DOCUMENTOS TRANSCRITOS]
${docs || '(sem docs)'}`;

      const raw = await window.Clara.ia.callOpenAI({ prompt, cfg });

      // tenta extrair primeiro bloco JSON
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if(!jsonMatch){ toast('IA não retornou JSON válido','warn'); return; }
      const j = JSON.parse(jsonMatch[0]);

      // aplica nos pedidos/valores
      ensurePedido('Horas Extras', 'Estimativa (IA)');
      ensurePedido('Adicional Noturno', 'Estimativa (IA)');
      ensurePedido('DSR sobre Horas Extras', 'Estimativa (IA)');
      window.Clara.form?.buildValoresFromPedidos();
      const meses = (parseFloat(c_meses?.value||1)||1);
      setValorByTitulo('Horas Extras', Number(j.valHE||0)*meses);
      setValorByTitulo('Adicional Noturno', Number(j.valNot||0)*meses);
      setValorByTitulo('DSR sobre Horas Extras', Number(j.valDSR||0)*meses);
      window.Clara.form?.sumValores();

      // relatório técnico: pega o que vier após o JSON
      const after = raw.slice(jsonMatch.index + jsonMatch[0].length).trim();
      const relatorio = after || '# Relatório de Cálculos (IA)\n- Estimativas geradas com base nos dados informados e nos documentos anexados.\n';
      const fund = $('#fundamentos');
      if (fund) fund.value = (fund.value ? fund.value + '\n\n' : '') + relatorio;

      $('#calcModal')?.classList.add('hidden');
      toast('Cálculo aplicado pela IA');
    }catch(e){
      console.error(e);
      toast('Erro no cálculo por IA','bad');
    }finally{
      $('#loading')?.classList.add('hidden');
    }
  });
})();
