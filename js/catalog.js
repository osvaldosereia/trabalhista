/* catalog.js — Catálogo de temas e sugestões (Fatos, Narrativa, Fundamentos, Pedidos)
   Objetivo: acelerar o preenchimento com opções selecionáveis e comentários.
   Observação: o catálogo pode ser expandido livremente abaixo.
*/
(function () {
  const cat = {
    // =============== HORAS EXTRAS ===============
    horas_extras: {
      nome: "Horas Extras",
      fatos: [
        { t: "Jornada superior a 8h/44h sem pagamento integral.", tip: "Indicar períodos específicos e variações." },
        { t: "Intervalo intrajornada suprimido total/parcial.", tip: "Ex.: pausa de 20–30min em vez de 1h." },
        { t: "Compensação/banco de horas inválidos.", tip: "Sem ACT/CCT; ausência de controle transparente." },
        { t: "Ponto britânico/por exceção que não reflete a realidade.", tip: "Registros idênticos; manipulações." }
      ],
      narrativa: [
        { t: "Laborava de segunda a sábado, iniciando às 08:00 e encerrando, em média, às 19:00, com apenas ~20 minutos de intervalo.", tip: "Adaptar por período." },
        { t: "Os cartões de ponto eram por exceção/manipulados, não refletindo a jornada efetiva.", tip: "Mencionar indícios (padrões repetidos, rasuras)." }
      ],
      fundamentos: [
        { t: "CF/88 art. 7º, XIII; CLT art. 59 (adicional 50%).", tip: "Reflexos: DSR, 13º, férias + 1/3, FGTS + 40%." },
        { t: "Intervalo intrajornada — CLT art. 71; Súm. 437/TST.", tip: "Indenização do tempo suprimido." },
        { t: "Ônus/controle de jornada — CLT art. 74 §2º; Súm. 338/TST.", tip: "Ausente o controle, presume-se a jornada alegada." }
      ],
      pedidos: [
        { t: "Pagamento de horas extras (50% e 100%), com reflexos.", tip: "Precisar períodos." },
        { t: "Pagamento do intervalo intrajornada suprimido como extra (+50%).", tip: "Minutos/dia × período." }
      ]
    },

    // =============== INTERVALO INTRA/INTERJORNADA ===============
    intervalo: {
      nome: "Intervalo Intrajornada/Interjornada",
      fatos: [
        { t: "Concessão parcial de intervalo intrajornada.", tip: "Ex.: 20–30min." },
        { t: "Descumprimento do intervalo interjornada (11h).", tip: "Escalas com saídas e retornos curtos." }
      ],
      narrativa: [
        { t: "Intervalo para refeição e descanso raramente alcançava 1h.", tip: "Relatar rotina e obstáculos." },
        { t: "A folga entre uma jornada e outra era inferior a 11h em diversos dias.", tip: "Indicar exemplos." }
      ],
      fundamentos: [
        { t: "CLT art. 71 e 66; Súm. 437/TST.", tip: "Tempo suprimido devido como extra." }
      ],
      pedidos: [
        { t: "Pagamento do período suprimido do intervalo, com adicional e reflexos.", tip: "Separar intra e interjornada se necessário." }
      ]
    },

    // =============== ADICIONAL NOTURNO ===============
    adicional_noturno: {
      nome: "Adicional Noturno",
      fatos: [
        { t: "Trabalho após 22h sem adicional devido.", tip: "Hora noturna reduzida (52m30s)." }
      ],
      narrativa: [
        { t: "Prestava labor noturno habitual, das 22h às 05h, com variações por escala.", tip: "Indicar frequência." }
      ],
      fundamentos: [
        { t: "CLT art. 73 (20% sobre hora diurna; hora reduzida).", tip: "CF/88 art. 7º IX." }
      ],
      pedidos: [
        { t: "Pagamento do adicional noturno com reflexos.", tip: "Precisar meses/quantidade de horas." }
      ]
    },

    // =============== INSALUBRIDADE ===============
    insalubridade: {
      nome: "Insalubridade",
      fatos: [
        { t: "Exposição a agentes nocivos acima dos limites da NR-15.", tip: "Ruído, calor, químicos; EPI ineficaz." }
      ],
      narrativa: [
        { t: "Atuava em setor com ruído elevado; EPIs fornecidos eram insuficientes/ineficazes.", tip: "Indicar periódicos/ASOs." }
      ],
      fundamentos: [
        { t: "CLT art. 192; NR-15; Súm. 80/TST.", tip: "Grau 10/20/40%, a apurar." }
      ],
      pedidos: [
        { t: "Adicional de insalubridade (grau a apurar) e reflexos.", tip: "Do início da exposição até o fim do contrato." }
      ]
    },

    // =============== RESCISÃO / FGTS / VERBAS ===============
    rescisao_indireta: {
      nome: "Rescisão Indireta / Verbas Rescisórias",
      fatos: [
        { t: "Atrasos reiterados/ausência de pagamento de salários/FGTS.", tip: "Incidência art. 483 CLT." },
        { t: "Condições de trabalho gravosas/descumprimento contratual.", tip: "Ex.: jornadas extenuantes, assédio." }
      ],
      narrativa: [
        { t: "O empregador deixou de adimplir obrigações essenciais, tornando insustentável a continuidade do vínculo.", tip: "Detalhar ocorrências e datas." }
      ],
      fundamentos: [
        { t: "CLT art. 483; Lei 8.036/90 (FGTS); CF/88 art. 7º.", tip: "Multa 40% FGTS; guias SD." }
      ],
      pedidos: [
        { t: "Reconhecimento da rescisão indireta.", tip: "Conversão em dispensa sem justa causa." },
        { t: "Férias + 1/3 (vencidas/proporcionais), 13º proporcional, saldo salário.", tip: "Precisar períodos." },
        { t: "Depósitos de FGTS + multa 40%.", tip: "Planilha estimada." },
        { t: "Multa do art. 477 CLT, se aplicável.", tip: "Atraso no acerto." }
      ]
    },

    // =============== EQUIPARAÇÃO ===============
    equiparacao: {
      nome: "Equiparação Salarial",
      fatos: [
        { t: "Função idêntica a paradigma com salário inferior.", tip: "Mesma localidade/época; diferença < 2 anos." }
      ],
      narrativa: [
        { t: "Executava tarefas idênticas às do paradigma, com mesma produtividade e perfeição técnica.", tip: "Citar atividades e período." }
      ],
      fundamentos: [
        { t: "CLT art. 461.", tip: "Quadro de carreira válido afasta." }
      ],
      pedidos: [
        { t: "Diferenças salariais mensais + reflexos.", tip: "Do início da identidade funcional." }
      ]
    },

    // =============== DANO MORAL ===============
    dano_moral: {
      nome: "Dano Moral (assédio/discriminação)",
      fatos: [
        { t: "Humilhações/assédio reiterados em ambiente de trabalho.", tip: "Testemunhas, mensagens, reuniões." },
        { t: "Dispensa discriminatória (doença grave/gestação).", tip: "Súm. 443/TST (presunção)." }
      ],
      narrativa: [
        { t: "A chefia dirigia ofensas públicas e ameaças, causando abalo psíquico.", tip: "Relatar episódios e efeitos." }
      ],
      fundamentos: [
        { t: "CF/88 art. 5º, V e X; CLT arts. 223-A a 223-G.", tip: "Parâmetros de arbitramento." }
      ],
      pedidos: [
        { t: "Indenização por dano moral (grau e valor).", tip: "Compatível com gravidade e reiteração." }
      ]
    }
  };

  // ===== Helpers de UI =====
  function fillTemaSelect() {
    const sel = document.getElementById('temaSelect');
    if (!sel) return;
    sel.innerHTML = `<option value="">Selecione…</option>` + Object.entries(cat)
      .map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('');
  }

  function itemsToText(items, bullet = '• ') {
    return items.map(i => `${bullet}${i.t}${i.tip ? ` (${i.tip})` : ''}`).join('\n');
  }

  function pushSuggestions(kind) {
    const tema = document.getElementById('temaSelect')?.value;
    if (!tema || !cat[tema]) return window.Clara.toast('Selecione um tema', 'warn');
    const items = cat[tema][kind] || [];
    if (!items.length) return;

    if (kind === 'fatos' || kind === 'narrativa') {
      const target = document.getElementById(kind === 'fatos' ? 'fatos' : 'fatos'); // narrativa vai junto em "fatos" (campo narrativo)
      const txt = itemsToText(items);
      if (target) target.value = (target.value ? target.value + '\n' : '') + txt + '\n';
    }

    if (kind === 'fundamentos') {
      const el = document.getElementById('fundamentos');
      const txt = items.map(i => `- ${i.t}${i.tip ? ` — ${i.tip}` : ''}`).join('\n');
      if (el) el.value = (el.value ? el.value + '\n' : '') + txt + '\n';
    }

    if (kind === 'pedidos') {
      items.forEach(p => window.Clara.form?.addPedido(p.t));
      window.Clara.form?.buildValoresFromPedidos?.();
    }

    window.Clara.toast('Sugestões inseridas');
  }

  // Exposição
  window.Clara = Object.assign(window.Clara || {}, {
    catalog: { data: cat, fillTemaSelect, pushSuggestions }
  });

  // auto-init quando os partials terminam de carregar
  window.addEventListener('partials:loaded', fillTemaSelect);
})();
