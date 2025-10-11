/* review.js — revisão, lint e prévia forense
   - buildPrompt(data): monta o prompt completo e exibe em #review
   - lint(data): checagens básicas e recomendações → #lintList
   - renderPreviewDoc(data): prévia forense em #previewDoc
   - loadDraftToForm(d): proxy para form.loadDraftToForm (compat. com ingestor)
*/
(function () {
  const { $, $$, toast } = window.Clara;

  // --------- PROMPT ----------
  function fmtParte(p) {
    return [
      `Nome: ${p.nome||''}`,
      p.doc ? `Doc: ${p.doc}` : '',
      p.end ? `Endereço: ${p.end}` : '',
      p.email ? `E-mail: ${p.email}` : '',
      p.tel ? `Telefone: ${p.tel}` : '',
      p.cep ? `CEP: ${p.cep}` : ''
    ].filter(Boolean).join(' | ');
  }

  function buildPrompt(d) {
    const head = [
      `JUÍZO: ${d.juizo || '(não informado)'}`,
      `CIDADE/UF: ${(d.juizo||'').split(' - ').slice(1).join(' - ') || ''}`,
      `RECLAMANTE: ${d.reclamante?.nome || '(não informado)'}`
    ].join('\n');

    const recl = [
      `ESTADO CIVIL: ${d.reclamante?.estado_civil || ''}`,
      `PROFISSÃO: ${d.reclamante?.prof || ''}`,
      `CPF/RG: ${[d.reclamante?.cpf, d.reclamante?.rg].filter(Boolean).join(' / ')}`,
      `CONTATOS: ${[d.reclamante?.email, d.reclamante?.tel].filter(Boolean).join(' / ')}`,
      `ENDEREÇO: ${[d.reclamante?.end, d.reclamante?.cep].filter(Boolean).join(' – ')}`
    ].filter(Boolean).join('\n');

    const reclams = (d.reclamadas||[]).map((r,i)=>`(${i+1}) ${fmtParte(r)}`).join('\n');

    const contrato = [
      `Admissão: ${d.contrato?.adm||''}`,
      `Saída: ${d.contrato?.saida||''}`,
      `Função: ${d.contrato?.funcao||''}`,
      `Salário: ${d.contrato?.salario||''}`,
      `Jornada: ${d.contrato?.jornada||''}`,
      `Controle de Ponto: ${d.contrato?.controlePonto||''}`,
      `Motivo desligamento: ${d.contrato?.desligamento||''}`
    ].join('\n');

    const pedidos = (d.pedidos||[]).map((p, i) => {
      const subs = (p.subpedidos||[]).map(s=>`   - ${s}`).join('\n');
      return `(${i+1}) ${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}${subs?`\n${subs}`:''}`;
    }).join('\n');

    const valores = (d.valores||[]).map(v=>`- ${v.titulo}: R$ ${Number(v.valor||0).toFixed(2)}`).join('\n');

    const juris = ($('#jurisBox')?.value || '').trim();

    return [
      `# CONTEXTO DO CASO`,
      head,
      '',
      `## RECLAMANTE`,
      recl || '(—)',
      '',
      `## RECLAMADAS`,
      reclams || '(—)',
      '',
      `## CONTRATO`,
      contrato,
      '',
      `## FATOS / NARRATIVA`,
      (d.fatos||'(—)'),
      '',
      `## FUNDAMENTOS`,
      (d.fundamentos||'(—)'),
      '',
      `## PEDIDOS`,
      (pedidos||'(—)'),
      '',
      `## PROVAS`,
      (d.provas||[]).map(p=>`- ${p}`).join('\n') || '(—)',
      '',
      `## VALORES`,
      valores || '(—)',
      '',
      `## OUTROS`,
      `Justiça gratuita: ${d.justicaGratuita ? 'SIM' : 'NÃO'}`,
      `Honorários (art. 791-A): ${d.honorarios ? 'SIM' : 'NÃO'}`,
      '',
      juris ? `## JURISPRUDÊNCIA (sugerida)\n${juris}\n` : '',
      `## INSTRUÇÕES AO MODELO`,
      `- Redija a PETIÇÃO INICIAL TRABALHISTA completa, com linguagem forense clara.`,
      `- Mantenha cabeçalho, qualificação, dos fatos, do direito (com base legal), dos pedidos e valor da causa.`,
      `- Considere os pedidos e fundamentos acima. Onde faltar dado, assinale com (XXX) sem inventar.`,
      `- Liste documentos em "Provas".`
    ].join('\n').replace(/\n{3,}/g, '\n\n');
  }

  function updateReview() {
    const data = window.Clara.form?.collect?.() || {};
    const prompt = buildPrompt(data);
    const pre = $('#review');
    if (pre) pre.textContent = prompt;

    // tokens (estimativa)
    const tPrompt = window.Clara.ia?.estimateTokens?.(prompt) || 0;
    const slot = $('#tokenInfo');
    if (slot) slot.textContent = `~${tPrompt}t prompt / ~0t resp.`;

    renderPreviewDoc(data);
    paintLint(data);
    return { data, prompt };
  }

  // --------- LINT ----------
  function paintLint(d) {
    const ul = $('#lintList'); if (!ul) return;
    ul.innerHTML = '';
    const issues = [];

    if (!d.juizo) issues.push('Juízo não informado (cidade/UF).');
    if (!d.reclamante?.nome) issues.push('Nome do reclamante ausente.');
    if (!(d.reclamadas||[]).length) issues.push('Nenhuma reclamada adicionada.');
    if (!d.contrato?.adm) issues.push('Data de admissão ausente.');
    if (!d.contrato?.salario) issues.push('Salário não preenchido (impacta cálculos).');
    if (!d.fatos?.trim()) issues.push('Narrativa de fatos está vazia.');
    if (!(d.pedidos||[]).length) issues.push('Nenhum pedido adicionado.');
    // Consistências simples
    if (d.contrato?.saida && d.contrato?.adm && d.contrato.saida < d.contrato.adm) {
      issues.push('Saída é anterior à admissão (verificar).');
    }
    // Avisos úteis
    if (!$('#jurisBox')?.value?.trim()) issues.push('Sem jurisprudência sugerida — considere buscar.');
    if ((d.valores||[]).length === 0) issues.push('Valores não estimados — utilize a Calculadora / IA.');

    issues.forEach(msg=>{
      const li = document.createElement('li'); li.textContent = msg; ul.appendChild(li);
    });
  }

  // --------- PRÉVIA FORENSE ----------
  function renderPreviewDoc(d) {
    const host = $('#previewDoc'); if (!host) return;
    const recls = (d.reclamadas||[]).map(r=>`${r.nome} (${r.doc||'—'})`).join(', ');
    const pedidos = (d.pedidos||[]).map((p,i)=>`<li><strong>${i+1}. ${p.titulo}</strong>${p.detalhe?` — ${p.detalhe}`:''}${(p.subpedidos||[]).length?'<ul>'+p.subpedidos.map(s=>`<li>${s}</li>`).join('')+'</ul>':''}</li>`).join('');
    const provas = (d.provas||[]).map(p=>`<li>${p}</li>`).join('');

    host.innerHTML = `
      <div class="doc">
        <h2 style="text-align:center;margin:0">EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DA ${d.juizo||'VARA DO TRABALHO'}</h2>
        <hr/>
        <p><strong>${d.reclamante?.nome||'(Nome do Reclamante)'}</strong>, ${[d.reclamante?.estado_civil, d.reclamante?.prof].filter(Boolean).join(', ')}, CPF ${d.reclamante?.cpf||'(xxx)'}, RG ${d.reclamante?.rg||'(xxx)'}, residente em ${[d.reclamante?.end, d.reclamante?.cep].filter(Boolean).join(' - ')}, por seu advogado, vem propor a presente</p>
        <p style="text-align:center"><strong>RECLAMAÇÃO TRABALHISTA</strong></p>
        <p>Em face de <strong>${recls||'(Reclamada)'}</strong>.</p>

        <h3>I – DOS FATOS</h3>
        <p style="white-space:pre-wrap">${(d.fatos||'(—)')}</p>

        <h3>II – DO DIREITO</h3>
        <pre class="mono" style="white-space:pre-wrap">${(d.fundamentos||'(—)')}</pre>

        <h3>III – DOS PEDIDOS</h3>
        <ol>${pedidos||'<li>(—)</li>'}</ol>

        <h3>IV – DO VALOR DA CAUSA</h3>
        <p>${$('#valorCausa')?.textContent || 'R$ 0,00'}</p>

        <h3>V – DAS PROVAS</h3>
        <ul>${provas||'<li>(—)</li>'}</ul>

        <p>Termos em que, pede deferimento.</p>
      </div>
    `;
  }

  // --------- LOAD DRAFT (compat) ----------
  function loadDraftToForm(d) {
    // Proxy para a função oficial do form.js (mantém compatibilidade com ingestor)
    if (window.Clara.form?.loadDraftToForm) {
      window.Clara.form.loadDraftToForm(d);
      // Após preencher, reatualiza a revisão
      setTimeout(updateReview, 50);
    }
  }

  // --------- BINDS ----------
  function bindReviewUI() {
    // salvar rascunho
    $('#btnSalvar')?.addEventListener('click', ()=>{
      const data = window.Clara.form?.saveDraft?.();
      window.Clara.history?.saveVersion?.('manual_save');
      updateReview();
      if (data) toast('Rascunho salvo e revisão atualizada');
    });

    // prévia forense (só rerender)
    $('#btnForense')?.addEventListener('click', ()=>{
      const data = window.Clara.form?.collect?.() || {};
      renderPreviewDoc(data);
      toast('Prévia atualizada');
    });

    // ganchos simples (perícia/dossiê abrem modais se existirem)
    $('#btnPericia')?.addEventListener('click', ()=> {
      document.getElementById('periciaModal')?.classList.remove('hidden');
    });
    $('#btnDossie')?.addEventListener('click', ()=> {
      document.getElementById('dossieModal')?.classList.remove('hidden');
    });

    // atualizar review ao navegar entre passos (se UI disparar eventos)
    window.addEventListener('step:changed', updateReview);

    // quando valores mudarem, reatualiza revisão/preview
    $('#valoresWrap')?.addEventListener('input', (e)=>{
      if (e.target.classList.contains('valor-num')) updateReview();
    });
  }

  // Expose
  window.Clara = Object.assign(window.Clara || {}, {
    review: { buildPrompt, updateReview, renderPreviewDoc, loadDraftToForm }
  });

  window.addEventListener('app:ready', () => {
    bindReviewUI();
    // Primeira renderização
    setTimeout(updateReview, 100);
  });
})();
