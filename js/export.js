/* export.js — exportar/importar (JSON do caso, DOC para Word, PDF via prévia) */
(function () {
  const { $, toast } = window.Clara;

  // ---------------- Util ----------------
  function download(filename, mime, content) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }

  function nowStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }

  // ---------------- JSON ----------------
  function exportJSON() {
    const data = window.Clara.form?.collect?.();
    if (!data) return toast('Nada para exportar', 'warn');
    const fn = `peticao_${(data?.reclamante?.nome||'sem_nome').replace(/\s+/g,'_')}_${nowStamp()}.json`;
    download(fn, 'application/json;charset=utf-8', JSON.stringify(data, null, 2));
    toast('JSON exportado');
  }

  function importJSONDialog() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.addEventListener('change', async () => {
      const f = inp.files?.[0]; if (!f) return;
      try {
        const txt = await f.text();
        const data = JSON.parse(txt);
        window.Clara.review?.loadDraftToForm?.(data);
        toast('JSON importado e aplicado ao formulário');
      } catch (e) {
        console.error(e);
        toast('Falha ao importar JSON (arquivo inválido)', 'bad');
      }
    });
    inp.click();
  }

  // ---------------- DOCX (na prática: .doc HTML compatível) ----------------
  // Gera um arquivo .doc (HTML) que o Word/LibreOffice abre como documento editável.
  function exportDOCX() {
    const d = window.Clara.form?.collect?.();
    if (!d) return toast('Nada para exportar', 'warn');

    // Reusa a prévia já renderizada
    window.Clara.review?.renderPreviewDoc?.(d);
    const htmlBody = $('#previewDoc')?.innerHTML || '<p>(vazio)</p>';

    const wrap = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Petição</title>
<style>
body{font-family: "Times New Roman", serif; font-size:12pt}
h2,h3{margin:12px 0}
.doc{max-width:800px;margin:0 auto}
ol,ul{margin:0 0 12px 18px}
pre{white-space:pre-wrap}
</style>
</head>
<body>${htmlBody}</body></html>`;

    const fn = `peticao_${(d?.reclamante?.nome||'sem_nome').replace(/\s+/g,'_')}_${nowStamp()}.doc`;
    // MIME aceito pelo Word para HTML
    download(fn, 'application/msword;charset=utf-8', wrap);
    toast('Documento .doc exportado (compatível com Word)');
  }

  // ---------------- PDF (via janela de impressão) ----------------
  // Abre a prévia em nova janela e dispara print(); usuário escolhe "Salvar como PDF".
  function exportPDF() {
    const d = window.Clara.form?.collect?.();
    if (!d) return toast('Nada para exportar', 'warn');

    window.Clara.review?.renderPreviewDoc?.(d);
    const html = $('#previewDoc')?.innerHTML || '<p>(vazio)</p>';

    const w = window.open('', '_blank');
    if (!w) return toast('Pop-up bloqueado pelo navegador', 'warn');

    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Petição — PDF</title>
<style>
@media print { @page { margin: 20mm; } }
body{font-family:serif;margin:24px}
h2,h3{margin:12px 0}
.doc{max-width:800px;margin:0 auto}
ol,ul{margin:0 0 12px 18px}
pre{white-space:pre-wrap}
</style>
</head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    // Pequeno atraso para garantir render
    setTimeout(()=> w.print(), 200);
  }

  // ---------------- Expose ----------------
  window.Clara = Object.assign(window.Clara || {}, {
    exporter: { exportJSON, importJSONDialog, exportDOCX, exportPDF }
  });
})();
