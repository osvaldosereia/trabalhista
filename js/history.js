/* history.js — auditoria e versões */
(function(){
  const { nowISO, storage, uid, toast } = window.Clara;
  const AUDIT_KEY='audit_log_v2', VKEY='peticao_versions_v2';

  function addAudit(type, payload){
    const list = storage.get(AUDIT_KEY, []);
    list.unshift({ id: uid('aud'), at: nowISO(), type, payload });
    storage.set(AUDIT_KEY, list);
  }
  function versions(){ return storage.get(VKEY, []); }
  function saveVersion(kind='manual'){
    const v = { id: uid('v'), at: nowISO(), kind, data: window.Clara.collect?.(), prompt: (document.getElementById('saida')?.value||''), ia: (document.getElementById('saidaIa')?.value||'') };
    const list = [v, ...versions()].slice(0, 30);
    storage.set(VKEY, list);
    storage.set('draft_peticao', v.data);
    addAudit('VERSION', { kind, id: v.id });
  }

  window.Clara.history = { addAudit, versions, saveVersion };
})();
