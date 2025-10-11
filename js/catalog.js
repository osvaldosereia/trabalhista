/* catalog.js — catálogo de temas, sugestões e textos-guia */
(function () {
  const cat = {
    horas_extras: {
      nome: "Horas extras",
      fatos: [
        { t: "Jornada habitual acima de 8h/44h sem pagamento integral.", tip: "Cartões de ponto, e-mails, metas inviáveis." },
        { t: "Intervalo intrajornada suprimido total/parcial.", tip: "Concedido < 1h (ou < 30min com ACT/CCT) – CLT art.71." },
        { t: "Banco de horas/compensação inválidos.", tip: "Acordo individual irregular/sem ACT/CCT válido." },
        { t: "Ausência de controle de ponto ou ‘ponto britânico’.", tip: "CLT art.74 §2º; Súmula 338/TST." }
      ],
      narrativa: [
        { t: "Laborava de seg. a sáb., das 8h às 19h, com apenas ~20 min de intervalo.", tip: "Detalhar variações e períodos." },
        { t: "Registros eram por exceção/manipulados, não refletindo a realidade.", tip: "Padrões repetidos/rasuras." }
      ],
      fundamentos: [
        { t: "CF art.7º, XIII (limites de jornada) e CLT art.59 (adicional 50%).", tip: "Reflexos: DSR, 13º, férias+1/3, FGTS 40%." },
        { t: "Intervalo intrajornada – CLT art.71 (tempo suprimido +50%).", tip: "Súmula 437/TST (pre/pos reforma – adequar ao período)." },
        { t: "Ônus/controle de jornada – CLT art.74 §2º; Súmula 338/TST.", tip: "Sem controle, presume-se a jornada alegada." }
      ],
      pedidos: [
        { t: "Pagto. de horas extras (50%/100%) com reflexos.", tip: "Quantificar por período." },
        { t: "Pagto. do intervalo suprimido como extra (+50%).", tip: "Minutos/dia × período." }
      ]
    },
    noturno: {
      nome: "Adicional noturno",
      fatos: [
        { t: "Trabalho após 22h sem adicional.", tip: "Hora noturna reduzida (52m30s)." }
      ],
      narrativa: [{ t: "Prestava labor das 22h às 05h em escala periódica.", tip: "Indicar frequência." }],
      fundamentos: [
        { t: "CLT art.73 (20% sobre hora diurna; hora reduzida).", tip: "CF art.7º, IX." }
      ],
      pedidos: [{ t: "Pagto. do adicional noturno com reflexos.", tip: "Indicar meses/quantidade de horas." }]
    },
    insalubridade: {
      nome: "Adicional de insalubridade",
      fatos: [
        { t: "Exposição a ruído/calor/agente químico acima dos limites NR-15.", tip: "EPI ineficaz/inexistente." }
      ],
      narrativa: [{ t: "Labor em setor com ruído elevado e EPI insuficiente.", tip: "Mencionar medição pericial esperada." }],
      fundamentos: [
        { t: "CLT art.192; NR-15 (graus 10/20/40%).", tip: "Súmula 80/TST (EPI eficaz afasta adicional)." }
      ],
      pedidos: [{ t: "Pagto. do adicional (grau a apurar) e reflexos.", tip: "Do início da exposição até o fim do contrato." }]
    },
    rescisao: {
      nome: "Verbas rescisórias/FGTS",
      fatos: [
        { t: "Dispensa sem justa causa com acerto fora do prazo.", tip: "CLT art.477 §8º (multa)." },
        { t: "Ausência de depósitos de FGTS.", tip: "Lei 8.036/90." }
      ],
      narrativa: [{ t: "Recebeu apenas parte do acerto e sem guias SD.", tip: "Indicar datas e parcelas." }],
      fundamentos: [
        { t: "CF art.7º VIII/XVII (13º, férias); CLT art.477; Lei 8.036/90.", tip: "Multa 40% e depósitos faltantes." }
      ],
      pedidos: [
        { t: "Férias + 1/3 (vencidas/proporcionais).", tip: "Especificar períodos." },
        { t: "13º proporcional.", tip: "Meses ≥ 15 dias contam." },
        { t: "Multa de 40% do FGTS + diferenças de depósitos.", tip: "Planilha estimada." },
        { t: "Multa do art.477 CLT.", tip: "Atraso > 10 dias." }
      ]
    },
    equiparacao: {
      nome: "Equiparação / diferenças salariais",
      fatos: [
        { t: "Função idêntica a paradigma com salário menor.", tip: "Mesma localidade/época; ≤ 2 anos na função." }
      ],
      narrativa: [{ t: "Executava tarefas idênticas às do paradigma X.", tip: "Descrever produtividade/perfeição." }],
      fundamentos: [{ t: "CLT art.461.", tip: "Quadro de carreira afasta." }],
      pedidos: [{ t: "Diferenças mensais + reflexos.", tip: "Do início da identidade funcional." }]
    },
    danos_morais: {
      nome: "Dano moral (assédio/discriminação)",
      fatos: [
        { t: "Humilhações públicas reiteradas.", tip: "Testemunhas/prints." },
        { t: "Dispensa discriminatória (doença grave/gestação).", tip: "Súmula 443/TST (presunção)." }
      ],
      narrativa: [{ t: "Chefia dirigia ofensas em reuniões.", tip: "Citar episódios e efeitos." }],
      fundamentos: [
        { t: "CF art.5º, V/X; CLT arts.223-A a 223-G.", tip: "Parâmetros de arbitramento." }
      ],
      pedidos: [{ t: "Indenização por dano moral (grau e valor).", tip: "Compatível com gravidade do caso." }]
    }
  };

  function fillTemaSelect() {
    const sel = document.getElementById('temaSelect');
    if (!sel) return;
    sel.innerHTML = `<option value="">Selecione…</option>` + Object.entries(cat).map(([k, v]) =>
      `<option value="${k}">${v.nome}</option>`).join('');
  }

  function pushSuggestions(kind) {
    const tema = document.getElementById('temaSelect')?.value;
    if (!tema || !cat[tema]) return window.Clara.toast('Selecione um tema', 'warn');
    const items = cat[tema][kind] || [];
    if (!items.length) return;
    if (kind === 'fatos' || kind === 'narrativa') {
      const target = document.getElementById(kind === 'fatos' ? 'fatos' : 'fundamentos');
      const txt = items.map(i => `• ${i.t}${i.tip ? ` (${i.tip})` : ''}`).join('\n');
      if (target) target.value = (target.value ? target.value + '\n' : '') + txt + '\n';
    }
    if (kind === 'fundamentos') {
      const el = document.getElementById('fundamentos');
      const txt = items.map(i => `- ${i.t}${i.tip ? ` — ${i.tip}` : ''}`).join('\n');
      if (el) el.value = (el.value ? el.value + '\n' : '') + txt + '\n';
    }
    if (kind === 'pedidos') {
      items.forEach(p => window.Clara.form?.addPedido(p.t));
      window.Clara.form?.buildValoresFromPedidos();
    }
    window.Clara.toast('Sugestões inseridas');
  }

  window.Clara = Object.assign(window.Clara || {}, {
    catalog: { data: cat, fillTemaSelect, pushSuggestions }
  });

  // auto-init após carregar as seções
  window.addEventListener('partials:loaded', fillTemaSelect);
})();
