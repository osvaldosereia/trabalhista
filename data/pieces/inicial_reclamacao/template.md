{{> cabecalho }}

**EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DA {{metadados.vara}}ª VARA DO TRABALHO DE {{metadados.comarca}}/{{metadados.UF}}**

**{{partes.reclamante.nome}}**, {{partes.reclamante.qualificacao}}, CPF {{partes.reclamante.cpf}}, endereço {{partes.reclamante.endereco}}, por seu advogado, propõe **RECLAMAÇÃO TRABALHISTA** em face de {{#partes.reclamadas}}{{razao}}{{^@last}}; {{/@last}}{{/partes.reclamadas}}.

### Dos fatos e do contrato
Admissão: {{contrato.admissao}}. Dispensa: {{contrato.dispensa}}. Aviso {{contrato.aviso.tipo}} com projeção até {{contrato.aviso.projecao}}.  
Função/CBO: {{contrato.funcao}} ({{contrato.cbo}}). Salário-base: R$ {{contrato.salario}}. Variáveis: {{contrato.variaveis}}.  
Local e modo: {{contrato.local}} ({{contrato.modo}}).  
CTPS: {{contrato.ctps.status}} {{#contrato.ctps.retificacoes}}— {{contrato.ctps.retificacoes}}{{/contrato.ctps.retificacoes}}.

{{#blocos.jornada}}
### Jornada e horas
{{jornada.descricao}}. Percentuais: {{jornada.hx.percentuais}}. Intervalos: {{jornada.intervalos}}. DSR: {{jornada.dsr}}.
{{/blocos.jornada}}

{{#blocos.adicionais}}
### Adicionais
Noturno: {{adicionais.noturno.justificativa}}.  
{{#adicionais.insal.ativo}}Insalubridade: grau {{adicionais.insal.grau}}, EPI {{adicionais.insal.epi.status}}.{{/adicionais.insal.ativo}}  
{{#adicionais.peric.ativo}}Periculosidade: agente {{adicionais.peric.agente}}.{{/adicionais.peric.ativo}}
{{/blocos.adicionais}}

{{#blocos.rescisao}}
### Rescisão
Aviso: {{rescisao.aviso.tipo}}. 13º: {{rescisao.decimo.status}}. Férias: {{rescisao.ferias.status}} + 1/3. Multas 477/467 quando cabíveis.
{{/blocos.rescisao}}

{{#blocos.fgts}}
### FGTS
Diferenças mensais, multa de 40% e liberação/chave quando aplicável.
{{/blocos.fgts}}

{{#blocos.estabilidades}}
### Estabilidade
Tipo: {{estabilidades.tipo}}. Fatos: {{estabilidades.fatos}}. Pretensão: {{estabilidades.pretensao}}.
{{/blocos.estabilidades}}

{{#blocos.indenizacoes}}
### Indenizações
{{#indenizacoes.morais.ativo}}Danos morais: {{indenizacoes.morais.fatos}}.{{/indenizacoes.morais.ativo}}
{{#indenizacoes.materiais.ativo}}Danos materiais: {{indenizacoes.materiais.itens}}.{{/indenizacoes.materiais.ativo}}
{{#indenizacoes.existenciais.ativo}}Danos existenciais: {{indenizacoes.existenciais.fatos}}.{{/indenizacoes.existenciais.ativo}}
{{/blocos.indenizacoes}}

{{#blocos.normas}}
### Normas coletivas
{{normas.tipo}} {{normas.id}}, vigência {{normas.vigencia}}. Cláusulas: {{normas.clausulas}}.
{{/blocos.normas}}

{{#blocos.tutela}}
### Tutela de urgência
Pedidos: {{tutela.tipos}}. Fundamentos: {{tutela.fundamentos}}.
{{/blocos.tutela}}

### Dos cálculos e critérios
{{#estilo.calculos_tabelado}}
| Rubrica | Período | Base | Qty/Fator | Reflexos | Valor (R$) |
|---|---|---:|---:|---|---:|
| Exemplo | 01/2023–12/2023 | 2.500,00 | 50h x 50% | Férias/13º/FGTS | 1.234,56 |
**Total estimado**: R$ {{valor_causa.total}}
{{/estilo.calculos_tabelado}}
{{^estilo.calculos_tabelado}}
Critérios por rubrica conforme fundamentos e provas.
{{/estilo.calculos_tabelado}}

### Dos pedidos
{{> pedidos }}

### Do valor da causa
R$ **{{valor_causa.total}}**. Estimativa que não limita a condenação (IN 41/2018).

{{> bloco_provas }}

{{> rodape }}
