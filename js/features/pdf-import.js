"use strict";
/* ============ 4. IMPORTADOR DE PDF (pdf.js + parser) ============ */
const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let wk = false;
async function readPdf(f){
  if (!wk){ wk = true; try { pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(await (await fetch(WORKER)).blob()); } catch { pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER; } }
  const pdf = await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise, lines = [];
  for (let p = 1; p <= pdf.numPages; p++){
    const rows = {};
    (await (await pdf.getPage(p)).getTextContent()).items.forEach(it => (rows[Math.round(it.transform[5]/3)] ??= []).push(it));
    Object.keys(rows).map(Number).sort((a,b) => b-a).forEach(y => {
      const t = rows[y].sort((a,b) => a.transform[4]-b.transform[4]).map(i => i.str).join(' ').replace(/\s+/g,' ').trim(); if (t) lines.push(t); });
  }
  return lines;
}
function parseKeys(txt){ const k = {}; for (const m of txt.matchAll(/(\d{1,3})\s*[-–.:)]?\s*([A-Ea-e])(?![A-Za-zÁ-ú])/g)) k[+m[1]] = L.indexOf(m[2].toUpperCase()); return k; }
function parseQs(lines){
  const out = []; let st = [], op = [];
  const flush = () => { if (op.length >= 2) out.push({t:'General', q:st.join(' ').trim(), o:op, a:null, r:''}); st = []; op = []; };
  for (const ln of lines){
    if (/^\d{1,3}$/.test(ln) || /^COMPETENCIA/i.test(ln)) continue;
    const m = ln.match(/^\(?([A-E])[\)\.]\s*(.*)$/);
    if (m && (op.length ? L.indexOf(m[1]) === op.length : m[1] === 'A')){ op.push(m[2]); continue; }
    if (op.length){ if (/^[a-záéíóúñ0-9(]/.test(ln) && !/[.?!:]$/.test(op.at(-1))){ op[op.length-1] += ' ' + ln; continue; } flush(); }
    st.push(ln);
  }
  flush(); return out;
}
async function handleFiles(files){
  const st = $('status'); let best = [], keys = {};
  try {
    for (const f of files){
      st.textContent = 'Leyendo ' + f.name + '…';
      const lines = await readPdf(f), li = lines.findLastIndex(l => /^Pregunta\s+Respuesta/i.test(l));
      if (li >= 0) Object.assign(keys, parseKeys(lines.slice(li+1).join(' ')));
      const qs = parseQs(li >= 0 ? lines.slice(0, li) : lines); if (qs.length > best.length) best = qs;
    }
  } catch { st.textContent = 'No se pudo leer el PDF.'; return; }
  best.forEach((q,i) => { if (keys[i+1] !== undefined) q.a = keys[i+1]; });
  st.textContent = best.length ? '' : 'No detecté preguntas con alternativas A), B), C)… Agrégalas a mano.';
  S.qs = best; S.name = 'PDF importado'; editor();
}

/* Vista previa editable del PDF importado */
function editor(){
  if (S.edFor !== S.qs){ S.edFor = S.qs; S.edI = 0; }
  const N = S.qs.length; S.edI = Math.max(0, Math.min(S.edI || 0, N - 1));
  const nk = S.qs.filter(q => q.a === null).length, i = S.edI, q = S.qs[i];
  const dots = S.qs.map((x, k) => `<button class="pill ${x.a === null ? 'f' : 'a'} ${k === i ? 'cur' : ''}" data-a="edgo" data-v="${k}" aria-label="Pregunta ${k+1}${x.a === null ? ', sin clave' : ''}">${k+1}</button>`).join('');
  $('v-prev').innerHTML = `<h1>Vista previa editable</h1><p class="mut">${N} preguntas · ${nk ? `<b style="color:var(--bad)">${nk} sin clave</b> (en amarillo)` : 'todas con clave'}. Revisa una por una y corrige lo que haga falta.</p>
  <div class="strip edstrip" aria-label="Preguntas importadas">${dots}</div>
  ${q ? `<div class="card ed"><div class="row sp"><b>Pregunta ${i+1} de ${N}</b>${q.a === null ? '<span class="chip warnchip">Sin clave</span>' : '<span class="chip">Clave ' + L[q.a] + '</span>'}</div>
   <label>Enunciado<textarea rows="4" data-f="q" data-i="${i}">${esc(q.q)}</textarea></label>
   ${q.o.map((o,j) => `<label>Alternativa ${L[j]}<input data-f="o${j}" data-i="${i}" value="${esc(o)}"></label>`).join('')}
   <label>Clave correcta <select data-f="a" data-i="${i}"><option value="">— sin clave —</option>${q.o.map((_,j) => `<option value="${j}" ${q.a === j ? 'selected' : ''}>${L[j]}</option>`).join('')}</select></label>
   <label>Resolución (opcional)<textarea rows="3" data-f="r" data-i="${i}">${esc(q.r)}</textarea></label>
   <div class="row"><button class="btn" data-a="del" data-v="${i}">🗑 Eliminar esta pregunta</button></div></div>` : '<div class="card"><p class="mut">No quedan preguntas. Agrega una o vuelve al inicio.</p></div>'}
  <div class="row sp nav"><button class="btn" data-a="edgo" data-v="${i-1}" ${i ? '' : 'disabled'}>← Anterior</button><button class="btn" data-a="add">+ Agregar</button><button class="btn" data-a="edgo" data-v="${i+1}" ${i < N-1 ? '' : 'disabled'}>Siguiente →</button></div>
  <p class="row"><button class="btn pri" data-a="go-modes" ${N ? '' : 'disabled'}>Continuar</button><button class="btn" data-a="home">Volver</button></p>`;
  show('v-prev');
}
