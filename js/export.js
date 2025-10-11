/* export.js — copiar, imprimir, exportar PDF/DOCX/JSON */
(function(){
  const { $, toast } = window.Clara;

  const saida = $('#saida'), saidaIa = $('#saidaIa'), previewDoc = $('#previewDoc');

  // copiar
  $('#copiar')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(saida?.value||''); toast('Prompt copiado'); }catch{ toast('Falha ao copiar','bad'); } });
  $('#copiarIa')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(saidaIa?.value||''); toast('Texto da IA copiado'); }catch{ toast('Falha ao copiar','bad'); } });

  // prévia / imprimir
  $('#btnForense')?.addEventListener('click', ()=>{
    const d = window.Clara.collect?.(); previewDoc && (previewDoc.innerHTML = window.Clara.ui?.buildForenseHTML(d));
    document.getElementById('wizard')?.classList.add('hidden'); document.getElementById('resultado')?.classList.remove('hidden'); toast('Prévia atualizada');
  });
  $('#copyHtml')?.addEventListener('click', async ()=>{ try{
    const wrapper = document.createElement('div'); wrapper.innerHTML = window.Clara.ui?.buildForenseHTML(window.Clara.collect?.());
    await navigator.clipboard.writeText(wrapper.innerHTML); toast('HTML copiado');
  }catch{ toast('Falha ao copiar HTML','bad'); }});
  $('#printDoc')?.addEventListener('click', ()=>{ if(!previewDoc?.innerHTML.trim()){ previewDoc.innerHTML = window.Clara.ui?.buildForenseHTML(window.Clara.collect?.()); } window.print(); });
  $('#voltar')?.addEventListener('click', ()=> window.Clara.ui?.backToWizard());

  // export JSON
  $('#btnExportJson')?.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(window.Clara.collect?.(),null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `caso-${Date.now()}.json`; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000); toast('JSON exportado');
  });
  $('#btnImportJson')?.addEventListener('click', ()=>{
    const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange = async e=>{ const f = e.target.files?.[0]; if(!f) return; try{
      const d = JSON.parse(await f.text()); localStorage.setItem('draft_peticao', JSON.stringify(d)); window.Clara.collect?.loadDraftToForm?.(); window.Clara.ui?.setStep(8); toast('Caso importado');
    }catch{ toast('JSON inválido','bad'); } };
    inp.click();
  });

  // export PDF
  $('#exportPdf')?.addEventListener('click', ()=>{
    const text = (saidaIa?.value || saida?.value || '').trim(); if(!text){ toast('Nada para exportar','warn'); return; }
    if(!window.jspdf?.jsPDF){ toast('jsPDF não encontrado','warn'); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF({unit:'pt', format:'a4'});
    const lines = doc.splitTextToSize(text, 515); let y=48; doc.setFontSize(12);
    for(const l of lines){ if(y>780){ doc.addPage(); y=48; } doc.text(l, 48, y); y+=16; }
    doc.save('peticao-inicial.pdf'); toast('PDF exportado');
  });

  // export DOCX
  $('#exportDocx')?.addEventListener('click', async ()=>{
    if(!window.docx?.Document){ toast('docx lib não encontrada','warn'); return; }
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, LevelFormat } = window.docx;
    const d = window.Clara.collect?.();
    const numbering = { config: [{ reference:'pedidos', levels:[
      { level:0, format:LevelFormat.DECIMAL, text:'%1)', alignment:AlignmentType.START },
      { level:1, format:LevelFormat.DECIMAL, text:'%1.%2)', alignment:AlignmentType.START } ] }] };
    const P = (t,opts={})=> new Paragraph({ children:[ new TextRun({text:t}) ], ...opts });
    const H = (t,l=HeadingLevel.HEADING_2)=> new Paragraph({ text:t.toUpperCase(), heading:l, spacing:{ after:120 } });
    const Just = (t)=> P(t, { alignment:AlignmentType.JUSTIFIED, spacing:{ after:120 } });
    const reclams = (d.reclamadas||[]).map((r,i)=>`${i+1}. ${r.nome||'—'}${r.doc?`, ${r.doc}`:''}${r.end?`, ${r.end}`:''}`).join(' ');
    const children = [];
    children.push(new Paragraph({ text:`AO JUÍZO DA ${d.juizo}`.toUpperCase(), alignment:AlignmentType.CENTER, spacing:{ after:200 } }));
    children.push(H('Qualificação'));
    children.push(Just(`Reclamante: ${d.reclamante?.nome || '—'}.`));
    children.push(Just(`Reclamadas: ${reclams||'—'}.`));
    children.push(H('Do Contrato'));
    children.push(Just(`Admissão: ${d.contrato?.adm||'—'}; Saída: ${d.contrato?.saida||'—'}; Função: ${d.contrato?.funcao||'—'}; Salário: ${d.contrato?.salario?`R$ ${d.contrato.salario}`:'—'}; Jornada: ${d.contrato?.jornada||'—'}; Controle de ponto: ${d.contrato?.controlePonto||'—'}; Desligamento: ${d.contrato?.desligamento||'—'}.`));
    children.push(H('Dos Fatos'));
    children.push(Just(d.fatos||'—'));
    children.push(H('Dos Fundamentos'));
    children.push(Just(d.fundamentos||'—'));
    children.push(H('Dos Pedidos'));
    (d.pedidos||[]).forEach(p=>{
      children.push(new Paragraph({ numbering:{reference:'pedidos', level:0}, children:[ new TextRun({ text:`${p.titulo}${p.detalhe?` — ${p.detalhe}`:''}` }) ] }));
      (p.subpedidos||[]).forEach(sp=> children.push(new Paragraph({ numbering:{reference:'pedidos', level:1}, children:[ new TextRun({text:sp}) ] })));
    });
    children.push(H('Provas'));
    children.push(Just(`Protesta provar o alegado por todos os meios em direito admitidos, notadamente: ${(d.provas||[]).join('; ') || 'documentos anexos e prova testemunhal'}.`));
    if(d.justicaGratuita) children.push(Just('Requer os benefícios da justiça gratuita (CLT art. 790, §3º).'));
    if(d.honorarios) children.push(Just('Requer honorários de sucumbência (CLT art. 791-A).'));
    children.push(H('Valor da Causa'));
    children.push(Just((d.valorCausa||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})));
    children.push(H('Requerimentos Finais'));
    children.push(Just('Requer notificação/citação das reclamadas; procedência integral; correção e juros; e demais cominações.'));
    children.push(new Paragraph({ text: new Date().toLocaleDateString('pt-BR') + '.', alignment:AlignmentType.RIGHT, spacing:{ before:200, after:120 } }));
    children.push(new Paragraph({ text: '__________________________________', alignment:AlignmentType.CENTER }));
    children.push(new Paragraph({ text: 'Advogado (OAB nº)', alignment:AlignmentType.CENTER }));
    const doc = new Document({ numbering, sections:[{ properties:{}, children }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='peticao-inicial.docx'; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1500); toast('DOCX exportado');
  });
})();
