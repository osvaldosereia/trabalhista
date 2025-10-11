/* history.js — versionamento local de casos (undo/restore)
   - saveVersion(label?, data?)  -> salva snapshot atual (até MAX_VERSIONS)
   - listVersions()              -> [{id, ts, label}]
   - loadVersion(id)             -> aplica ao formulário
   - clearHistory()              -> limpa histórico
*/
(function () {
  const { storage, toast } = window.Clara;

  const HISTORY_KEY = 'clara_history';
  const MAX_VERSIONS = 30;

  function nowISO() { return new Date().toISOString(); }
  function shortTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return ts; }
  }
  function genId() { return 'v_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }

  function readAll() {
    const arr = storage.get(HISTORY_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }
  function writeAll(arr) { storage.set(HISTORY_KEY, arr); }

  function saveVersion(label = 'auto', data) {
    try {
      const payload = data || (window.Clara.form?.collect?.() || null);
      if (!payload) { toast('Nada para versionar', 'warn'); return null; }

      const list = readAll();
      const entry = {
        id: genId(),
        ts: nowISO(),
        label: String(label || 'auto'),
        data: payload
      };
      list.unshift(entry); // mais recente no topo
      if (list.length > MAX_VERSIONS) list.length = MAX_VERSIONS;
      writeAll(list);
      toast(`Versão salva (${entry.label} – ${shortTs(entry.ts)})`);
      return { id: entry.id, ts: entry.ts, label: entry.label };
    } catch (e) {
      console.error('[history] saveVersion', e);
      toast('Falha ao salvar versão', 'bad');
      return null;
    }
  }

  function listVersions() {
    return readAll().map(({ id, ts, label }) => ({ id, ts, label }));
  }

  function loadVersion(id) {
    try {
      const list = readAll();
      const entry = list.find(v => v.id === id);
      if (!entry) { toast('Versão não encontrada', 'warn'); return false; }
      window.Clara.review?.loadDraftToForm?.(entry.data);
      toast(`Versão aplicada (${entry.label} – ${shortTs(entry.ts)})`);
      return true;
    } catch (e) {
      console.error('[history] loadVersion', e);
      toast('Falha ao aplicar versão', 'bad');
      return false;
    }
  }

  function clearHistory() {
    writeAll([]);
    toast('Histórico limpo');
  }

  // Auto-salva em eventos úteis
  function autoBinds() {
    // Ao importar JSON
    const ex = window.Clara.exporter;
    if (ex && !ex.__history_patched) {
      const origImport = ex.importJSONDialog;
      ex.importJSONDialog = async function patchedImport() {
        const prev = window.Clara.form?.collect?.();
        const ok = await origImport.apply(this, arguments);
        if (prev) saveVersion('antes_import');
        return ok;
      };
      ex.__history_patched = true;
    }

    // Após ingestão (ingestor chama explicitamente saveVersion, mas deixamos por segurança)
    window.addEventListener('main:ready', () => {
      // snapshot inicial
      setTimeout(() => saveVersion('snapshot_inicial'), 200);
    });
  }

  window.Clara = Object.assign(window.Clara || {}, {
    history: { saveVersion, listVersions, loadVersion, clearHistory }
  });

  window.addEventListener('app:ready', autoBinds);
})();
