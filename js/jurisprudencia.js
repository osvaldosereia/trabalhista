/* jurisprudencia.js — Pesquisa orientada por IA para listar jurisprudências com ementa + link
   - Gera uma lista (máx. 8) com: Tribunal, nº do processo, ementa resumida (2–3 linhas) e link
   - Usa o tema selecionado e os dados do formulário/arquivos como contexto
   - Resultado vai para #jurisBox (editável)
*/
(function () {
  const { $, toast } = window.Clara;

  function buildPrompt(assunto, contexto, docs) {
    return `Você é um advogado trabalhista brasileiro sênior.
Liste JURISPRUDÊNCIAS REAIS e RECENTES (TST/TRTs/STF/STJ quando pertinente) sobre: "${assunto}".

Formate até 8 itens, cada um com:
1) Tribunal (e Turma se houver) e nº do processo
2) Tese/ementa resumida (2–3 linhas, linguagem clara)
3) Link (URL verificável). Se não tiver link confiável, escreva "verificar no site do tribunal".

Regras:
- Priorize julgados pós-2017 (reforma) quando aplicável.
- NÃO invente número de processo. Prefira citar o número padrão (ex.: RR-XXXXX-XX.XXXX.5.XX.XXXX).
- Indique quando a tese divergir (se houver).

Contexto do caso (resumo do formulário):
${JSON.stringify(contexto || {}, null, 2)}

Trechos dos documentos anexados (recorte):
${(docs || '(sem docs)').slice(0, 20000)}
`;
  }

  async function buscarJurisprudencia() {
    const cfg = window.Clara.ia?.loadCfg();
    if (!cfg?.apiKey) {
      toast('Cole sua OpenAI API key em Configurar IA', 'bad');
      $('#modal')?.classList.remove('hidden');
      return;
    }

    const temaKey = $('#temaSelect')?.value || '';
    const temaNome = window.Clara.catalog?.data?.[temaKey]?.nome || '';
    const assunto = prompt('Tema/assunto para pesquisar jurisprudência:', temaNome) || temaNome || '';
    if (!assunto) return;

    const contexto = window.Clara.collect?.() || {};
    const docs = window.Clara.state?.docsText || '';

    const prompt = buildPrompt(assunto, contexto, docs);

    try {
      $('#loading')?.classList.remove('hidden');
      const text = await window.Clara.ia.callOpenAI({ prompt, cfg });
      const box = $('#jurisBox');
      if (box) {
        // Limpeza simples de saídas não estruturadas
        const cleaned = text
          .replace(/^\s*Jurisprud[eê]ncia[s]?:?\s*/i, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        box.value = cleaned;
        toast('Jurisprudência sugerida (revise e valide os links).');
      }
    } catch (e) {
      console.error(e);
      toast('Falha ao buscar jurisprudência', 'bad');
    } finally {
      $('#loading')?.classList.add('hidden');
    }
  }

  // Expor e bind
  window.Clara = Object.assign(window.Clara || {}, { juris: { buscarJurisprudencia } });
  window.addEventListener('app:ready', () => {
    $('#btnJuris')?.addEventListener('click', buscarJurisprudencia);
  });
})();
