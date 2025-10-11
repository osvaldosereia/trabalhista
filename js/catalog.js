/* catalog.js — Catálogo de temas e sugestões (Fatos, Narrativa, Fundamentos, Pedidos)
   - Preenche o <select id="temaSelect">
   - Oferece inserção rápida de sugestões (fatos/narrativa/fundamentos/pedidos)
   - Popula <select id="fatosSug"> com sugestões selecionáveis e permite dar duplo clique para inserir
   - Integra com Clara.form (addPedido/buildValoresFromPedidos) quando disponível
*/
(function () {
  // ========================== CATÁLOGO ==========================
  const cat = {
    // =============== HORAS EXTRAS ===============
    horas_extras: {
      nome: "Horas Extras",
      fatos: [
        { t: "Jornada superior a 8h/dia ou 44h/semana sem pagamento integral.", tip: "Indicar períodos específicos e variações." },
        { t: "Intervalo intrajornada suprimido total ou parcialmente.", tip: "Ex.: pausa de 20–30min em vez de 1h." },
        { t: "Compensação/banco de horas inválidos.", tip: "Sem ACT/CCT válido; ausência de transparência." },
        { t: "Ponto britânico/por exceção que não reflete a realidade.", tip: "Registros idênticos; manipulações; rasuras." },
        { t: "Labor em domingos/feriados sem folga compensatória.", tip: "Registrar datas e escalas." }
      ],
      narrativa: [
        { t: "Laborava de segunda a sábado, iniciando às 08:00 e encerrando por volta das 19:00, com ~20 minutos de intervalo.", tip: "Adaptar por período." },
        { t: "Os cartões de ponto não refletiam a jornada efetiva, pois eram por exceção/manipulados.", tip: "Apontar padrões repetidos." }
      ],
      fundamentos: [
        { t: "CF/88 art. 7º, XIII e XVI; CLT art. 59 (adicional 50%).", tip: "Reflexos: DSR, 13º, férias + 1/3, FGTS + 40%." },
        { t: "Intervalo intrajornada — CLT art. 71; Súmula 437/TST.", tip: "Indenização do tempo suprimido." },
        { t: "Controle de jornada — CLT art. 74 §2º; Súmula 338/TST.", tip: "Ausente o controle, presume-se a jornada alegada." }
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
        { t: "Concessão parcial de intervalo intrajornada.", tip: "Ex.: 20–30min no lugar de 1h." },
        { t: "Descumprimento do intervalo interjornada (11h).", tip: "Escalas com saídas e retornos curtos." }
      ],
      narrativa: [
        { t: "Intervalo para repouso e alimentação raramente alcançava 1h.", tip: "Relatar rotina e obstáculos." },
        { t: "A folga entre jornadas era inferior a 11h em diversos dias.", tip: "Indicar exemplos." }
      ],
      fundamentos: [
        { t: "CLT arts. 71 e 66; Súm. 437/TST.", tip: "Tempo suprimido devido como extra." }
      ],
      pedidos: [
        { t: "Pagamento do período suprimido do intervalo, com adicional e reflexos.", tip: "Separar intra e interjornada se necessário." }
      ]
    },

    // =============== ADICIONAL NOTURNO ===============
    adicional_noturno: {
      nome: "Adicional Noturno",
      fatos: [
        { t: "Trabalho após 22h sem pagamento do adicional devido.", tip: "Hora noturna reduzida (52m30s)." },
        { t: "Prorrogação do noturno sem adicional devido.", tip: "Horas após 5h." }
      ],
      narrativa: [
        { t: "Prestava labor noturno habitual, das 22h às 05h, com variações por escala.", tip: "Indicar frequência." }
      ],
      fundamentos: [
        { t: "CLT art. 73 (20% sobre hora diurna; hora reduzida).", tip: "CF/88 art. 7º IX." }
      ],
      pedidos: [
        { t: "Pagamento do adicional noturno com reflexos.", tip: "Precisar meses e quantidade de horas." }
      ]
    },

    // =============== INSALUBRIDADE ===============
    insalubridade: {
      nome: "Insalubridade",
      fatos: [
        { t: "Exposição a agentes nocivos acima dos limites da NR-15.", tip: "Ruído, calor, químicos; EPI ineficaz." },
        { t: "Falta de treinamentos e de monitoramento periódico (PCMSO/PPRA).", tip: "ASOs inconsistentes." }
      ],
      narrativa: [
        { t: "Atuava em setor com ruído elevado; EPIs fornecidos eram insuficientes/ineficazes.", tip: "Indicar ASOs/PPRA/PCMSO." }
      ],
      fundamentos: [
        { t: "CLT art. 192; NR-15; Súm. 80/TST.", tip: "Grau 10/20/40%, a apurar." }
      ],
      pedidos: [
        { t: "Adicional de insalubridade (grau a apurar) e reflexos.", tip: "Do início da exposição ao fim do contrato." }
      ]
    },

    // =============== RESCISÃO INDIRETA/VERBAS ===============
    rescisao_indireta: {
      nome: "Rescisão Indireta / Verbas Rescisórias",
      fatos: [
        { t: "Atrasos reiterados/ausência de salários/FGTS.", tip: "Incidência do art. 483 CLT." },
        { t: "Descumprimento contratual grave.", tip: "Supressão de adicionais; jornadas extenuantes." }
      ],
      narrativa: [
        { t: "O empregador deixou de adimplir obrigações essenciais, tornando inviável a continuidade do vínculo.", tip: "Detalhar ocorrências e datas." }
      ],
      fundamentos: [
        { t: "CLT art. 483; Lei 8.036/90 (FGTS); CF/88 art. 7º.", tip: "Multa 40% FGTS; guias SD." }
      ],
      pedidos: [
        { t: "Reconhecimento da rescisão indireta.", tip: "Conversão em dispensa sem justa causa." },
        { t: "Férias + 1/3 (vencidas/proporcionais), 13º proporcional, saldo de salário.", tip: "Precisar períodos." },
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
    },

    // =============== PERICULOSIDADE ===============
    periculosidade: {
      nome: "Periculosidade",
      fatos: [
        { t: "Contato permanente com inflamáveis/energia elétrica sem proteção adequada.", tip: "Áreas de risco; NR-16." }
      ],
      narrativa: [
        { t: "Atuava em área classificada como perigosa, com contato habitual a agente de risco.", tip: "Descrever rotinas e locais." }
      ],
      fundamentos: [
        { t: "CLT art. 193; NR-16; Súm. 364/TST.", tip: "Adicional de 30% sobre salário-base." }
      ],
      pedidos: [
        { t: "Adicional de periculosidade (30%) + reflexos.", tip: "Desde o início da exposição." }
      ]
    },

    // =============== TELETRABALHO/SOBREAVISO ===============
    teletrabalho_sobreaviso: {
      nome: "Teletrabalho / Sobreaviso",
      fatos: [
        { t: "Exigência de disponibilidade constante via app/celular.", tip: "Restrições significativas à locomoção." }
      ],
      narrativa: [
        { t: "Permanecia em sobreaviso remoto, respondendo chamadas fora do expediente.", tip: "Frequência, janelas de plantão." }
      ],
      fundamentos: [
        { t: "CLT arts. 6º e 62, III; Súm. 428/TST.", tip: "Sobreaviso só com real restrição." }
      ],
      pedidos: [
        { t: "Horas de sobreaviso/plantão com adicional aplicável.", tip: "Quantificar por escalas." }
      ]
    },

    // =============== HORAS IN ITINERE (pré/pós reforma) ===============
    horas_in_itinere: {
      nome: "Horas in itinere (pré/pós-reforma)",
      fatos: [
        { t: "Deslocamento em condução fornecida p/ local de difícil acesso.", tip: "Somente até 10/11/2017 regra antiga." }
      ],
      narrativa: [
        { t: "Deslocava-se diariamente por transporte do empregador até local sem oferta regular.", tip: "Tempos médios (ida/volta)." }
      ],
      fundamentos: [
        { t: "Súm. 90/TST (período anterior à Lei 13.467/17).", tip: "Após reforma: regra restritiva." }
      ],
      pedidos: [
        { t: "Integração do tempo de percurso como extra (período devido).", tip: "Separar antes/depois da reforma." }
      ]
    },

    // =============== ADICIONAL DE TRANSFERÊNCIA ===============
    transferencia: {
      nome: "Adicional de Transferência",
      fatos: [
        { t: "Mudança provisória de domicílio por determinação do empregador.", tip: "Sem ânimo definitivo." }
      ],
      narrativa: [
        { t: "Foi transferido para outra cidade por X meses, mantendo vínculo original.", tip: "Indicar datas e local." }
      ],
      fundamentos: [
        { t: "CLT art. 469 § 3º (25%).", tip: "Indevido se mudança definitiva." }
      ],
      pedidos: [
        { t: "Adicional de transferência (25%) no período + reflexos.", tip: "Meses efetivos." }
      ]
    },

    // =============== ESTABILIDADE GESTANTE ===============
    estabilidade_gestante: {
      nome: "Estabilidade Gestante",
      fatos: [
        { t: "Dispensa durante estabilidade provisória.", tip: "Da concepção até 5 meses após parto." }
      ],
      narrativa: [
        { t: "Empregada foi dispensada estando grávida (ou engravidou no aviso).", tip: "Comprovar datas." }
      ],
      fundamentos: [
        { t: "ADCT art. 10, II, b; Súm. 244/TST.", tip: "Independe de ciência do empregador." }
      ],
      pedidos: [
        { t: "Reintegração ou indenização substitutiva + salários e reflexos.", tip: "Do período estabilitário." }
      ]
    },

    // =============== ACIDENTE/DOENÇA OCUPACIONAL ===============
    acidente_doenca: {
      nome: "Acidente/Doença Ocupacional",
      fatos: [
        { t: "Nexo causal ou concausal entre trabalho e lesão/doença.", tip: "CAT, laudos, perícia, ASO." }
      ],
      narrativa: [
        { t: "Sintomas iniciaram/agravaram-se com as atividades, exigindo afastamentos.", tip: "CID, afastos, tratamentos." }
      ],
      fundamentos: [
        { t: "CF art. 7º XXII; CLT; Lei 8.213/91; Súm. 378/TST.", tip: "Estabilidade acidentária 12 meses." }
      ],
      pedidos: [
        { t: "Indenizações (materiais/morais) e estabilidade acidentária.", tip: "Salários do período + FGTS." }
      ]
    },

    // =============== BANCO DE HORAS ===============
    banco_horas: {
      nome: "Banco de Horas",
      fatos: [
        { t: "Compensação sem ACT/CCT válido ou além dos limites legais.", tip: "Lançamentos unilaterais; saldos negativos." }
      ],
      narrativa: [
        { t: "Horas eram lançadas em banco sem transparência, com perdas de saldo.", tip: "Extratos e comunicações." }
      ],
      fundamentos: [
        { t: "CLT art. 59 §2º/§5º; Súm. 85/TST.", tip: "Nulidade parcial/total conforme o caso." }
      ],
      pedidos: [
        { t: "Pagamento de diferenças como horas extras + reflexos.", tip: "Por período e rubricas." }
      ]
    },

    // =============== VÍNCULO/PEJOTIZAÇÃO ===============
    pj_vinculo: {
      nome: "Vínculo/Pejotização",
      fatos: [
        { t: "Pessoalidade, habitualidade, onerosidade e subordinação com CNPJ interposto.", tip: "Indícios de fraude." }
      ],
      narrativa: [
        { t: "Prestava serviços como PJ, porém com ordens diretas e controle de jornada.", tip: "Detalhar comandos e metas." }
      ],
      fundamentos: [
        { t: "CLT art. 3º; Súm. 331/TST (quando terceirização).", tip: "Primazia da realidade." }
      ],
      pedidos: [
        { t: "Reconhecimento do vínculo + verbas celetistas/FGTS.", tip: "Anotar CTPS." }
      ]
    },

    // =============== TERCEIRIZAÇÃO ===============
    terceirizacao: {
      nome: "Terceirização/Responsabilidade",
      fatos: [
        { t: "Tomadora se beneficiava diretamente do trabalho prestado.", tip: "Fiscalização deficiente." }
      ],
      narrativa: [
        { t: "Labor em favor da tomadora, sob diretrizes funcionais desta.", tip: "Descrever frentes de serviço." }
      ],
      fundamentos: [
        { t: "Súm. 331/TST; Lei 13.429/17.", tip: "Subsidiária/solidária conforme o caso." }
      ],
      pedidos: [
        { t: "Responsabilidade subsidiária/solidária da tomadora.", tip: "Extensão a parcelas vencidas/vincendas." }
      ]
    },

    // =============== DESCONTOS INDEVIDOS ===============
    descontos_indevidos: {
      nome: "Descontos Indevidos",
      fatos: [
        { t: "Descontos sem autorização ou previstos indevidamente.", tip: "Danificações sem dolo; art. 462 CLT." }
      ],
      narrativa: [
        { t: "Folhas apresentavam abatimentos não pactuados ou sem respaldo.", tip: "Listar rubricas." }
      ],
      fundamentos: [
        { t: "CLT art. 462; CC art. 940 (devolução em dobro por má-fé).", tip: "Comprovar indevidos." }
      ],
      pedidos: [
        { t: "Devolução dos descontos + correção.", tip: "Identificar rubricas e meses." }
      ]
    },

    // =============== COMISSÕES/PLR ===============
    comissoes_plr: {
      nome: "Comissões/PLR/Variáveis",
      fatos: [
        { t: "Comissões pagas a menor/omitidas; PLR não paga.", tip: "Metas/relatórios de vendas; políticas internas." }
      ],
      narrativa: [
        { t: "Havia política de comissões e PLR, porém pagamentos eram inferiores ao devido.", tip: "Indicadores e e-mails." }
      ],
      fundamentos: [
        { t: "CF art. 7º; normas coletivas; Súm. 340/TST (comissionistas).", tip: "Base de cálculo e reflexos." }
      ],
      pedidos: [
        { t: "Diferenças de comissões/PLR + reflexos.", tip: "Critérios de apuração." }
      ]
    },

    // =============== MULTAS CONVENCIONAIS ===============
    multas_convencionais: {
      nome: "Multas Convencionais",
      fatos: [
        { t: "Descumprimento de cláusulas normativas.", tip: "CCT/ACT vigente." }
      ],
      narrativa: [
        { t: "Empregador não observou cláusulas coletivas acerca de jornada/verbas.", tip: "Citar cláusulas específicas." }
      ],
      fundamentos: [
        { t: "CF art. 7º, XXVI (reconhecimento de convenções/acordos).", tip: "Aplicar cláusula de multa." }
      ],
      pedidos: [
        { t: "Multa convencional prevista em ACT/CCT.", tip: "Por evento/por período conforme a cláusula." }
      ]
    }
  };

  // ========================== HELPERS ==========================
  function itemsToText(items, bullet = '• ') {
    return items.map(i => `${bullet}${i.t}${i.tip ? ` (${i.tip})` : ''}`).join('\n');
  }

  function fillTemaSelect() {
    const sel = document.getElementById('temaSelect');
    if (!sel) return;
    const opts = Object.entries(cat).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('');
    sel.innerHTML = `<option value="">Selecione…</option>${opts}`;
    // popula lista rápida ao trocar o tema
    sel.addEventListener('change', updateFatosSug);
    updateFatosSug();
  }

  function updateFatosSug() {
    const sel = document.getElementById('temaSelect');
    const list = document.getElementById('fatosSug');
    if (!sel || !list) return;
    const tema = sel.value;
    list.innerHTML = '';
    if (!tema || !cat[tema]) return;
    const combo = [...(cat[tema].fatos || []), ...(cat[tema].narrativa || [])];
    combo.forEach((i, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = `${i.t}${i.tip ? ` — ${i.tip}` : ''}`;
      list.appendChild(opt);
    });
  }

  function pushSuggestions(kind) {
    const tema = document.getElementById('temaSelect')?.value;
    if (!tema || !cat[tema]) return window.Clara.toast?.('Selecione um tema', 'warn');
    const items = cat[tema][kind] || [];
    if (!items.length) return;

    if (kind === 'fatos' || kind === 'narrativa') {
      // No layout atual, a narrativa usa o textarea #fatos
      const target = document.getElementById('fatos');
      const txt = itemsToText(items);
      if (target) target.value = (target.value ? target.value + '\n' : '') + txt + '\n';
    }

    if (kind === 'fundamentos') {
      const el = document.getElementById('fundamentos');
      const txt = items.map(i => `- ${i.t}${i.tip ? ` — ${i.tip}` : ''}`).join('\n');
      if (el) el.value = (el.value ? el.value + '\n' : '') + txt + '\n';
    }

    if (kind === 'pedidos') {
      items.forEach(p => window.Clara.form?.addPedido?.(p.t));
      window.Clara.form?.buildValoresFromPedidos?.();
    }

    window.Clara.toast?.('Sugestões inseridas');
  }

  // Inserção rápida a partir do <select multiple id="fatosSug"> por duplo clique
  function bindQuickInsert() {
    const list = document.getElementById('fatosSug');
    if (!list) return;
    list.addEventListener('dblclick', () => {
      const tema = document.getElementById('temaSelect')?.value;
      if (!tema || !cat[tema]) return;
      const combo = [...(cat[tema].fatos || []), ...(cat[tema].narrativa || [])];
      const target = document.getElementById('fatos');
      const chosen = Array.from(list.selectedOptions || []).map(o => combo[Number(o.value)]).filter(Boolean);
      if (!chosen.length || !target) return;
      const txt = itemsToText(chosen);
      target.value = (target.value ? target.value + '\n' : '') + txt + '\n';
      window.Clara.toast?.('Sugestões adicionadas');
    });
  }

  // ========================== EXPOSE & INIT ==========================
  window.Clara = Object.assign(window.Clara || {}, {
    catalog: { data: cat, fillTemaSelect, pushSuggestions, updateFatosSug }
  });

  window.addEventListener('partials:loaded', () => {
    fillTemaSelect();
    bindQuickInsert();
  });
})();
