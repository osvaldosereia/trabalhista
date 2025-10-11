/* core.js — helpers, state, storage, toasts */
(function(){
  const $ = (q, el=document)=> el.querySelector(q);
  const $$ = (q, el=document)=> Array.from(el.querySelectorAll(q));
  const uid = (p='id') => p+'_'+Math.random().toString(36).slice(2,9);
  const fmtBRL = n => (isNaN(n)?0:n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const escapeHtml = s => String(s||'').replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
  const onlyDigits = s => String(s||'').replace(/\D+/g,'');
  const sanitize = s => String(s||'').trim();
  const nowISO = () => new Date().toISOString();

  const state = {
    step: 0,
    docsText: '',
    tplText: '',
    historyMax: 30
  };

  const toasts = document.getElementById('toasts');
  function toast(txt, type='good', t=3200){
    try{
      const el=document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = txt;
      toasts?.appendChild(el);
      setTimeout(()=> el.remove(), t);
    }catch(e){ console.log('[toast]', txt); }
  }

  const storage = {
    get(key, def=null){ try{ const v = localStorage.getItem(key); return v? JSON.parse(v) : def; }catch{ return def; } },
    set(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} },
    del(key){ try{ localStorage.removeItem(key); }catch{} }
  };

  window.Clara = Object.assign(window.Clara || {}, {
    $,$$,uid,fmtBRL,escapeHtml,onlyDigits,sanitize,nowISO,state,toast,storage
  });
})();
