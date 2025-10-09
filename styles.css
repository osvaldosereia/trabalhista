:root{
  --ink:#0b1020;
  --muted:#6b7280;
  --bg:#f7f8fb;
  --card:#fff;
  --line:#e5e7eb;
  --primary:#1e3a8a;
}

*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;
  color:var(--ink);
  background:var(--bg);
}

/* Layout */
.container{
  display:grid;
  grid-template-columns:260px 1fr;
  gap:12px;
  max-width:1200px;
  margin:0 auto;
  padding:12px;
}
.grid{display:grid;gap:12px}

/* Header */
.header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--line)}
.header-inner{display:flex;align-items:center;gap:8px;max-width:1200px;margin:0 auto;padding:10px 12px}
.brand{font-weight:800;letter-spacing:-.2px;color:var(--primary)}
.actions{margin-left:auto;display:flex;gap:6px}

/* Buttons */
.btn{
  appearance:none;
  border:1px solid var(--line);
  background:#fff;
  border-radius:10px;
  padding:8px 10px;
  cursor:pointer;
}
.btn.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn:hover{filter:brightness(0.98)}
.btn:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}

/* Sidebar */
.sidebar{
  background:#fff;border:1px solid var(--line);border-radius:12px;
  padding:10px;position:sticky;top:64px;height:calc(100vh - 88px);overflow:auto
}
.sidebar h3{margin:6px 6px 10px;font-size:12px;color:var(--muted);text-transform:uppercase}
.nav{display:flex;flex-direction:column;gap:6px}
.nav button{justify-content:flex-start}

/* Cards e seções */
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}
.section{display:flex;flex-direction:column;gap:8px}
.hr{height:1px;background:var(--line);margin:8px 0}

/* Grid de campos */
.row{display:grid;grid-template-columns:repeat(12,1fr);gap:8px}
.col-12{grid-column:span 12}
.col-6{grid-column:span 6}
.col-4{grid-column:span 4}
.col-3{grid-column:span 3}

/* Inputs */
.label{font-weight:600;font-size:12px;color:var(--muted)}
input,select,textarea{
  width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff
}
textarea{min-height:88px}
.switch{display:flex;align-items:center;gap:6px}

/* Chips */
.chip{border:1px solid var(--line);border-radius:999px;padding:6px 8px;cursor:pointer;background:#fff}
.chip.active{border-color:var(--primary);color:var(--primary);background:#eef2ff}

/* Documento anexo */
.field-anexo{display:flex;align-items:center;gap:8px;margin-top:4px}
.field-anexo small{color:var(--muted)}

/* Preview */
.preview{
  white-space:pre-wrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:#0b1020;color:#e5e7eb;border-radius:12px;padding:12px;
  overflow:auto;max-height:60vh
}

/* Utilidades */
.kbd{font:12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:2px 6px}
.small{color:var(--muted);font-size:12px}
.hidden{display:none}

/* Debug I/O (opcional) */
.toggle-debug{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.debug-pre{
  white-space:pre-wrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:#0b1020;color:#e5e7eb;border-radius:12px;padding:12px;
  max-height:40vh;overflow:auto
}

/* Responsivo */
@media (max-width:960px){
  .container{grid-template-columns:1fr}
  .sidebar{position:static;height:auto}
}
