/* main.js — wire-up */
(function(){
  const { $, toast } = window.Clara;
  const { setStep } = window.Clara.ui;

  // navegação
  document.getElementById('btnIniciar')?.addEventListener('click', ()=>{ document.getElementById('intro')?.classList.add('hidden'); document.getElementById('wizard')?.classList.remove('hidden'); setStep(0); toast('Novo caso iniciado'); });
  document.getElementById('btnPrev')?.addEventListener('click', ()=> setStep(window.Clara.state.step-1));
  document.getElementById('btnNext')?.addEventListener('click', ()=> setStep(window.Clara.state.step+1));
  document.getElementById('btnGerar')?.addEventListener('click', ()=> window.Clara.ia?.gerarPrompt());
  document.getElementById('btnGerarIA')?.addEventListener('click', ()=> window.Clara.ia?.gerarIA());
  document.getElementById('refinarIa')?.addEventListener('click', ()=> window.Clara.ia?.refinarIA());

  // salvar revisão
  document.getElementById('btnSalvar')?.addEventListener('click', ()=> window.Clara.history?.saveVersion('manual'));

  // atalhos topo
  document.getElementById('btnHistory')?.addEventListener('click', ()=> document.getElementById('historyModal')?.classList.remove('hidden'));
  document.getElementById('closeHistory')?.addEventListener('click', ()=> document.getElementById('historyModal')?.classList.add('hidden'));
  document.getElementById('btnAudit')?.addEventListener('click', ()=> document.getElementById('auditModal')?.classList.remove('hidden'));
  document.getElementById('auditClose')?.addEventListener('click', ()=> document.getElementById('auditModal')?.classList.add('hidden'));
  document.getElementById('btnEquipe')?.addEventListener('click', ()=> document.getElementById('teamModal')?.classList.remove('hidden'));
  document.getElementById('closeTeam')?.addEventListener('click', ()=> document.getElementById('teamModal')?.classList.add('hidden'));

  // auditoria inicial
  window.Clara.history?.addAudit('LOCK', { at: new Date().toISOString(), page: location.pathname });
})(); 
