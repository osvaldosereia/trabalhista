// include.js — carrega partials HTML estáticos (GitHub Pages)
(async function(){
  async function load(el){
    const url = el.getAttribute('data-include');
    if(!url) return;
    try{
      const res = await fetch(url, { cache:'no-store' });
      if(!res.ok) throw new Error(res.statusText);
      el.innerHTML = await res.text();
      const nested = el.querySelectorAll('[data-include]');
      for(const n of nested){ await load(n); }
    }catch(e){
      el.innerHTML = `<div class="muted">Falha ao carregar ${url}: ${e.message}</div>`;
      console.error('include.js', url, e);
    }
  }
  const nodes = document.querySelectorAll('[data-include]');
  for(const n of nodes){ await load(n); }
})();
