/* history.js — controle simples de versões (localStorage)
   API exposta em window.Clara.history:
   - saveVersion(label?: string): salva snapshot do form.collect() com timestamp e rótulo
   - list(): retorna array de versões [{ts,label,data}]
   - restore(index: number): restaura a versão pelo índice mais recente=0
   - clear(): apaga histórico
*/
(function () {
  const { toast } = window.Clara;
  const KEY = 'portials_history_v1';

  function nowISO() { return new Date().toISOString(); }

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch { return []; }
  }

  function saveAll(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 50))); // mantém no máx. 50 versões
  }

  function saveVersion(label = '') {
    const data = window.Clara.form?.collect?.();
    if (!data) { toast('Nada para versionar', 'warn'); return null; }
    const arr = loadAll();
    arr.unshift({ ts: nowISO(), label, data });
    saveAll(arr);
    toast('Versão salva no histórico');
    return arr[0];
  }

  function list() {
    return loadAll();
  }

  function restore(index = 0) {
    const arr = loadAll();
    const item = arr[index];
    if (!item) { toast('Versão não encontrada', 'warn'); return null; }
    window.Clara.review?.loadDraftToForm?.(item.data);
    toast('Versão restaurada');
    return item;
  }

  function clear() {
    localStorage.removeItem(KEY);
    toast('Histórico limpo');
  }

  window.Clara = Object.assign(window.Clara || {}, {
    history: { saveVersion, list, restore, clear }
  });

  // atalhos (opcionais) no console:
  // Clara.history.list(), Clara.history.restore(0)
})();
