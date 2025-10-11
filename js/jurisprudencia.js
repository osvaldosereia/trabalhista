/* jurisprudencia.js — pede à IA para listar jurisprudências com ementa + link */
(function () {
  async function buscarJurisprudencia() {
    const cfg = window.Clara.ia?.loadCfg();
    if (!cfg?.apiKey) { window.Clara.toast('Cole sua OpenAI API key em Configurar IA', 'bad'); document.getElementById('modal')?.classList.remove('hidden'); return; }
    const d = window.Clara.collect?.();
    const tema = document.getElementById('temaSelect')?.value || '';
    const assunto = prompt('Tema/assunto para pesquisar jurisprudência (ex.: horas extras; dano moral; rescisão indireta):', tema ? window.Clara.catalog?.data?.[tema]?.nome : '') || '';
    if (!assunto) return;

    const docs = (window.Clara.state?.docsText || '').slice(0, 30000);
    const prompt = `Você é advogado trabalhista. Liste jurisprudências REAIS e RECENTES (TST/TRTs/STF/STJ quando cabível) sobre "${assunto}". 
Forneça até 8 itens com:
- Tribunal e número do processo,
- Tese/ementa resumida (2-3 linhas),
- Link (URL) verificável.

Use linguagem concisa, formato:
1) [TRIBUNAL – nº] Ementa... Link: https://...
Contexto do caso (se ajudar): ${JSON.stringify(d, null, 2)}
Documentos anexados (trechos): ${docs || '(sem docs)'}

Importante:
- Priorize julgados pós-2017 (reforma) quando aplicável.
- Se não tiver certeza do link, diga "verificar no site do tribunal".
- Não invente número de processo.`;
    try {
      document.getElementById('loading')?.classList.remove('hidden');
      const text = await window.Clara.ia.callOpenAI({ prompt, cfg });
      const box = document.getElementById('jurisBox');
      if (box) { box.value = text; window.Clara.toast('Jurisprudência sugerida (confira os links).'); }
    } catch (e) { window.Clara.toast('Falha ao buscar jurisprudência', 'bad'); }
    finally { document.getElementById('loading')?.classList.add('hidden'); }
  }
  window.Clara.juris = { buscarJurisprudencia };
})();
