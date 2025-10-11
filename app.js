/* =========================================================
   app.js — Montador de Petição Trabalhista
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  const cont = document.getElementById('capitulos');
  const btnGerar = document.getElementById('gerarPrompt');
  const areaSaida = document.getElementById('saidaPrompt');
  const secSaida = document.getElementById('resultado');
  const btnCopiar = document.getElementById('copiarPrompt');

  let capitulos = [];
  let selecionados = [];

  /* === 1. Ler e processar o arquivo TXT === */
  try {
    const txt = await fetch('capitulos_trabalhista.txt').then(r => r.text());
    capitulos = parseTXT(txt);
    renderCapitulos(capitulos, cont);
  } catch (err) {
    cont.innerHTML = `<p class="text-red-600">Erro ao carregar o arquivo capitulos_trabalhista.txt</p>`;
    console.error(err);
  }

  /* === 2. Gerar Prompt Final === */
  btnGerar.addEventListener('click', () => {
    const blocos = selecionados.map(idx => capitulos[idx]);
    if (!blocos.length) {
      alert('Selecione pelo menos um capítulo.');
      return;
    }

    const promptFinal = blocos.map(b => {
      const subtemasMarcados = Array.from(
        document.querySelectorAll(`#subs-${b.id} input:checked`)
      ).map(c => c.value);
      const lista = subtemasMarcados.length
        ? `\n\nSubtemas escolhidos:\n- ${subtemasMarcados.join('\n- ')}`
        : '';
      return `### ${b.titulo}\n${b.prompt}${lista}`;
    }).join('\n\n-----\n\n');

    areaSaida.value = `Você é ADVOGADO TRABALHISTA EXPERIENTE.\nAnalise os documentos anexados e redija a PETIÇÃO INICIAL conforme os capítulos abaixo.\n\n${promptFinal}`;
    secSaida.classList.remove('hidden');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });

  /* === 3. Copiar Prompt === */
  btnCopiar.addEventListener('click', () => {
    areaSaida.select();
    document.execCommand('copy');
    btnCopiar.textContent = 'Copiado ✔';
    setTimeout(() => (btnCopiar.textContent = 'Copiar'), 2000);
  });

  /* === Funções === */

  function parseTXT(texto) {
    const blocos = texto.split('=====').filter(x => x.trim().length);
    return blocos.map((bloco, i) => {
      const titulo = bloco.match(/CAP[IÍ]TULO.*?[\n\r]/i)?.[0]?.trim() || `Capítulo ${i+1}`;
      const descricao = getTag(bloco, '@descricao');
      const subtemas = getTag(bloco, '@subtemas')
        .split('\n').map(l => l.replace(/^-/, '').trim()).filter(Boolean);
      const prompt = getTag(bloco, '@prompt');
      return { id: i, titulo, descricao, subtemas, prompt };
    });
  }

  function getTag(txt, tag) {
    const regex = new RegExp(`${tag}:([\\s\\S]*?)(?=@|$|-----)`, 'i');
    const match = txt.match(regex);
    return match ? match[1].trim() : '';
  }

  function renderCapitulos(lista, container) {
    container.innerHTML = '';
    lista.forEach((c, i) => {
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
        </div>
      `;
      container.appendChild(card);
    });

    // expandir/colapsar
    container.querySelectorAll('.btnExpand').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = document.getElementById(`body-${btn.dataset.i}`);
        body.classList.toggle('open');
        btn.textContent = body.classList.contains('open') ? 'Fechar' : 'Abrir';
      });
    });

    // adicionar
    container.querySelectorAll('.btnAdd').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.i);
        if (selecionados.includes(idx)) {
          selecionados = selecionados.filter(x => x !== idx);
          btn.textContent = 'Adicionar';
          btn.classList.remove('bg-blue-600','text-white');
        } else {
          selecionados.push(idx);
          btn.textContent = 'Adicionado';
          btn.classList.add('bg-blue-600','text-white');
        }
      });
    });

    // unir
    container.querySelectorAll('.btn-unir').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.i);
        if (idx === 0) return alert('Nada a unir acima.');
        capitulos[idx - 1].prompt += '\n\n' + capitulos[idx].prompt;
        alert(`Capítulo ${idx} unido ao anterior.`);
      });
    });
  }
});
