/* catalog.js — Catálogo e Checklist (multi-temas)
   - Preenche #temaSelect (multiple)
   - renderChecklist(): cria cards por tema com checkboxes de Fatos, Fundamentos e Pedidos
   - applyChecked(target): aplica itens marcados ao destino ("fatos" | "fundamentos" | "pedidos")
   - Lista rápida (#fatosSug) continua: duplo clique insere em Fatos
*/
(function () {
  // ========================== CATÁLOGO ==========================
  const cat = {
    horas_extras: {
      nome: "Horas Extras",
      fatos: [
        { t: "Jornada superior a 8h/dia ou 44h/semana sem pagamento integral.", tip: "Indicar períodos e variações." },
        { t: "Intervalo intrajornada suprimido total/parcial.", tip: "Ex.: 20–30min no lugar de 1h." },
        { t: "Compensação/banco de horas inválidos.", tip: "Sem ACT/CCT válido; falta de transparência." },
        { t: "Ponto britânico/por exceção que não reflete a realidade.", tip: "Registros idênticos; manipulações." },
        { t: "Labor em domingos/feriados sem folga compensatória.", tip: "Registrar datas e escalas." }
      ],
      narrativa: [
        { t: "Laborava de segunda a sábado, das 08:00 às 19:00 (média), com ~20 minutos de intervalo.", tip: "Ajustar por período." },
        { t: "Cartões de ponto não refletiam a jornada efetiva (por exceção/manipulados).", tip: "Mencionar padrões repetidos." }
      ],
      fundamentos: [
        { t: "CF/88 art. 7º, XIII/XVI; CLT art. 59 (adicional 50%).", tip: "Reflexos em DSR/13º/férias + 1/3/FGTS+40%." },
        { t: "Intervalo intrajornada — CLT art. 71; Súm. 437/TST.", tip: "Indenização do tempo suprimido." },
        { t: "Controle de jornada — CLT art. 74 §2º; Súm. 338/TST.", tip: "Ausente controle → presume-se a jornada." }
      ],
      pedidos: [
        { t: "Horas extras (50% e 100%) com reflexos.", tip: "Precisar períodos." },
        { t: "Indenização do intervalo intrajornada suprimido (como extra) + reflexos.", tip: "Minutos/dia × período." }
      ]
    },
    intervalo: {
      nome: "Intervalo Intrajornada/Interjornada",
      fatos: [
        { t: "Concessão parcial de intervalo intrajornada.", tip: "20–30min em vez de 1h." },
        { t: "Descumprimento do intervalo interjornada (11h).", tip: "Escalas com retorno em curto prazo." }
      ],
      narrativa: [
        { t: "Intervalo para repouso e alimentação raramente alcançava 1h.", tip: "Relatar rotina e obstáculos." },
        { t: "Folga entre jornadas inferior a 11h em diversos dias.", tip: "Citar exemplos." }
      ],
      fundamentos: [
        { t: "CLT arts. 71 e 66; Súm. 437/TST.", tip: "Tempo suprimido é devido como extra." }
      ],
      pedidos: [
        { t: "Pagamento do período suprimido do(s) intervalo(s) + reflexos.", tip: "Separar intra/interjornada." }
      ]
    },
    adicional_noturno: {
      nome: "Adicional Noturno",
      fatos: [
        { t: "Trabalho após 22h sem adicional devido.", tip: "Hora noturna reduzida (52m30s)." },
        { t: "Prorrogação do noturno sem adicional.", tip: "Horas após 5h." }
      ],
      narrativa: [
        { t: "Prestava labor noturno habitual (22h–05h), por escalas.", tip: "Indicar frequência." }
      ],
      fundamentos: [
        { t: "CLT art. 73; CF/88 art. 7º IX.", tip: "Base e hora reduzida." }
      ],
      pedidos: [
        { t: "Adicional noturno e reflexos.", tip: "Meses e quantidade de horas." }
      ]
    },
    insalubridade: {
      nome: "Insalubridade",
      fatos: [
        { t: "Exposição a agentes nocivos acima da NR-15.", tip: "Ruído, calor, químicos; EPI ineficaz." },
        { t: "Falta de treinamentos/monitoramento (PCMSO/PPRA).", tip: "ASOs inconsistentes." }
      ],
      narrativa: [
        { t: "Atuava em setor com ruído elevado; EPIs insuficientes/ineficazes.", tip: "Mencionar ASOs/PPRA/PCMSO." }
      ],
      fundamentos: [
        { t: "CLT art. 192; NR-15; Súm. 80/TST.", tip: "Grau 10/20/40%, a apurar." }
      ],
      pedidos: [
        { t: "Adicional de insalubridade (grau a apurar) + reflexos.", tip: "Do início da exposição ao fim do contrato." }
      ]
    },
    rescisao_indireta: {
      nome: "Rescisão Indireta / Verbas",
      fatos: [
        { t: "Atrasos reiterados/ausência de salários/FGTS.", tip: "Art. 483 CLT." },
        { t: "Descumprimento contratual grave.", tip: "Supressão de adicionais; jornadas extenuantes." }
      ],
      narrativa: [
        { t: "Empregador deixou de adimplir obrigações essenciais, inviabilizando o vínculo.", tip: "Detalhar datas e fatos." }
      ],
      fundamentos: [
        { t: "CLT art. 483; Lei 8.036/90; CF/88 art. 7º.", tip: "Multa 40% FGTS; guias SD." }
      ],
      pedidos: [
        { t: "Rescisão indireta (conversão em dispensa sem justa causa).", tip: "Condenações correlatas." },
        { t: "Férias + 1/3, 13º, saldo de salário.", tip: "Precisar períodos." },
        { t: "Depósitos de FGTS + multa 40%.", tip: "Planilha estimada." },
        { t: "Multa do art. 477 CLT, se cabível.", tip: "Atraso no acerto." }
      ]
    },
    equiparacao: {
      nome: "Equiparação Salarial",
      fatos: [
        { t: "Função idêntica a paradigma com salário inferior.", tip: "Mesma localidade/época; diferença < 2 anos." }
      ],
      narrativa: [
        { t: "Executava tarefas idênticas às do paradigma, com mesma produtividade/perfeição técnica.", tip: "Citar atividades." }
      ],
      fundamentos: [
        { t: "CLT art. 461.", tip: "Quadro de carreira válido afasta." }
      ],
      pedidos: [
        { t: "Diferenças salariais mensais + reflexos.", tip: "Do início da identidade funcional." }
      ]
    },
    dano_moral: {
      nome: "Dano Moral",
      fatos: [
        { t: "Humilhações/assédio reiterados no trabalho.", tip: "Testemunhas, mensagens." },
        { t: "Dispensa discriminatória (doença grave/gestação).", tip: "Súm. 443/TST." }
      ],
      narrativa: [
        { t: "Chefias dirigiam ofensas públicas, causando abalo psíquico.", tip: "Relatar episódios e efeitos." }
      ],
      fundamentos: [
        { t: "CF/88 art. 5º, V e X; CLT 223-A a 223-G.", tip: "Parâmetros de arbitramento." }
      ],
      pedidos: [
        { t: "Indenização por dano moral.", tip: "Compatível com gravidade e reiteração." }
      ]
    },
    periculosidade: {
      nome: "Periculosidade",
      fatos: [
        { t: "Contato com inflamáveis/eletricidade sem proteção adequada.", tip: "Áreas de risco; NR-16." }
      ],
      narrativa: [
        { t: "Atuava em área classificada como perigosa com contato habitual a agente de risco.", tip: "Rotinas e locais." }
      ],
      fundamentos: [
        { t: "CLT art. 193; NR-16; Súm. 364/TST.", tip: "Adicional 30% sobre salário-base." }
      ],
      pedidos: [
        { t: "Adicional de periculosidade (30%) + reflexos.", tip: "Desde o início da exposição." }
      ]
    },
    teletrabalho_sobreaviso: {
      nome: "Teletrabalho / Sobreaviso",
      fatos: [
        { t: "Disponibilidade constante via app/celular.", tip: "Restrição real à locomoção." }
      ],
      narrativa: [
        { t: "Permanecia em sobreaviso remoto, respondendo chamadas fora do expediente.", tip: "Janelas de plantão." }
      ],
      fundamentos: [
        { t: "CLT arts. 6º e 62 III; Súm. 428/TST.", tip: "Só há sobreaviso com restrição efetiva." }
      ],
      pedidos: [
        { t: "Horas de sobreaviso/plantão com adicional.", tip: "Quantificar por escalas." }
      ]
    },
    horas_in_itinere: {
      nome: "Horas in itinere (pré/pós-reforma)",
      fatos: [
        { t: "Percurso em condução fornecida p/ local de difícil acesso.", tip: "Regra anterior até 10/11/2017." }
      ],
      narrativa: [
        { t: "Deslocava-se por transporte do empregador até local sem oferta regular.", tip: "Tempos médios (ida/volta)." }
      ],
      fundamentos: [
        { t: "Súm. 90/TST (período anterior à Lei 13.467/17).", tip: "Após reforma: regra restritiva." }
      ],
      pedidos: [
        { t: "Integração do tempo de percurso como extra (período devido).", tip: "Separar antes/depois da reforma." }
      ]
    },
    transferencia: {
      nome: "Adicional de Transferência",
      fatos: [
        { t: "Mudança provisória de domicílio por determinação do empregador.", tip: "Sem ânimo definitivo." }
      ],
      narrativa: [
        { t: "Transferido para outra cidade por X meses, mantendo vínculo original.", tip: "Datas e local." }
      ],
      fundamentos: [
        { t: "CLT art. 469 §3º (25%).", tip: "Indevido se mudança definitiva." }
      ],
      pedidos: [
        { t: "Adicional de transferência (25%) no período + reflexos.", tip: "Meses efetivos." }
      ]
    },
    estabilidade_gestante: {
      nome: "Estabilidade Gestante",
      fatos: [
        { t: "Dispensa durante estabilidade provisória.", tip: "Concepção → 5 meses pós-parto." }
      ],
      narrativa: [
        { t: "Dispensada grávida (ou gravidez no aviso).", tip: "Comprovar datas." }
      ],
      fundamentos: [
        { t: "ADCT art. 10 II b; Súm. 244/TST.", tip: "Independe de ciência do empregador." }
      ],
      pedidos: [
        { t: "Reintegração ou indenização substitutiva + salários/reflexos.", tip: "Período estabilitário." }
      ]
    },
    acidente_doenca: {
      nome: "Acidente/Doença Ocupacional",
      fatos: [
        { t: "Nexo causal/concausal entre trabalho e lesão/doença.", tip: "CAT, laudos, ASO." }
      ],
      narrativa: [
        { t: "Sintomas iniciaram/agravaram-se com as atividades, gerando afastamentos.", tip: "CID, tratamentos." }
      ],
      fundamentos: [
        { t: "CF art. 7º XXII; CLT; Lei 8.213/91; Súm. 378/TST.", tip: "Estabilidade 12 meses." }
      ],
      pedidos: [
        { t: "Indenizações (materiais/morais) e estabilidade acidentária.", tip: "Salários do período + FGTS." }
      ]
    },
    banco_horas: {
      nome: "Banco de Horas",
      fatos: [
        { t: "Compensação sem ACT/CCT válido ou fora dos limites.", tip: "Saldos negativos; lançamentos unilaterais." }
      ],
      narrativa: [
        { t: "Horas eram lançadas em banco sem transparência, com perdas de saldo.", tip: "Extratos e comunicações." }
      ],
      fundamentos: [
        { t: "CLT art. 59 §2º/§5º; Súm. 85/TST.", tip: "Nulidade parcial/total conforme o caso." }
      ],
      pedidos: [
        { t: "Diferenças como extras + reflexos.", tip: "Por período e rubricas." }
      ]
    },
    pj_vinculo: {
      nome: "Vínculo/Pejotização",
      fatos: [
        { t: "Pessoalidade, habitualidade, onerosidade e subordinação com CNPJ interposto.", tip: "Indícios de fraude." }
      ],
      narrativa: [
        { t: "Prestava serviços como PJ, porém com ordens diretas e controle de jornada.", tip: "Comandos e metas." }
      ],
      fundamentos: [
        { t: "CLT art. 3º; Súm. 331/TST (terceirização).", tip: "Primazia da realidade." }
      ],
      pedidos: [
        { t: "Reconhecimento do vínculo + verbas/FGTS.", tip: "Anotação em CTPS." }
      ]
    },
    terceirizacao: {
      nome: "Terceirização/Responsabilidade",
      fatos: [
        { t: "Tomadora se beneficiava diretamente do trabalho.", tip: "Fiscalização deficiente." }
      ],
      narrativa: [
        { t: "Labor em favor da tomadora, sob diretrizes funcionais desta.", tip: "Frentes de serviço." }
      ],
      fundamentos: [
        { t: "Súm. 331/TST; Lei 13.429/17.", tip: "Subsidiária/solidária conforme o caso." }
      ],
      pedidos: [
        { t: "Responsabilidade subsidiária/solidária da tomadora.", tip: "Abrange parcelas vencidas/vincendas." }
      ]
    },
    descontos_indevidos: {
      nome: "Descontos Indevidos",
      fatos: [
        { t: "Descontos sem autorização legal/pacto válido.", tip: "Danificações sem dolo — art. 462 CLT." }
      ],
      narrativa: [
        { t: "Folhas apresentavam abatimentos não pactuados.", tip: "Listar rubricas e meses." }
      ],
      fundamentos: [
        { t: "CLT art. 462; CC art. 940 (devolução em dobro por má-fé).", tip: "Comprovar indevidos." }
      ],
      pedidos: [
        { t: "Devolução dos descontos + correção.", tip: "Identificar rubricas." }
      ]
    },
    comissoes_plr: {
      nome: "Comissões/PLR/Variáveis",
      fatos: [
        { t: "Comissões pagas a menor/omitidas; PLR não paga.", tip: "Metas/relatórios/políticas." }
      ],
      narrativa: [
        { t: "Havia política de comissões/PLR, porém pagamentos eram inferiores ao devido.", tip: "Indicadores e e-mails." }
      ],
      fundamentos: [
        { t: "CF art. 7º; normas coletivas; Súm. 340/TST.", tip: "Base de cálculo e reflexos." }
      ],
      pedidos: [
        { t: "Diferenças de comissões/PLR + reflexos.", tip: "Critérios de apuração." }
      ]
    },
    multas_convencionais: {
      nome: "Multas Convencionais",
      fatos: [
        { t: "Descumprimento de cláusulas normativas (CCT/ACT).", tip: "Cláusula de multa." }
      ],
      narrativa: [
        { t: "Empregador não observou cláusulas coletivas sobre jornada/verbas.", tip: "Citar cláusulas." }
      ],
      fundamentos: [
        { t: "CF art. 7º, XXVI.", tip: "Força normativa." }
      ],
      pedidos: [
        { t: "Multa convencional prevista em ACT/CCT.", tip: "Por evento/período conforme a cláusula." }
      ]
    }
  };

  // ========================== HELPERS ==========================
  const { $, $$ } = window.Clara;

  function itemsToText(items, bullet = '• ') {
    return items.map(i => `${bullet}${i.t}${i.tip ? ` (${i.tip})` : ''}`).join('\n');
  }

  // ========================== RENDER TEMA SELECT (multiple) ==========================
  function fillTemaSelect() {
    const sel = $('#temaSelect');
    if (!sel) return;
    const opts = Object.entries(cat).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('');
    sel.innerHTML = opts;
    sel.addEventListener('change', updateFatosSug);
    updateFatosSug();
  }

  // Lista rápida: junta fatos+narrativa do(s) tema(s) selecionados
  function updateFatosSug() {
    const list = $('#fatosSug'); if (!list) return;
    list.innerHTML = '';
    const temas = getSelectedTemas();
    const combo = [];
    temas.forEach(k => {
      const c = cat[k]; if (!c) return;
      combo.push(...(c.fatos||[]), ...(c.narrativa||[]));
    });
    combo.forEach((i, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = `${i.t}${i.tip ? ` — ${i.tip}` : ''}`;
      list.appendChild(opt);
    });
  }

  function getSelectedTemas() {
    return Array.from($('#temaSelect')?.selectedOptions || []).map(o => o.value).filter(Boolean);
  }

  // ========================== CHECKLIST POR TEMA ==========================
  function renderChecklist() {
    const wrap = $('#sugWrap'); if (!wrap) return;
    wrap.innerHTML = '';

    const temas = getSelectedTemas();
    if (!temas.length) {
      wrap.innerHTML = `<div class="muted">Selecione um ou mais temas à esquerda e clique em <b>Carregar sugestões</b>.</div>`;
      return;
    }

    temas.forEach(k => {
      const c = cat[k]; if (!c) return;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3 style="margin:0 0 6px">${c.nome}</h3>
        <div class="grid">
          <div>
            <strong>Fatos</strong>
            <div class="stack" data-kind="fatos">${renderChecks(c.fatos)}</div>
          </div>
          <div>
            <strong>Fundamentos</strong>
            <div class="stack" data-kind="fundamentos">${renderChecks(c.fundamentos)}</div>
          </div>
          <div>
            <strong>Pedidos</strong>
            <div class="stack" data-kind="pedidos">${renderChecks(c.pedidos)}</div>
          </div>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  function renderChecks(arr = []) {
    if (!arr?.length) return `<div class="muted">—</div>`;
    return arr.map((i, idx) => `
      <label class="check" style="display:flex;gap:8px;align-items:flex-start">
        <input type="checkbox" data-idx="${idx}">
        <span><b>${i.t}</b>${i.tip ? ` — <span class="muted">${i.tip}</span>` : ''}</span>
      </label>
    `).join('');
  }

  // Aplica itens marcados ao destino
  function applyChecked(target /* 'fatos' | 'fundamentos' | 'pedidos' */) {
    const temas = getSelectedTemas(); if (!temas.length) return;

    const chosen = [];
    temas.forEach(k => {
      const c = cat[k]; if (!c) return;
      const card = [...$$('#sugWrap .card')].find(el => el.querySelector('h3')?.textContent === c.nome);
      if (!card) return;
      const box = card.querySelector(`[data-kind="${target}"]`); if (!box) return;
      const arr = c[target] || [];
      box.querySelectorAll('input[type="checkbox"]:checked').forEach(chk => {
        const it = arr[Number(chk.getAttribute('data-idx'))];
        if (it) chosen.push(it);
      });
    });

    if (!chosen.length) return window.Clara.toast?.('Nada selecionado', 'warn');

    if (target === 'fatos') {
      const ta = $('#fatos');
      const txt = itemsToText(chosen);
      ta.value = (ta.value ? ta.value + '\n' : '') + txt + '\n';
    } else if (target === 'fundamentos') {
      const ta = $('#fundamentos');
      const txt = chosen.map(i => `- ${i.t}${i.tip ? ` — ${i.tip}` : ''}`).join('\n');
      ta.value = (ta.value ? ta.value + '\n' : '') + txt + '\n';
    } else if (target === 'pedidos') {
      chosen.forEach(p => window.Clara.form?.addPedido?.(p.t));
      window.Clara.form?.buildValoresFromPedidos?.();
    }

    window.Clara.toast?.('Sugestões aplicadas');
  }

  // ========================== INSERÇÃO RÁPIDA POR DUPLO CLIQUE ==========================
  function bindQuickInsert() {
    const list = $('#fatosSug');
    if (!list) return;
    list.addEventListener('dblclick', () => {
      const temas = getSelectedTemas();
      const combo = [];
      temas.forEach(k => { const c = cat[k]; if (c){ combo.push(...(c.fatos||[]), ...(c.narrativa||[])); }});
      const ta = $('#fatos'); if (!ta) return;
      const chosen = Array.from(list.selectedOptions || []).map(o => combo[Number(o.value)]).filter(Boolean);
      if (!chosen.length) return;
      ta.value = (ta.value ? ta.value + '\n' : '') + itemsToText(chosen) + '\n';
      window.Clara.toast?.('Sugestões adicionadas');
    });
  }

  // ========================== EXPOSE & INIT ==========================
  window.Clara = Object.assign(window.Clara || {}, {
    catalog: { data: cat, fillTemaSelect, updateFatosSug, renderChecklist, applyChecked }
  });

  window.addEventListener('partials:loaded', () => {
    fillTemaSelect();
    bindQuickInsert();
  });
})();
