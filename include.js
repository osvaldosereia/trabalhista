// include.js — carrega portials e, só depois, injeta os módulos JS (ordem garantida)
(async function () {
  async function loadNode(el) {
    const url = el.getAttribute('data-include');
    if (!url) return;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.statusText);
    el.innerHTML = await res.text();
    // carregar portials aninhados
    const nested = el.querySelectorAll('[data-include]');
    for (const n of nested) await loadNode(n);
  }

  async function loadAllportials() {
    const nodes = Array.from(document.querySelectorAll('[data-include]'));
    for (const n of nodes) await loadNode(n);
  }

  function injectScriptsInOrder(srcs) {
    return srcs.reduce(
      (p, src) =>
        p.then(
          () =>
            new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = src;
              s.onload = resolve;
              s.onerror = () => reject(new Error('Falha ao carregar ' + src));
              document.body.appendChild(s);
            })
        ),
      Promise.resolve()
    );
  }

  try {
    await loadAllportials();

    // libs externas já estão no <head> (pdf.js, jspdf, docx)
    // agora injeta os módulos do app na ordem correta:
    await injectScriptsInOrder([
      'js/core.js',
      'js/ui.js',
      'js/form.js',
      'js/ia.js',
      'js/export.js',
      'js/history.js',
      'js/calc.js',
      'js/review.js',
      'js/main.js'
    ]);

    // avisa que tudo está pronto
    window.dispatchEvent(new Event('portials:loaded'));
  } catch (e) {
    console.error('include.js error', e);
    const box = document.createElement('div');
    box.className = 'muted';
    box.style.padding = '8px';
    box.textContent = 'Falha ao carregar a interface: ' + e.message;
    document.body.appendChild(box);
  }
})();
