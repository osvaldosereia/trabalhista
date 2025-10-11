/* =========================================================
   app.js — Montador de Petição Trabalhista (v2)
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  const lista = document.getElementById('capitulos');
  const visualizador = document.getElementById('visualizador');
  const saida = document.getElementById('saidaPrompt');
  const btnGerar = document.getElementById('gerarPrompt');
  const btnCopiar = document.getElementById('copiarPrompt');
  const btnLimpar = document.getElementById('limparPrompt');

  let capitulos = [];
  let selecionados = [];

  // ===== 1. Ler arquivo TXT =====
  try {
    const txt = await fetch('capitulos_trabalhista.txt').then(r => r.text());
    capitulos = parseTXT(txt);
    renderCapitulos();
  } catch (err) {
    lista.innerHTML = `<p class="text-red-600">Erro ao carregar capitulos_trabalhista.txt</p>`;
  }

  // ===== 2. Renderizar =====
  function renderCapitulos() {
    lista.innerHTML = '';
    capitulos.forEach((c, i) => {
      if (!c.titulo || !c.prompt) return; // ignora vazios

      const card = document.createElement('div');
      card.className = 'capitulo';
      card.innerHTML = `
        <div class="capitulo-header">
          <h3>${c.titulo}</h3>
          <div class="flex gap-2">
            <button class="btnAdd" data-i="${i}">Adicionar</button>
            <button class="btnExpand" data-i="${i}">Abrir</button>
          </div>
        </div>
        <div class="capitulo-body" id="body-${i}">
          <p class="text-sm text-gray-600 mb-2">${c.descricao}</p>
          <div class="subtemas mb-2" id="subs-${i}">
            ${c.subtemas.map(s => `<label><input type="checkbox" value="${s}">${s}</label>`).join('')}
          </div>
          <button class="btn-unir" data-i="${i}">Unir com anterior</button>
        </div>`;
      lista.appendChild(card);
    });

    ativarEventos();
  }

  // ===== 3. Eventos =====
  function ativarEventos() {
    document.querySelectorAll('.btnExpand').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = btn.dataset.i;
        const body = document.getElementById(`body-${i}`);
        body.classList.toggle('open');
        btn.textContent = body.classList.contains('open') ? 'Fechar' : 'Abrir';
        if (body.classList.contains('open')) mostrarCapitulo(i);
      });
    });

    document.querySelectorAll('.btnAdd').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i);
        if (selecionados.includes(i)) {
          selecionados = selecionados.filter(x => x !== i);
          btn.textContent = 'Adicionar';
          btn.classList.remove('bg-blue-600', 'text-white');
        } else {
          selecionados.push(i);
          btn.textContent = 'Adicionado';
          btn.classList.add('bg-blue-600', 'text-white');
          mostrarCapitulo(i);
        }
      });
    });

    document.querySelectorAll('.btn-unir').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i);
        if (i === 0) return alert('Nada para unir acima.');
        capitulos[i - 1].prompt += '\n\n' + capitulos[i].prompt;
        alert(`Capítulo ${i} unido ao anterior.`);
      });
    });
  }

  // ===== 4. Mostrar no painel direito =====
  function mostrarCapitulo(i) {
    const c = capitulos[i];
    visualizador.innerHTML = `
      <h3 class="font-semibold text-lg mb-2">${c.titulo}</h3>
      <p class="text-sm text-gray-700 mb-3">${c.descricao}</p>
      <pre class="text-xs bg-gray-100 border rounded p-3 whitespace-pre-wrap">${c.prompt}</pre>
    `;
  }

  // ===== 5. Gerar prompt final =====
  btnGerar.addEventListener('click', () => {
    if (!selecionados.length) return alert('Selecione ao menos um capítulo.');
    const blocos = selecionados.map(i => {
      const c = capitulos[i];
      const marcados = Array.from(document.querySelectorAll(`#subs-${i} input:checked`)).map(x => x.value);
      const temas = marcados.length ? `\n\nSubtemas:\n- ${marcados.join('\n- ')}` : '';
      return `### ${c.titulo}\n${c.prompt}${temas}`;
    }).join('\n\n-----\n\n');

    saida.value = `Você é ADVOGADO TRABALHISTA EXPERIENTE.\nAnalise os documentos anexados e redija a PETIÇÃO INICIAL conforme os capítulos abaixo.\n\n${blocos}`;
    visualizador.scrollIntoView({ behavior: 'smooth' });
  });

  // ===== 6. Copiar e limpar =====
  btnCopiar.addEventListener('click', () => {
    saida.select();
    document.execCommand('copy');
    btnCopiar.textContent = 'Copiado ✔';
    setTimeout(() => (btnCopiar.textContent = 'Copiar'), 2000);
  });
  btnLimpar.addEventListener('click', () => {
    saida.value = '';
    visualizador.innerHTML = '';
    selecionados = [];
    renderCapitulos();
  });

  // ===== 7. Parser TXT =====
  function parseTXT(txt) {
    const blocos = txt.split('=====').filter(b => b.trim().length > 10);
    return blocos.map((b, i) => ({
      id: i,
      titulo: (b.match(/CAP[IÍ]TULO.*?(?==|$)/i)?.[0] || `Capítulo ${i+1}`).trim(),
      descricao: getTag(b, '@descricao'),
      subtemas: getTag(b, '@subtemas').split('\n').map(s => s.replace(/^-/, '').trim()).filter(Boolean),
      prompt: getTag(b, '@prompt')
    }));
  }
  function getTag(txt, tag) {
    const r = new RegExp(`${tag}:([\\s\\S]*?)(?=@|$|-----)`, 'i');
    const m = txt.match(r);
    return m ? m[1].trim() : '';
  }
});
