/* ingestor.js — Ingestão assistida (até 10 arquivos) com RELATÓRIO editável e APLICAÇÃO autorizada
   - Lê PDF/TXT/CSV (até 10)
   - Classifica por tipo (holerite, ponto, contrato, docs pessoais etc.)
   - Gera: (1) RELATÓRIO de conferência (markdown, editável) e (2) JSON de proposta (editável)
   - Só aplica ao formulário após autorização explícita do advogado
*/
(function () {
  const { $, toast } = window.Clara;

  // --------------------- Config ---------------------
  const MAX_FILES = 10;
  const MAX_TEXT_LEN = 180_000; // corte de segurança
  const SUPPORTED = ['application/pdf', 'text/plain', 'text/csv', '']; // alguns navegadores não preenchem type

  // --------------------- Utils ----------------------
  const fname = (f) => (f?.name || '').toLowerCase();

  function classifyByName(name) {
    const n = (name || '').toLowerCase();
    // palavras-chave comuns (pt-BR e variações)
    if (/(holerite|contra.?cheque|contracheque|recibo.salario|pay.?slip)/.test(n)) return 'holerite';
    if (/(ponto|cartao.?ponto|timesheet|jornada|espelho)/.test(n)) return 'ponto';
    if (/(contrato|admissao|demissao|rescisao|trct|aviso.?previo|termo)/.test(n)) return 'contrato';
    if (/(fgts|grrf|chave|extrato|conectividade)/.test(n)) return 'fgts';
    if (/(ctps|carteira.?trabalho)/.test(n)) return 'ctps';
    if (/(cpf|rg|cnh|identidade|comprovante.end|comprovante.?resid)/.test(n)) return 'doc_pessoal';
    if (/(atest|aso|exame.?medico|ppra|pcms?o|ltcat|laudo)/.test(n)) return 'saude_seguranca';
    if (/(advertencia|suspensao|punicao)/.test(n)) return 'disciplina';
    return 'outros';
  }

  async function pdfToText(file) {
    const uint8 = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map(it => it.str).join(' ') + '\n';
    }
    return out;
  }

  async function readFiles(files) {
    const list = Array.from(files || []).slice(0, MAX_FILES);
    const manifest = [];           // [{name,type,kind,length}]
    const stitched = [];           // ["=== ARQUIVO: nome ===\ntexto"]
    let accLen = 0;

    for (const f of list) {
      if (!SUPPORTED.includes(f.type)) {
        manifest.push({ name: f.name, type: f.type || '-', kind: 'ignorado', length: 0, reason: 'Tipo não suportado' });
        continue;
      }
      try {
        let text = '';
        if (f.type === 'application/pdf') text = await pdfToText(f);
        else text = await f.text();

        const kind = classifyByName(f.name);
        const remain = Math.max(0, MAX_TEXT_LEN - accLen);
        const slice = text.slice(0, remain);
        stitched.push(`\n\n=== ARQUIVO: ${f.name} [${kind}] ===\n${slice}`);
        manifest.push({ name: f.name, type: f.type || 'text', kind, length: text.length });
        accLen += slice.length;
        if (accLen >= MAX_TEXT_LEN) break;
      } catch (e) {
        manifest.push({ name: f.name, type: f.type || '-', kind: 'falha', length: 0, reason: e?.message || String(e) });
      }
    }
    return { manifest, text: stitched.join('').trim() };
  }

  function schemaHelp() {
    // Schema alvo esperado pela aplicação (igual ao loader do review.js)
    return {
      juizo: "5ª Vara do Trabalho de São Paulo/SP",
      reclamante: {
        nome: "Fulano da Silva", estado_civil: "solteiro", prof: "operador",
        cpf: "000.000.000-00", rg: "00.000.000-0",
        end: "Rua X, 123", cep: "00000-000", tel: "(11) 90000-0000", email: "fulano@email.com"
      },
      reclamadas: [
        { nome: "Empresa S/A", doc: "00.000.000/0001-00", end: "Av. Y, 1000", cep: "00000-000", tel: "(11) 3000-0000", email: "juridico@empresa.com" }
      ],
      contrato: {
        adm: "2021-01-10", saida: "2023-03-20", funcao: "Auxiliar",
        salario: "2500.00", jornada: "8h/d, 44h/sem", controlePonto: "eletrônico", desligamento: "sem justa causa"
      },
      fatos: "Resumo dos fatos relevantes…",
      fundamentos: "- CLT art. 58…\n- Súmula 338/TST…",
      pedidos: [
        { titulo: "Horas Extras", detalhe: "50% e 100% com reflexos", subpedidos: ["Reflexos em DSR", "Reflexos em 13º e férias+1/3"] }
      ],
      provas: ["holerites", "cartões de ponto"],
      justicaGratuita: true,
      honorarios: true,
      valorCausa: 0,

      // Campos opcionais avançados (para cálculos/relatórios)
      anexos: {
        holerites: [], // [{competencia:"2023-01", salarioBase:..., he50:..., he100:..., adicionais:{noturno:...,periculosidade:...,insalubridade:...}, descontos:{faltas:...,inss:...,vt:...,vr:...}}]
        ponto: [],     // [{data:"2023-01-10", entrada:"08:00", saida:"19:20", intrajornada:"00:20"}]
        contrato: {},  // {tipo:"prazo indeterminado", salario:"...", cargaHoraria:"...", funcao:"...", setor:"..."}
        pessoais: {}   // {cpf:"...", rg:"...", ctps:"...", endereco:"..."}
      }
    };
  }

  function buildSystemPrompt({ manifest, text, contexto }) {
    return `Você é advogado trabalhista brasileiro sênior e atuará como EXTRATOR de dados + ANALISTA DE DOCUMENTOS.
Leia os documentos transcritos e produza DOIS BLOCOS DE SAÍDA:

[SAÍDA 1 — JSON PURO]
- Devolva APENAS um JSON válido, no SCHEMA especificado abaixo, sem comentários.
- Preencha somente o que estiver suportado pelos documentos (o que não existir deve manter "" ou 0).
- Preserve detalhes de HOLERITES (competência, rubricas relevantes) e CARTÕES DE PONTO (data, horários, intervalo).
- NÃO invente valores, datas ou nomes; se incerto, use "".

[SCHEMA]
${JSON.stringify(schemaHelp(), null, 2)}

[SAÍDA 2 — RELATÓRIO (MARKDOWN)]
- Após o JSON, gere um relatório conciso e EDITÁVEL com:
  • Sumário dos documentos lidos (por tipo: holerite, ponto, contrato, pessoais, fgts etc.)
  • Hipóteses adotadas e lacunas identificadas (ex.: ausência de cartões no período X)
  • Quadro-resumo com itens de risco/probabilidade
  • Lista do que foi ignorado por falta de evidência

[MANIFEST]
${JSON.stringify(manifest, null, 2)}

[DOCUMENTOS TRANSCRITOS — CORTADOS PARA CONTROLE DE TOKENS]
${text || '(vazio)'}

[CONTEXTO OPCIONAL DO FORMULÁRIO]
${JSON.stringify(contexto || {}, null, 2)}
`;
  }

  function setOutputs({ jsonText, reportText }) {
    const j = $('#ingestJson'), r = $('#ingestReport');
    if (j) j.value = (jsonText || '').trim();
    if (r) r.value = (reportText || '').trim();
  }

  function extractJsonAndReport(raw) {
    // Pega o primeiro bloco JSON e considera o restante como relatório
    const m = raw.match(/\{[\s\S]*?\}\s*$/m); // JSON mais externo até o fim (linha a linha às vezes há trailing)
    // Melhor: achar o primeiro JSON bem formado
    const firstJson = raw.match(/\{[\s\S]*?\}\s*(?=\n|$)/);
    if (!firstJson) return { jsonText: '', reportText: raw };
    const jsonText = firstJson[0];
    const reportText = raw.slice(firstJson.index + jsonText.length).trim();
    return { jsonText, reportText };
  }

  function applyDataToForm(d) {
    try {
      localStorage.setItem('draft_peticao', JSON.stringify(d));
      // loader do review.js
      if (window.Clara.review?.loadDraftToForm) {
        window.Clara.review.loadDraftToForm();
      }
      toast('Dados aplicados ao formulário');
      window.Clara.history?.saveVersion('ingest_apply');
      // Ir para Fatos (ou onde preferir)
      window.Clara.ui?.setStep(3);
    } catch (e) {
      console.error(e);
      toast('Falha ao aplicar dados', 'bad');
    }
  }

  // --------------------- Fluxo principal ---------------------
  async function runIngestion() {
    const files = $('#bulkUpload')?.files;
    // lista visual (já é tratada em sections.html), aqui só validamos quantidade
    if (!files || !files.length) { toast('Selecione até 10 arquivos', 'warn'); return; }
    if (files.length > MAX_FILES) { toast('Máximo de 10 arquivos por vez', 'warn'); return; }

    const { manifest, text } = await readFiles(files);

    // Guarda o texto no estado global (para cálculo/IA gerais)
    window.Clara.state.docsText = text;

    const cfg = window.Clara.ia?.loadCfg();
    if (!cfg?.apiKey) {
      toast('Cole sua OpenAI API key em Configurar IA', 'bad');
      $('#modal')?.classList.remove('hidden');
      return;
    }

    const contexto = window.Clara.collect?.() || {};
    const prompt = buildSystemPrompt({ manifest, text, contexto });

    try {
      $('#loading')?.classList.remove('hidden');
      const raw = await window.Clara.ia.callOpenAI({ prompt, cfg });
      const { jsonText, reportText } = extractJsonAndReport(raw);

      // Validação básica do JSON proposto (pode ser editado depois)
      try { JSON.parse(jsonText); }
      catch { toast('Revise o JSON proposto (formato inválido)', 'warn'); }

      setOutputs({ jsonText, reportText });
      toast('Relatório e proposta gerados — revise e edite antes de aplicar.');
    } catch (e) {
      console.error(e);
      toast('Falha ao processar ingestão por IA', 'bad');
    } finally {
      $('#loading')?.classList.add('hidden');
    }
  }

  function discardIngestion() {
    setOutputs({ jsonText: '', reportText: '' });
    toast('Relatório e proposta descartados');
  }

  function applyFromEditedJson() {
    const txt = $('#ingestJson')?.value || '';
    if (!txt.trim()) { toast('JSON vazio — revise a proposta antes de aplicar', 'warn'); return; }
    // Confirmação
    if (!confirm('Aplicar automaticamente todos os dados nos campos do formulário?\nVocê poderá editar depois.')) return;

    try {
      const data = JSON.parse(txt);
      applyDataToForm(data);
    } catch (e) {
      toast('JSON inválido — corrija antes de aplicar', 'bad');
      console.error(e);
    }
  }

  // --------------------- Bind UI ---------------------
  window.addEventListener('app:ready', () => {
    $('#btnIngestIA')?.addEventListener('click', runIngestion);
    $('#btnIngestApply')?.addEventListener('click', applyFromEditedJson);
    $('#btnIngestDiscard')?.addEventListener('click', discardIngestion);
  });

  // Expor para outros módulos, se necessário
  window.Clara = Object.assign(window.Clara || {}, {
    ingestor: { runIngestion, applyFromEditedJson, discardIngestion }
  });
})();
