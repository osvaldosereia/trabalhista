// data/ffp_campos.js
// Mapeia "fato" -> campos personalizados para coleta de dados adicionais.
// Estes campos AINDA NÃO são renderizados pelo app.js atual.
// Próximo passo: adaptar a aba "Fatos" para exibir estes campos ao selecionar cada fato.

export const FFP_CAMPOS = {
/* ===================== VÍNCULO E REGISTRO ===================== */
"CTPS não anotada": [
  { id:"admissao",     label:"Data de admissão", type:"date", required:true },
  { id:"saida",        label:"Data de saída",    type:"date" },
  { id:"funcao",       label:"Função exercida",  type:"text", required:true },
  { id:"salario_base", label:"Salário-base (R$)",type:"number", step:"0.01", required:true },
  { id:"local",        label:"Local de trabalho",type:"text" },
  { id:"subordinacao", label:"Havia subordinação?", type:"checkbox" },
  { id:"habitualidade",label:"Havia habitualidade?", type:"checkbox" },
  { id:"testemunhas",  label:"Testemunhas (nomes)", type:"textarea" },
  { id:"docs",         label:"Documentos (CTPS, comunicações etc.)", type:"upload" }
],
"Pejotização fraudulenta": [
  { id:"cnpj_pj",      label:"CNPJ da pessoa jurídica", type:"text", required:true },
  { id:"tomador_real", label:"Tomador real dos serviços", type:"text" },
  { id:"periodo_ini",  label:"Início do período", type:"date", required:true },
  { id:"periodo_fim",  label:"Fim do período",    type:"date" },
  { id:"exclusividade",label:"Exclusividade",     type:"checkbox" },
  { id:"subordinacao", label:"Subordinação",      type:"checkbox" },
  { id:"nf_media",     label:"Nota fiscal média (R$)", type:"number", step:"0.01" },
  { id:"contratos",    label:"Contratos/Docs",    type:"upload" }
],
"Terceirização ilícita": [
  { id:"tomadora",     label:"Empresa tomadora", type:"text", required:true },
  { id:"atividade_fim",label:"Atividade-fim exercida", type:"text" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim",    type:"date" },
  { id:"equiparacao",  label:"Equiparação com empregados diretos", type:"checkbox" },
  { id:"cct",          label:"CCT aplicável", type:"upload" },
  { id:"ordens",       label:"Crachás/ordens da tomadora", type:"upload" }
],
"Estágio fraudulento": [
  { id:"ies",          label:"Instituição de ensino", type:"text" },
  { id:"tce",          label:"Termo de compromisso de estágio (TCE)", type:"upload" },
  { id:"supervisor",   label:"Supervisor indicado", type:"text" },
  { id:"atividades",   label:"Atividades reais", type:"textarea" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim",    type:"date" },
  { id:"carga_horaria",label:"Carga horária semanal", type:"number" },
  { id:"bolsa",        label:"Bolsa/Auxílio (R$)", type:"number", step:"0.01" }
],
"Experiência além do limite": [
  { id:"inicio",       label:"Início do contrato de experiência", type:"date", required:true },
  { id:"prorrogacoes", label:"Datas de prorrogação (uma por linha)", type:"textarea" },
  { id:"funcao",       label:"Função", type:"text" },
  { id:"salario",      label:"Salário (R$)", type:"number", step:"0.01" },
  { id:"documentos",   label:"Comprovantes de prorrogação", type:"upload" }
],
"Sem controle de ponto": [
  { id:"num_empregados", label:"Nº de empregados (>20)", type:"number" },
  { id:"jornada",        label:"Jornada alegada por dia (ex: 08:00-18:00)", type:"textarea" },
  { id:"intervalos",     label:"Intervalos alegados", type:"textarea" },
  { id:"escalas",        label:"Escalas/plantões", type:"upload" }
],

/* ===================== RESCISÃO E VERBAS ===================== */
"Dispensa sem justa causa": [
  { id:"data_dispensa", label:"Data da dispensa", type:"date", required:true },
  { id:"aviso",         label:"Aviso prévio", type:"select", options:["Trabalhado","Indenizado","Não aplicado"] },
  { id:"saldo_sal",     label:"Saldo salarial (R$)", type:"number", step:"0.01" },
  { id:"guias",         label:"Guias FGTS/SD", type:"upload" },
  { id:"trct",          label:"TRCT", type:"upload" }
],
"Dispensa discriminatória": [
  { id:"condicao",      label:"Condição protegida alegada", type:"select", options:["Doença","Gestação","Deficiência","Outras"] },
  { id:"eventos",       label:"Eventos/provas", type:"textarea" },
  { id:"reintegracao",  label:"Pedir reintegração", type:"checkbox" },
  { id:"salario_base",  label:"Salário-base (R$)", type:"number", step:"0.01" }
],
"Rescisão indireta": [
  { id:"falta_patronal",label:"Falta patronal", type:"select", options:["Atraso salarial","Assédio","Risco grave","Outras"] },
  { id:"datas_eventos", label:"Datas dos eventos (uma por linha)", type:"textarea" },
  { id:"notificacoes",  label:"Notificações/Provas", type:"upload" }
],
"Justa causa indevida": [
  { id:"motivo",        label:"Motivo imputado", type:"text" },
  { id:"docs",          label:"Advertências/Comunicados", type:"upload" },
  { id:"data_punicao",  label:"Data da punição", type:"date" }
],
"Atraso nas verbas rescisórias": [
  { id:"data_limite",   label:"Data limite legal", type:"date" },
  { id:"data_pagto",    label:"Data de pagamento", type:"date" },
  { id:"valores",       label:"Valores pagos (R$)", type:"number", step:"0.01" },
  { id:"comprovantes",  label:"Comprovantes", type:"upload" }
],

/* ===================== JORNADA ===================== */
"Horas extras não pagas": [
  { id:"horarios",     label:"Horários de entrada/saída (por dia)", type:"textarea" },
  { id:"banco_horas",  label:"Banco de horas/compensação", type:"select", options:["Sem banco","Banco informal","Banco formal"] },
  { id:"cartoes",      label:"Cartões de ponto", type:"upload" },
  { id:"adicional",    label:"Adicional aplicável", type:"select", options:["50%","70%","100%","Outros"] }
],
"Intervalo intrajornada suprimido": [
  { id:"duracao_fruida",label:"Duração fruída (min)", type:"number" },
  { id:"politica",     label:"Política interna (docs)", type:"upload" },
  { id:"testemunhas",  label:"Testemunhas", type:"textarea" }
],
"Domingos/feriados sem folga": [
  { id:"escalas",      label:"Escalas (docs)", type:"upload" },
  { id:"compensacao",  label:"Folgas compensatórias oferecidas?", type:"checkbox" },
  { id:"datas",        label:"Datas de feriados laborados", type:"textarea" }
],
"Sobreaviso/prontidão": [
  { id:"regime",       label:"Regime", type:"select", options:["Sobreaviso","Prontidão"] },
  { id:"meios_contato",label:"Meios de contato", type:"select", options:["Telefone","App corporativo","E-mail","Outros"] },
  { id:"freq_chamados",label:"Frequência de chamados/mês", type:"number" },
  { id:"logs",         label:"Logs/prints", type:"upload" }
],
"Troca de uniforme/deslocamento interno": [
  { id:"tempo_medio",  label:"Tempo médio diário (min)", type:"number" },
  { id:"obrigatorio",  label:"Obrigatoriedade", type:"checkbox" },
  { id:"politicas",    label:"Políticas/ordens (docs)", type:"upload" }
],
"Turnos ininterruptos": [
  { id:"escala",       label:"Escala real (descrever)", type:"textarea" },
  { id:"interrupcoes", label:"Interrupções operacionais", type:"textarea" },
  { id:"cct",          label:"CCT (docs)", type:"upload" }
],

/* ===================== ADICIONAIS E CONDIÇÕES ===================== */
"Insalubridade": [
  { id:"agente",       label:"Agente", type:"select", options:["Químico","Físico","Biológico","Outros"] },
  { id:"grau",         label:"Grau pretendido", type:"select", options:["Mínimo","Médio","Máximo"] },
  { id:"ppp_ltc",      label:"PPP/LTCAT/Laudos", type:"upload" },
  { id:"epi",          label:"EPI fornecido e eficaz?", type:"checkbox" },
  { id:"setor",        label:"Setor/Atividade", type:"text" }
],
"Periculosidade": [
  { id:"risco",        label:"Fator de risco", type:"select", options:["Inflamáveis","Explosivos","Eletricidade","Motocicleta","Outros"] },
  { id:"tempo_exp",    label:"Tempo de exposição (h/dia)", type:"number" },
  { id:"laudos",       label:"PPRA/PCMSO/Laudos", type:"upload" },
  { id:"epi",          label:"EPI fornecido e eficaz?", type:"checkbox" }
],
"Acúmulo de funções": [
  { id:"func_contratada",label:"Função contratada", type:"text" },
  { id:"funcoes_exercidas",label:"Funções exercidas", type:"textarea" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim",    type:"date" },
  { id:"percentual",   label:"Diferença pretendida (%)", type:"number", step:"1" },
  { id:"provas",       label:"Provas de tarefas", type:"upload" }
],
"Desvio de função": [
  { id:"func_efetiva", label:"Função efetiva", type:"text" },
  { id:"sal_cargo",    label:"Salário do cargo exercido (R$)", type:"number", step:"0.01" },
  { id:"organograma",  label:"Organogramas/descrições", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim",    type:"date" }
],
"Equiparação salarial": [
  { id:"paradigma",    label:"Paradigma", type:"text" },
  { id:"mesmo_local",  label:"Mesmo empregador/local?", type:"checkbox" },
  { id:"tempo_dif",    label:"Diferença de tempo < 2 anos?", type:"checkbox" },
  { id:"sal_paradigma",label:"Salário paradigma (R$)", type:"number", step:"0.01" },
  { id:"prova_comp",   label:"Prova comparativa", type:"upload" }
],
"Adicional noturno": [
  { id:"jornada_noite",label:"Jornada noturna efetiva", type:"textarea" },
  { id:"pagto_parcial",label:"Houve pagamento parcial?", type:"checkbox" },
  { id:"holerites",    label:"Holerites", type:"upload" }
],
"Supressão de adicional": [
  { id:"qual",         label:"Qual adicional foi suprimido?", type:"select", options:["Insalubridade","Periculosidade","Noturno","Outros"] },
  { id:"data_sup",     label:"Data da supressão", type:"date" },
  { id:"func_amb",     label:"Função/ambiente inalterados?", type:"checkbox" },
  { id:"docs",         label:"Holerites antes/depois", type:"upload" }
],

/* ===================== DANOS E SAÚDE ===================== */
"Assédio moral": [
  { id:"condutas",     label:"Condutas (com datas)", type:"textarea" },
  { id:"autores",      label:"Autores", type:"text" },
  { id:"testemunhas",  label:"Testemunhas", type:"textarea" },
  { id:"docs",         label:"Provas (prints, e-mails)", type:"upload" }
],
"Assédio sexual": [
  { id:"episodios",    label:"Episódios e datas", type:"textarea" },
  { id:"comunicacao",  label:"Comunicação à empresa", type:"upload" },
  { id:"medidas",      label:"Boletim/medidas", type:"upload" }
],
"Doença ocupacional": [
  { id:"cid",          label:"CID", type:"text" },
  { id:"nexo",         label:"Nexo", type:"select", options:["Nexo técnico","Concausa","Sem nexo"] },
  { id:"cat",          label:"CAT", type:"upload" },
  { id:"beneficios",   label:"Benefícios/afastamentos", type:"upload" },
  { id:"laudos",       label:"Laudos", type:"upload" },
  { id:"incapacidade", label:"Incapacidade (%)", type:"number", step:"1" }
],
"Acidente típico": [
  { id:"data",         label:"Data do acidente", type:"date" },
  { id:"dinamica",     label:"Dinâmica", type:"textarea" },
  { id:"cat",          label:"CAT", type:"upload" },
  { id:"beneficio",    label:"Benefício (B91/B94)", type:"select", options:["B91","B94","Outro"] },
  { id:"sequelas",     label:"Sequelas/Incapacidade (%)", type:"number", step:"1" },
  { id:"despesas",     label:"Despesas médicas", type:"upload" }
],
"Ambiente degradante": [
  { id:"riscos",       label:"Riscos ergonômicos/psicossociais", type:"select", options:["Ergonômico","Psicossocial","Ambiente físico","Outros"] },
  { id:"evidencias",   label:"Evidências", type:"upload" },
  { id:"nr_cipa",      label:"NRs/CIPA aplicáveis", type:"upload" }
],
"Negligência em exame ocupacional": [
  { id:"tipo_exame",   label:"Tipo de exame", type:"select", options:["Admissional","Periódico","Demissional"] },
  { id:"situacao",     label:"Situação", type:"select", options:["Não realizado","Irregular"] },
  { id:"aso_pcms",     label:"ASO/PCMSO", type:"upload" },
  { id:"dano_mat",     label:"Dano material estimado (R$)", type:"number", step:"0.01" }
],

/* ===================== ESTABILIDADES E GARANTIAS ===================== */
"Gestante dispensada": [
  { id:"data_concepcao",label:"Data da concepção/ciência", type:"date" },
  { id:"exames",       label:"Exames", type:"upload" },
  { id:"tipo_dispensa",label:"Tipo da dispensa", type:"select", options:["Sem justa causa","Com justa causa","Término de contrato"] },
  { id:"salario",      label:"Salário mensal (R$)", type:"number", step:"0.01" }
],
"Estabilidade por acidente/doença": [
  { id:"tipo",         label:"Acidente/Doença", type:"select", options:["Acidente típico","Doença ocupacional"] },
  { id:"beneficio",    label:"Benefício (B91/B93/B94)", type:"select", options:["B91","B93","B94"] },
  { id:"retorno",      label:"Data de retorno", type:"date" },
  { id:"laudos",       label:"Laudos", type:"upload" }
],
"Dirigente sindical": [
  { id:"cargo",        label:"Cargo sindical", type:"text" },
  { id:"mandato_ini",  label:"Início do mandato", type:"date" },
  { id:"mandato_fim",  label:"Fim do mandato", type:"date" },
  { id:"comunicacao",  label:"Comunicação ao empregador", type:"upload" }
],
"Readaptado": [
  { id:"laudo",        label:"Laudo de reabilitação", type:"upload" },
  { id:"func_compar",  label:"Função compatível proposta/recusada", type:"textarea" },
  { id:"data_disp",    label:"Data da dispensa", type:"date" }
],
"Pré-aposentadoria": [
  { id:"cct",          label:"CCT aplicável", type:"upload" },
  { id:"tempo_meses",  label:"Tempo para aposentadoria (meses)", type:"number" },
  { id:"comunicacao",  label:"Comunicação ao empregador", type:"upload" }
],
"Doença comum dispensado": [
  { id:"atestados",    label:"Atestados/licenças", type:"upload" },
  { id:"data_disp",    label:"Data da dispensa", type:"date" },
  { id:"indicios",     label:"Indícios de discriminação", type:"textarea" }
],

/* ===================== FGTS, MULTAS E BENEFÍCIOS ===================== */
"FGTS não recolhido": [
  { id:"periodo_ini",  label:"Início do período", type:"date" },
  { id:"periodo_fim",  label:"Fim do período",    type:"date" },
  { id:"extratos",     label:"Extratos FGTS",     type:"upload" },
  { id:"salario_base", label:"Salário-base (R$)", type:"number", step:"0.01" }
],
"INSS não recolhido": [
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim",    type:"date" },
  { id:"cnis",         label:"CNIS",   type:"upload" },
  { id:"salarios",     label:"Salários-de-contribuição", type:"textarea" }
],
"VT/VA não fornecidos": [
  { id:"cct",          label:"CCT/Política", type:"upload" },
  { id:"valores_mes",  label:"Valores por mês (R$)", type:"textarea" },
  { id:"distancia",    label:"Distância/rota", type:"textarea" }
],
"Multa art. 467": [
  { id:"parcelas",     label:"Parcelas incontroversas (checklist)", type:"textarea" },
  { id:"data_1a",      label:"Data da 1ª audiência", type:"date" },
  { id:"valores",      label:"Valores (R$)", type:"number", step:"0.01" }
],
"Multa art. 477": [
  { id:"data_rescisao",label:"Data da rescisão", type:"date" },
  { id:"data_pagto",   label:"Data de pagamento", type:"date" },
  { id:"valores",      label:"Valores pagos (R$)", type:"number", step:"0.01" },
  { id:"comprovantes", label:"Comprovantes", type:"upload" }
],
"Seguro-desemprego": [
  { id:"guias",        label:"Guias", type:"upload" },
  { id:"data_rescisao",label:"Data da rescisão", type:"date" },
  { id:"parcelas",     label:"Parcelas devidas (estimativa)", type:"number" }
],

/* ===================== OUTROS Fatos Adicionais recomendados ===================== */
"Teletrabalho/home office": [
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" },
  { id:"controle",     label:"Controle de jornada", type:"select", options:["Nenhum","App/Planilha","Sistema corporativo"] },
  { id:"reembolso",    label:"Reembolso internet/energia (R$)", type:"number", step:"0.01" },
  { id:"equipamentos", label:"Fornecimento de equipamentos", type:"checkbox" },
  { id:"docs",         label:"Termos/políticas", type:"upload" }
],
"Banco de horas inválido": [
  { id:"act_cct",      label:"ACT/CCT", type:"upload" },
  { id:"criterio",     label:"Critério de compensação", type:"textarea" },
  { id:"saldo",        label:"Saldo estimado (h)", type:"number" },
  { id:"comp_negadas", label:"Compensações negadas", type:"textarea" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Cargo de confiança falso": [
  { id:"gratificacao", label:"Gratificação ≥ 40%?", type:"checkbox" },
  { id:"poder_mando",  label:"Poder de mando/substituições", type:"textarea" },
  { id:"controle_ponto",label:"Controle de ponto", type:"checkbox" },
  { id:"organograma",  label:"Organograma", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Salário por fora": [
  { id:"valores",      label:"Valores por mês (R$)", type:"textarea" },
  { id:"forma",        label:"Forma de pagamento", type:"select", options:["Dinheiro","Transferência","Outros"] },
  { id:"testemunhas",  label:"Testemunhas", type:"textarea" },
  { id:"docs",         label:"Holerites/extratos", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Comissões não pagas / metas abusivas": [
  { id:"politica",     label:"Política de comissionamento", type:"upload" },
  { id:"meta",         label:"Meta aplicada", type:"textarea" },
  { id:"vendas",       label:"Vendas realizadas", type:"upload" },
  { id:"estornos",     label:"Estornos (R$)", type:"number", step:"0.01" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Gorjetas não repassadas": [
  { id:"taxa",         label:"Taxa de serviço (%)", type:"number", step:"0.01" },
  { id:"rateio",       label:"Rateio praticado", type:"textarea" },
  { id:"docs",         label:"Comprovantes", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Integração de verbas habituais": [
  { id:"verbas",       label:"Verbas habituais", type:"select", multiple:true, options:["Horas extras","Ad. noturno","Periculosidade","Insalubridade","Comissões","Gorjetas"] },
  { id:"valor_medio",  label:"Valor médio mensal (R$)", type:"number", step:"0.01" },
  { id:"meses",        label:"Meses de incidência", type:"number" },
  { id:"holerites",    label:"Holerites", type:"upload" }
],
"Intervalo interjornada insuficiente": [
  { id:"horarios",     label:"Horários efetivos", type:"textarea" },
  { id:"violacoes",    label:"Dias com violação (uma data por linha)", type:"textarea" },
  { id:"escalas",      label:"Escalas", type:"upload" }
],
"Tempo à disposição": [
  { id:"atividade",    label:"Atividade", type:"select", options:["Uniforme","Revista","Transporte interno","Login/Sistemas","Outros"] },
  { id:"tempo_medio",  label:"Tempo médio diário (min)", type:"number" },
  { id:"obrigatorio",  label:"Obrigatoriedade", type:"checkbox" },
  { id:"docs",         label:"Provas/ordens", type:"upload" }
],
"12x36 inválida": [
  { id:"base_juridica",label:"Base jurídica (ACT/CCT)", type:"upload" },
  { id:"jornadas",     label:"Jornadas reais", type:"textarea" },
  { id:"feriados_dsr", label:"Feriados/DSR compensados?", type:"checkbox" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Adicional de transferência": [
  { id:"mudanca",      label:"Houve mudança de domicílio?", type:"checkbox" },
  { id:"data_ida",     label:"Data de ida", type:"date" },
  { id:"data_retorno", label:"Data de retorno", type:"date" },
  { id:"adicional",    label:"Adicional pago (R$)", type:"number", step:"0.01" },
  { id:"docs",         label:"Comprovantes", type:"upload" }
],
"Periculosidade de motociclista": [
  { id:"uso_habitual", label:"Uso habitual de motocicleta", type:"checkbox" },
  { id:"rotas",        label:"Rotas", type:"textarea" },
  { id:"incidentes",   label:"Acidentes/incidentes", type:"textarea" },
  { id:"laudos",       label:"PPP/Laudos", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Insalubridade biológica": [
  { id:"ambiente",     label:"Ambiente/Setor", type:"text" },
  { id:"agente",       label:"Agente biológico", type:"text" },
  { id:"epi_trein",    label:"EPI e treinamentos fornecidos?", type:"checkbox" },
  { id:"laudos",       label:"Laudos/PPP", type:"upload" },
  { id:"grau",         label:"Grau pretendido", type:"select", options:["Mínimo","Médio","Máximo"] }
],
"Redução salarial ilícita": [
  { id:"antes_depois", label:"Antes/Depois (valores, função)", type:"textarea" },
  { id:"anuencia",     label:"Houve anuência?", type:"checkbox" },
  { id:"docs",         label:"Comunicações", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Transferência sem custeio": [
  { id:"origem",       label:"Cidade de origem", type:"text" },
  { id:"destino",      label:"Cidade de destino", type:"text" },
  { id:"despesas",     label:"Despesas (planilha/valores)", type:"upload" },
  { id:"politica",     label:"Política interna", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"PLR não paga": [
  { id:"acordo_reg",   label:"Acordo/Regulamento", type:"upload" },
  { id:"metas",        label:"Metas atingidas", type:"textarea" },
  { id:"periodos",     label:"Períodos de apuração", type:"textarea" },
  { id:"valor_esperado",label:"Valor esperado (R$)", type:"number", step:"0.01" }
],
"Adicional de quebra de caixa": [
  { id:"func_caixa",   label:"Exerceu função de caixa?", type:"checkbox" },
  { id:"valores",      label:"Valores manuseados (R$)", type:"number", step:"0.01" },
  { id:"politica",     label:"Política interna", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Dano existencial": [
  { id:"media_horas",  label:"Média semanal de horas", type:"number" },
  { id:"impactos",     label:"Impossibilidade de convívio/estudo", type:"textarea" },
  { id:"provas",       label:"Provas", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
],
"Contribuição assistencial indevida": [
  { id:"sindicato",    label:"Sindicato", type:"text" },
  { id:"cct_act",      label:"CCT/ACT", type:"upload" },
  { id:"oposicao",     label:"Oposição apresentada?", type:"checkbox" },
  { id:"holerite_desc",label:"Descontos em holerite (docs)", type:"upload" }
],
"Despesas de trabalho não ressarcidas": [
  { id:"tipo",         label:"Tipo de despesa", type:"select", multiple:true, options:["Combustível","Celular","Ferramentas","Internet","Outros"] },
  { id:"valores_mes",  label:"Valores por mês (R$)", type:"textarea" },
  { id:"politica",     label:"Política/Regra de reembolso", type:"upload" },
  { id:"periodo_ini",  label:"Início", type:"date" },
  { id:"periodo_fim",  label:"Fim", type:"date" }
]
};
