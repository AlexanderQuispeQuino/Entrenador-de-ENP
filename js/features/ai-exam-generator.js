"use strict";
/* ============ 18. EXAMEN NUEVO CON IA (fase 11) ============
   Plano: 30 de matemática + 30 de lectura con los temas de 2024 y 2025 (o enfocado en tus temas débiles).
   Cada pregunta la crea Gemini y la resuelve en una consulta aparte: solo se conservan las que coinciden con su clave. */
const _tw = (() => { try { return new Worker(URL.createObjectURL(new Blob(['onmessage=e=>setTimeout(()=>postMessage(e.data.id),e.data.ms)'], {type:'text/javascript'}))); } catch { return null; } })(), _tp = {}; let _tid = 0;
if (_tw) _tw.onmessage = e => { const r = _tp[e.data]; delete _tp[e.data]; if (r) r(); };
const sleep = ms => _tw ? new Promise(r => { const id = ++_tid; _tp[id] = r; _tw.postMessage({id, ms}); }) : new Promise(r => setTimeout(r, ms));
let _wl = null;
async function wake(on){ try { if (on && 'wakeLock' in navigator && !_wl){ _wl = await navigator.wakeLock.request('screen'); _wl.addEventListener('release', () => { _wl = null; }); } else if (!on && _wl){ await _wl.release(); _wl = null; } } catch {} }
const IA_KEY = 'enp-iaex', GEN_JOB_KEY = 'enp-gen-job', GEN = {finished:false, running:false, stop:false, discard:false, done:0, total:1, log:[], job:null};
const genFrac = () => { const j = GEN.job; return j ? ((j.math?.length || 0) + (j.readings || []).filter(Boolean).length * 5) / 60 : 0; };
const genPct = () => GEN.finished ? 100 : Math.min(99, Math.floor(genFrac() * 100));
const getGenJob = () => { try { return JSON.parse(store.get(GEN_JOB_KEY) || 'null'); } catch { return null; } };
function saveGenJob(){ if (!GEN.job) return; GEN.job.done = GEN.done; GEN.job.updatedAt = Date.now(); const raw = JSON.stringify(GEN.job); try { store.set(GEN_JOB_KEY, raw); if (store.get(GEN_JOB_KEY) !== raw) { GEN.storageError = true; } else GEN.storageError = false; } catch { GEN.storageError = true; } }
function clearGenJob(){ GEN.job = null; store.set(GEN_JOB_KEY, ''); }
const GENRES = ['Artículo de opinión con tesis y argumentos', 'Texto informativo de divulgación', 'Infografía descrita en texto (incluye una pequeña tabla de datos escrita en texto y un párrafo)', 'Narración breve (fragmento literario original)', 'Texto instructivo o de recomendaciones', 'Dos artículos breves con posturas contrarias sobre un mismo tema'];
const BLK = {}; Object.values(BANK).forEach(e => { if (!e.ia) e.qs.forEach(q => BLK[q.t] ||= q.b || 'm'); });
const realQs = t => Object.values(BANK).filter(e => !e.ia).flatMap(e => e.qs.filter(q => q.t === t));
const iaList = () => { try { return JSON.parse(store.get(IA_KEY) || '[]'); } catch { return []; } };
function registerIA(){ iaList().forEach(e => { Object.assign(TEXTS, e.texts || {}); BANK[e.id] = {name:e.name, note:e.note, ia:true, qs:e.qs}; }); }
function renderBank(){
  $('bank').innerHTML = Object.entries(BANK).map(([k, b]) => `<article class="card"><h3 style="margin:0">${esc(b.name)}${b.ia ? ' <span class="chip" style="font-size:.7rem">🤖 IA</span>' : ''}</h3><p class="mut">${esc(b.note)}</p><div class="row"><button class="btn pri" data-a="bank" data-v="${k}">Elegir modo</button>${b.ia ? `<button class="btn" data-a="delia" data-v="${k}">Eliminar</button>` : ''}</div></article>`).join('')
    + `<article class="card" style="border-style:dashed"><h3 style="margin:0">🤖 Examen nuevo con IA</h3><p class="mut">Gemini crea un examen completo (30 + 30) con la estructura de 2024 y 2025. Todas las preguntas son nuevas (ninguna sale del banco) y se verifica cada una.</p><button class="btn" data-a="genex">Generar</button></article>`
    + `<article class="card" id="solcard">${solCardHTML()}</article>`;
}
/* Cuántas preguntas de cada tema: proporcional a los exámenes reales; «débiles» da más peso a los temas donde fallas */
function blueprint(enfoque){
  const agg = {}; Object.values(mem.get()).forEach(r => { const a = (agg[r.t] ||= {n:0, ok:0}); a.n += r.n; a.ok += r.ok; });
  const w = t => FREQ[t] * (enfoque === 'debiles' ? 1 + 1.5 * (1 - (agg[t] ? agg[t].ok / agg[t].n : .5)) : 1);
  const alloc = (list, total) => { const sum = list.reduce((a, t) => a + w(t), 0), o = list.map(t => { const x = w(t) / sum * total; return {t, n:Math.floor(x), f:x - Math.floor(x)}; });
    let rest = total - o.reduce((a, r) => a + r.n, 0); o.slice().sort((a, b) => b.f - a.f).slice(0, rest).forEach(r => r.n++); return o.filter(r => r.n > 0); };
  const ts = Object.keys(FREQ);
  return {m:alloc(ts.filter(t => BLK[t] === 'm'), 30), l:alloc(ts.filter(t => BLK[t] === 'l'), 30)};
}
const SYS_EX = `Eres autor de preguntas del examen ENP de Beca 18 (Perú), nivel secundaria. Crea preguntas NUEVAS y originales de Razonamiento Matemático con la distribución indicada. Devuelve EXACTAMENTE la cantidad solicitada. Cada objeto DEBE incluir t con el nombre EXACTO del tema solicitado. Cada pregunta debe tener enunciado autosuficiente, EXACTAMENTE 4 alternativas distintas y no vacías, un único índice correcto a (entero 0–3) y resolución r de 2 a 4 líneas. No omitas campos ni uses null. Contexto peruano cuando sea natural; todos los datos dentro del enunciado, sin figuras ni gráficos. Distractores plausibles. Español claro, sin LaTeX ni $. Comprueba que la alternativa indicada sea realmente la única correcta.`;
const SYS_EX_L = `Eres autor de textos y preguntas de Competencia Lectora del examen ENP de Beca 18 (Perú), nivel secundaria. Escribe un texto ORIGINAL de 110 a 160 palabras, con párrafos numerados. Devuelve EXACTAMENTE 5 preguntas, una por cada tipo indicado y en ese orden. Cada objeto DEBE incluir t con el nombre EXACTO del tipo indicado en su posición. Cada pregunta debe basarse en el texto, tener enunciado claro, EXACTAMENTE 4 alternativas distintas y no vacías, un único índice correcto a (entero 0–3) y resolución r de 2 a 3 líneas que justifique la respuesta con el texto. No omitas campos ni uses null. Sin «todas las anteriores». Español claro, sin LaTeX ni $.`;
const EX_GEN_SCHEMA = {type:'ARRAY', items:{type:'OBJECT', properties:{q:{type:'STRING'}, o:{type:'ARRAY', items:{type:'STRING'}}, a:{type:'INTEGER'}, r:{type:'STRING'}, t:{type:'STRING'}}, required:['q','o','a','r','t']}};
const L_SCHEMA = {type:'OBJECT', properties:{texto:{type:'STRING'}, preguntas:EX_GEN_SCHEMA}, required:['texto', 'preguntas']}, INT_SCHEMA = {type:'ARRAY', items:{type:'INTEGER'}};
const validExamQ = (x, topics) => validQ(x) && typeof x.t === 'string' && topics.includes(x.t) && x.q.trim().length >= 12 && x.r.trim().length >= 12 && new Set(x.o.map(o => o.trim().toLocaleLowerCase('es'))).size === 4;
const genDelay = () => window.__GEN_DELAY ?? 7000;
function genLog(m){ GEN.log.push(m); GEN.log = GEN.log.slice(-30); saveGenJob(); updateGen(); }
/* Reintentos con espera creciente ante saturación temporal, errores 5xx o red inestable. */
async function gem(sys, user, schema, temp){
  const maxAttempts = 5;
  for (let k = 0; k < maxAttempts; k++){
    if (GEN.stop) throw new Error('stop');
    try { const r = await geminiJSON(sys, user, schema, temp); GEN.done++; saveGenJob(); updateGen(); await sleep(genDelay()); return r; }
    catch (e){
      if (GEN.stop) throw new Error('stop');
      const transient = e.transient || e.status === 429 || e.status === 500 || e.status === 502 || e.status === 503 || e.status === 504;
      if (!transient || k === maxAttempts - 1) throw e;
      const wait = e.retryAfterMs || Math.min(60000, 10000 * (2 ** k));
      const reason = e.status === 503 || /high demand|overload/i.test(e.message) ? 'Gemini está saturado (alta demanda)' : e.status === 429 ? 'Gemini está limitando temporalmente las consultas' : 'Conexión temporalmente inestable con Gemini';
      genLog(`${reason}. Reintento ${k + 1}/${maxAttempts - 1} en ${Math.ceil(wait / 1000)} s…`);
      await sleep(wait);
    }
  }
  throw new Error('GEMINI_TEMPORARY: Gemini sigue ocupado. Espera unos minutos e inténtalo de nuevo.');
}
const fmtQx = q => q.q + '\n' + q.o.map((o, j) => L[j] + ') ' + o).join('\n');
const shuffleQ = x => { const idx = [0, 1, 2, 3].sort(() => Math.random() - .5); return {...x, o:idx.map(i => x.o[i]), a:idx.indexOf(x.a)}; };
async function genMath(batch){
  const need = Object.fromEntries(batch.map(x => [x.t, x.n])), got = [];
  for (let round = 0; round < 3 && Object.values(need).some(n => n > 0); round++){
    if (GEN.stop) throw new Error('stop');
    const list = Object.entries(need).filter(([, n]) => n > 0), total = list.reduce((a, [, n]) => a + n, 0);
    genLog(`Matemática: creando ${total} preguntas${round ? ` (intento ${round + 1}/3)` : ''}…`);
    const guia = list.map(([t]) => `- ${t}: ${(THEORY[t] && THEORY[t].regla) || ''}`).join('\n');
    const raw = await gem(SYS_EX, `Genera exactamente ${total} preguntas nuevas. Distribución exacta (no cambies los nombres):\n${list.map(([t, n]) => `- ${t}: ${n}`).join('\n')}\nCada pregunta debe llevar el campo t con uno de esos nombres. No agregues preguntas de otros temas.\n\nGuía conceptual de cada tema (no hay ejemplos que copiar):\n${guia}\nLas preguntas deben ser 100 % originales: no reproduzcas ni imites preguntas de exámenes oficiales.`, EX_GEN_SCHEMA, .45);
    if (!Array.isArray(raw)) continue;
    const refs = Object.values(BANK).filter(e => !e.ia).flatMap(e => e.qs.map(q => q.q)).concat(((GEN.job && GEN.job.math) || []).map(q => q.q), got.map(q => q.q));
    const cap = {...need}, cand = raw.filter(x => validExamQ(x, list.map(([t]) => t)) && !tooClose(x, refs) && cap[x.t] > 0 && cap[x.t]--);
    if (!cand.length) continue;
    genLog('Matemática: contrastando las respuestas…');
    const sol = await gem(SYS_SOLVE, `Resuelve de forma independiente. Devuelve un número por pregunta.\n${cand.map((x, i) => `Pregunta ${i + 1}: ${fmtQx(x)}`).join('\n\n')}`, INT_SCHEMA, 0);
    if (!Array.isArray(sol)) continue;
    cand.forEach((x, i) => { if (Number.isInteger(sol[i]) && sol[i] === x.a && need[x.t] > 0){ need[x.t]--; got.push(x); } });
  }
  const missing = Object.entries(need).filter(([, n]) => n > 0);
  if (missing.length) throw new Error(`No se pudieron validar todas las preguntas de Matemática. Faltan ${missing.reduce((a, [, n]) => a+n, 0)} en: ${missing.map(([t,n]) => `${t} (${n})`).join(', ')}`);
  return got;
}
async function genGroup(topics, genre, n){
  for (let tries = 0; tries < 3; tries++){
    if (GEN.stop) throw new Error('stop');
    genLog(`Lectura ${n} de 6: creando ${genre.split(' (')[0].toLowerCase()} (intento ${tries + 1}/3)…`);
    const out = await gem(SYS_EX_L, `Género: ${genre}.\nEscribe un texto original de 110–160 palabras y EXACTAMENTE 5 preguntas. Sus campos t, en orden, deben ser exactamente:\n${topics.map((t,i) => `${i+1}. ${t}`).join('\n')}\nNo cambies, repitas ni omitas los tipos. Cada pregunta debe incluir 4 opciones, una clave a entre 0 y 3 y resolución.\n\nGuía de cada tipo: ${topics.map(t => t + ': ' + ((THEORY[t] && THEORY[t].regla) || '')).join(' | ')}\nTexto y preguntas 100 % originales, sin reproducir material de exámenes oficiales.`, L_SCHEMA, .45);
    const qs = Array.isArray(out?.preguntas) ? out.preguntas : [];
    if (typeof out?.texto !== 'string' || out.texto.trim().length < 200 || qs.length !== 5 || !qs.every((x,i) => validExamQ(x, [topics[i]]) && x.t === topics[i])) continue;
    genLog(`Lectura ${n} de 6: contrastando las 5 respuestas…`);
    const sol = await gem(SYS_SOLVE, `Usa el texto para resolver las preguntas. Devuelve exactamente 5 índices, en orden.\nTexto:\n${out.texto}\n\n${qs.map((x, i) => `Pregunta ${i + 1}: ${fmtQx(x)}`).join('\n\n')}`, INT_SCHEMA, 0);
    if (Array.isArray(sol) && sol.length === 5 && qs.every((x,i) => sol[i] === x.a)) return {texto:out.texto, qs};
  }
  return null;
}
const textHTML = (texto, genre) => `<h4>${esc(genre.split(' (')[0])} · texto generado por IA</h4>` + texto.split(/\n+/).filter(x => x.trim()).map(x => `<p>${esc(x.trim())}</p>`).join('');
function genConfig(){
  if (!store.get('gkey')){ toast('Para generar un examen con IA, guarda tu clave gratuita de Gemini en ⚙ IA.'); return; }
  const f = blueprint('fiel'), d = blueprint('debiles'), lst = bp => bp.m.concat(bp.l).filter(x => x.n).map(x => `${esc(x.t)} (${x.n})`).join(' · '), pending = getGenJob();
  $('v-gen').innerHTML = `<div class="row sp"><button class="btn sm" data-a="toex">← Volver</button></div><h1 style="margin-top:.6rem">Examen nuevo con IA</h1>
  ${pending ? `<section class="card gen-resume"><div class="row sp"><b>${GEN.running ? '⚙️ Generación activa' : '⏸ Tienes una generación pendiente'}</b><span class="chip">${pending.math?.length || 0}/30 Mat. · ${(pending.readings || []).filter(Boolean).length * 5}/30 Lec.</span></div><p class="mut">Tu avance verificado está guardado. Puedes continuar desde el último bloque completado; no volveremos a generar lo que ya está listo.</p><div class="row"><button class="btn pri" data-a="${GEN.running ? 'genview' : 'genresume'}">${GEN.running ? 'Ver progreso' : '▶ Continuar generación'}</button><button class="btn" data-a="gendiscard">Descartar avance</button></div></section>` : ''}
  <p class="mut">Cada pregunta vale 2 puntos y cada examen suma 120, sin importar el tema. Gemini crea preguntas originales y contrasta sus respuestas con una segunda resolución. El avance se guarda por bloques: puedes cambiar de sección y, si cierras el navegador, reanudar cuando vuelvas. Para continuar con el navegador cerrado se necesitaría un servidor.</p>
  <div class="grid cols"><div class="card"><h3 style="margin:0">📐 Examen fiel</h3><p class="mut">Como los de 2024 y 2025: 30 de matemática y 30 de lectura, con los mismos temas y la misma proporción, pero con preguntas nuevas que nunca repiten las del banco.</p><button class="btn pri" data-a="gen" data-v="fiel" ${pending ? 'disabled' : ''}>Generar examen fiel</button></div>
  <div class="card"><h3 style="margin:0">🎯 Enfocado en mis temas débiles</h3><p class="mut">Más preguntas de los temas donde más fallas, con la misma estructura de 30 + 30 y todas nuevas.</p>${Object.keys(mem.get()).length ? '' : '<p class="mut" style="font-size:.85rem">Aún no tengo datos de tus fallos: haz primero un diagnóstico o un examen.</p>'}<button class="btn pri" data-a="gen" data-v="debiles" ${pending || !Object.keys(mem.get()).length ? 'disabled' : ''}>Generar enfocado</button></div></div>
  <details style="margin-top:1rem"><summary>Ver cuántas preguntas por tema</summary><p class="mut"><b>Fiel:</b> ${lst(f)}</p><p class="mut"><b>Enfocado:</b> ${lst(d)}</p></details>`;
  show('v-gen');
}
function updateGen(){
  const b = $('genbar'), l = $('genlog'), pct = genPct();
  if (b) b.style.width = pct + '%'; if (l) l.textContent = GEN.log.slice(-6).join('\n');
  const p = $('genpct'); if (p) p.textContent = pct + '%';
  const c = $('gen-count'); if (c && GEN.job) c.textContent = `${GEN.job.math?.length || 0}/30 Matemática · ${(GEN.job.readings || []).filter(Boolean).length * 5}/30 Lectura`;
}
function renderGenProgress(){
  $('v-gen').innerHTML = `<div class="gen-head"><span class="eyebrow">GENERACIÓN CON IA</span><h1>Creando tu examen</h1><p class="mut">Puedes navegar por la aplicación. El proceso seguirá activo mientras esta pestaña permanezca abierta.</p></div><div class="card gen-progress"><div class="row sp"><b>Progreso de generación</b><strong id="genpct">${genPct()}%</strong></div><div class="bar"><i id="genbar" style="width:${genPct()}%"></i></div><p class="mut" id="gen-count"></p><pre id="genlog" class="gen-log" aria-live="polite"></pre><div class="row"><button class="btn" data-a="gencancel">Pausar y guardar avance</button><button class="btn" data-a="toex">Volver a exámenes</button></div></div>`;
  updateGen();
}
function makeGenJob(enfoque){
  const bp = blueprint(enfoque), batches = []; let cur = [], sum = 0;
  bp.m.forEach(x => { if (sum + x.n > 12 && cur.length){ batches.push(cur); cur = []; sum = 0; } cur.push(x); sum += x.n; }); if (cur.length) batches.push(cur);
  const slots = bp.l.flatMap(x => Array(x.n).fill(x.t)).sort(), groups = [0,1,2,3,4,5].map(g => slots.filter((_,i) => i%6===g));
  const list = iaList(), n = list.reduce((a,e) => Math.max(a,+e.id.slice(2)),0)+1;
  return {version:1,auto:true,id:'ia'+n,n,enfoque,bp,batches,groups,math:[],batchIndex:0,readings:Array(6).fill(null),texts:{},done:0,total:batches.length*2+12,createdAt:Date.now()};
}
async function generarExamen(enfoque){
  if (GEN.running) return;
  if (getGenJob()){ genConfig(); toast('Ya existe un examen pendiente. Continúa o descarta ese avance.'); return; }
  const job = makeGenJob(enfoque); GEN.job = job; GEN.finished = false; GEN.running = true; GEN.stop = false; GEN.done = 0; GEN.total = job.total; GEN.log = [];
  saveGenJob(); renderGenProgress(); show('v-gen'); genLog('Preparando el plano del examen…');
  await runGenJob(job);
}
async function reanudarGeneracion(silent){
  if (GEN.running) return;
  const job = getGenJob(); if (!job) { toast('No hay una generación pendiente.'); return; }
  job.auto = true; GEN.job = job; GEN.finished = false; GEN.running = true; GEN.stop = false; GEN.done = job.done || 0; GEN.total = job.total || job.batches.length*2+12; GEN.log = ['Retomando desde el último bloque guardado…'];
  renderGenProgress(); if (!silent) show('v-gen'); await runGenJob(job);
}
async function runGenJob(job){
  wake(true);
  try {
    for (let i = job.batchIndex || 0; i < job.batches.length; i++){
      if (GEN.stop) throw new Error('stop');
      genLog(`Matemática: bloque ${i+1} de ${job.batches.length}…`);
      const part = await genMath(job.batches[i]); job.math = (job.math || []).concat(part); job.batchIndex = i+1; saveGenJob(); updateGen();
    }
    for (let g = 0; g < 6; g++){
      if (GEN.stop) throw new Error('stop'); if (job.readings[g]) continue;
      const r = await genGroup(job.groups[g], GENRES[g], g+1);
      if (!r) throw new Error(`No se pudo validar la lectura ${g+1}. El avance anterior quedó guardado; puedes reanudar para volver a intentar este grupo.`);
      job.readings[g] = r; const key = job.id + '_' + (g+1); job.texts[key] = textHTML(r.texto, GENRES[g]); saveGenJob(); updateGen();
    }
    genLog('Armando y verificando las 60 preguntas…');
    const math = job.math || [], lect = job.readings.flatMap((r,g) => (r?.qs || []).map(x => ({...shuffleQ(x),b:'l',tx:job.id+'_'+(g+1),ia:true})));
    if (math.length !== 30) throw new Error(`Examen incompleto: Matemática ${math.length}/30. El avance validado se conserva.`);
    if (lect.length !== 30) throw new Error(`Examen incompleto: Lectura ${lect.length}/30. El avance validado se conserva.`);
    const qs = [...math.sort(() => Math.random()-.5).map(x => ({...shuffleQ(x),b:'m',ia:true})),...lect];
    if (qs.length !== 60 || qs.some(q => !validQ(q))) throw new Error('El control final detectó preguntas incompletas. El avance verificado se conserva.');
    const list = iaList(), id = job.id, n = job.n, texts = job.texts;
    list.push({id,name:`Examen IA n.º ${n}`,note:`60 preguntas generadas por IA y verificadas · ${job.enfoque === 'fiel' ? 'estructura fiel a 2024 y 2025' : 'enfocado en tus temas débiles'}`,texts,qs}); const savedList = JSON.stringify(list); store.set(IA_KEY,savedList); if (store.get(IA_KEY) !== savedList) throw new Error('El navegador no pudo guardar el examen completo por falta de espacio. Tu generación verificada se conserva; libera espacio y reanuda.');
    registerIA(); renderBank(); GEN.running = false; GEN.finished = true; wake(false); clearGenJob();
    if (!$('v-home').hidden) homeExtras(); toast('✅ Tu examen con IA está listo: búscalo en Exámenes.');
    $('v-gen').innerHTML = `<div class="gen-head"><span class="eyebrow">EXAMEN COMPLETADO</span><h1>¡Tu examen está listo!</h1><p class="mut">Las 60 preguntas superaron la validación de estructura y respuesta.</p></div><div class="card"><b>Examen IA n.º ${n}</b><p class="mut">30 preguntas de Matemática y 30 de Comprensión Lectora, con respuestas contrastadas de forma independiente.</p></div><div class="row" style="margin-top:1rem"><button class="btn pri" data-a="bank" data-v="${id}">Empezar ahora</button><button class="btn" data-a="toex">Ver mis exámenes</button></div>`;
  } catch(e){
    GEN.running = false; wake(false); job.auto = false; saveGenJob(); if (!$('v-home').hidden) homeExtras(); const msg=e.message||'';
    if (e.message === 'stop' && GEN.discard){ GEN.discard = false; clearGenJob(); $('v-gen').innerHTML = `<h1>Avance descartado</h1><p class="mut">La generación se detuvo y se eliminó el progreso guardado.</p><button class="btn pri" data-a="genex">Volver a generar</button>`; return; }
    if (e.message === 'stop'){
      $('v-gen').innerHTML = `<h1>Generación pausada</h1><p class="mut">El avance verificado está guardado. Puedes continuar cuando quieras desde «Exámenes» → «Generar».</p><div class="row"><button class="btn pri" data-a="genresume">Continuar</button><button class="btn" data-a="toex">Salir</button></div>`;
      return;
    }
    const friendly = e.status===503 || /high demand|overload|GEMINI_TEMPORARY/i.test(msg) ? 'Gemini está experimentando alta demanda. Tu avance verificado quedó guardado; vuelve a intentarlo más tarde.' : e.status===429 || msg==='429' ? 'Gemini alcanzó temporalmente un límite. Tu avance está guardado; espera unos minutos y reanuda.' : e.status>=500 || /GEMINI_NETWORK/i.test(msg) ? 'Hubo un problema de conexión. Tu avance está guardado; revisa internet y reanuda.' : esc(msg || 'No se pudo completar el examen. Tu avance verificado se conserva.');
    $('v-gen').innerHTML = `<h1>No pude completar el examen todavía</h1><p class="mut">${friendly}</p><p>Toca «Intentar de nuevo»: lo que ya se verificó se conserva y solo se genera lo que falta.</p><div class="card gen-progress"><b>Avance conservado</b><p class="mut">${job.math.length}/30 Matemática · ${job.readings.filter(Boolean).length*5}/30 Comprensión Lectora</p><div class="row"><button class="btn pri" data-a="genresume">🔄 Intentar de nuevo</button><button class="btn" data-a="gendiscard">Descartar avance</button></div></div>`;
  }
}
async function descartarGeneracion(){ if (GEN.running){ if (!await ask('La generación se detendrá. ¿También quieres descartar todo el avance guardado?')) return; GEN.discard = true; GEN.stop = true; toast('Deteniendo la generación y descartando el avance…'); return; } if (!await ask('¿Descartar todo el avance guardado?')) return; clearGenJob(); toast('Se descartó el avance de generación.'); genConfig(); }
