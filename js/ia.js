/* ia.js — Configuração e chamada à OpenAI (chat/completions)
   - Guarda/recupera config (API Key, modelo, temperatura, máx tokens, baseUrl)
   - callOpenAI({ prompt, cfg?, system?, json? }) -> string (conteúdo da resposta)
   - estimateTokens(text) -> estimativa simples p/ UX
*/
(function () {
  const { $, toast, storage } = window.Clara;

  // -------------------- CONFIG --------------------
  const CFG_KEY = 'clara_ia_cfg';
  const DEFAULT_CFG = {
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 2000,
    baseUrl: 'https://api.openai.com/v1'
  };

  function loadCfg() {
    return Object.assign({}, DEFAULT_CFG, storage.get(CFG_KEY, {}));
  }
  function saveCfg(cfg) {
    const merged = Object.assign({}, DEFAULT_CFG, cfg || {});
    storage.set(CFG_KEY, merged);
    toast?.('Configuração de IA salva');
    return merged;
  }

  // Bind simples ao modal de configuração (se existir)
  function bindCfgUI() {
    const modal = $('#modal');
    if (!modal) return;
    const inpKey = modal.querySelector('#apiKey');
    const inpModel = modal.querySelector('#apiModel');
    const inpTemp = modal.querySelector('#apiTemp');
    const inpMaxT = modal.querySelector('#apiMaxTokens');
    const inpBase = modal.querySelector('#apiBaseUrl');

    const cfg = loadCfg();
    if (inpKey) inpKey.value = cfg.apiKey || '';
    if (inpModel) inpModel.value = cfg.model || DEFAULT_CFG.model;
    if (inpTemp) inpTemp.value = cfg.temperature;
    if (inpMaxT) inpMaxT.value = cfg.maxTokens;
    if (inpBase) inpBase.value = cfg.baseUrl;

    modal.querySelector('#btnSaveCfg')?.addEventListener('click', () => {
      const next = {
        apiKey: inpKey?.value?.trim() || '',
        model: inpModel?.value?.trim() || DEFAULT_CFG.model,
        temperature: Number(inpTemp?.value ?? DEFAULT_CFG.temperature),
        maxTokens: Number(inpMaxT?.value ?? DEFAULT_CFG.maxTokens),
        baseUrl: inpBase?.value?.trim() || DEFAULT_CFG.baseUrl
      };
      saveCfg(next);
      modal.classList.add('hidden');
    });
  }

  // -------------------- HELPERS --------------------
  function estimateTokens(text) {
    if (!text) return 0;
    // Aproximação: ~4 chars por token (inglês). Em PT pode variar 3–4.5.
    const len = String(text).length;
    return Math.ceil(len / 4);
  }

  // Monta mensagens (system + user) p/ Chat Completions
  function buildChat({ prompt, system }) {
    const sys = system || 'Você é um assistente jurídico especializado em Direito do Trabalho no Brasil. Seja objetivo, cite a base legal quando apropriado e mantenha linguagem forense clara.';
    return [
      { role: 'system', content: sys },
      { role: 'user', content: prompt }
    ];
  }

  // -------------------- OPENAI CALL --------------------
  async function callOpenAI({ prompt, cfg, system, json } = {}) {
    const conf = cfg || loadCfg();
    if (!conf.apiKey) throw new Error('API Key ausente');
    const url = `${conf.baseUrl.replace(/\/+$/,'')}/chat/completions`;

    // Preferência por resposta em texto; JSON opcional
    const response_format = json ? { type: 'json_object' } : undefined;

    // timeout de 60s
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 60_000);

    const body = {
      model: conf.model || DEFAULT_CFG.model,
      temperature: Number.isFinite(conf.temperature) ? conf.temperature : DEFAULT_CFG.temperature,
      max_tokens: Number.isFinite(conf.maxTokens) ? conf.maxTokens : DEFAULT_CFG.maxTokens,
      messages: buildChat({ prompt, system }),
      response_format
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Authorization': `Bearer ${conf.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      clearTimeout(to);

      if (!res.ok) {
        const errText = await res.text().catch(()=>'');
        throw new Error(`OpenAI ${res.status}: ${errText || res.statusText}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      // token info para UI
      const usage = data?.usage || {};
      const info = `~${usage.prompt_tokens||0}t prompt / ~${usage.completion_tokens||0}t resp.`;
      const slot = $('#tokenInfo');
      if (slot) slot.textContent = info;

      return content;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Tempo de resposta excedido (timeout)');
      throw e;
    }
  }

  // -------------------- EXPOSE --------------------
  window.Clara = Object.assign(window.Clara || {}, {
    ia: { loadCfg, saveCfg, callOpenAI, estimateTokens }
  });

  window.addEventListener('app:ready', bindCfgUI);
})();
