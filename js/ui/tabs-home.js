"use strict";
/* ============ 16. NUEVA INTERFAZ (fase 10): Hoy · Exámenes · Aprender · Progreso ============ */
const TABS = ['hoy', 'ex', 'ap', 'pr'];
function setTab(t){
  if (!TABS.includes(t)) t = 'hoy'; S.tab = t; store.set('enp-tab', t);
  TABS.forEach(k => $('t-' + k).hidden = k !== t);
  document.querySelectorAll('#nav [data-v]').forEach(b => { b.classList.toggle('on', b.dataset.v === t); b.setAttribute('aria-current', b.dataset.v === t ? 'page' : 'false'); });
  scrollTo({top:0});
}
let toastT; function toast(msg){ const t = $('toast'); clearTimeout(toastT); t.hidden = !msg; t.textContent = msg; if (msg) toastT = setTimeout(() => t.hidden = true, 6000); }
function streak(){ let a = []; try { a = JSON.parse(store.get('enp-streak') || '[]'); } catch {} const set = new Set(a); let t = today(); if (!set.has(t)) t--; let n = 0; while (set.has(t)){ n++; t--; } return n; }
function domPct(){ const m = Object.values(mem.get()), n = m.reduce((a, r) => a + r.n, 0), ok = m.reduce((a, r) => a + r.ok, 0); return n ? Math.round(ok / n * 100) : null; }
function topicRows(){
  const agg = {}; Object.values(mem.get()).forEach(r => { const a = (agg[r.t] ||= {n:0, ok:0}); a.n += r.n; a.ok += r.ok; });
  return Object.keys(FREQ).map(t => { const a = agg[t], acc = a ? a.ok / a.n : null; return {t, acc, n:a ? a.n : 0, f:FREQ[t], pr:FREQ[t] * (1 - (acc ?? .5))}; }).sort((x, y) => y.pr - x.pr);
}
function nextStep(){
  const has = Object.keys(mem.get()).length > 0, due = dueList().length, weak = prioTopics()[0];
  if (!has) return {t:'Empieza con un diagnóstico', d:'24 preguntas que cubren todos los temas del examen. Con tus resultados armo tu mapa de dominio y tu plan.', b:'<button class="btn" data-a="diag">🎯 Diagnóstico rápido (24 preguntas)</button>'};
  if (due) return {t:'Repasa lo que fallaste', d:`${Math.min(due, 15)} preguntas listas para hoy: repasarlas a tiempo es lo que las fija en tu memoria.`, b:`<button class="btn" data-a="review">🔁 Repaso de hoy (${Math.min(due, 15)} de ${due})</button>`};
  return {t:'Refuerza tu tema más débil', d:`${weak}: pesa mucho en el examen y es donde más fallas.`, b:`<button class="btn" data-a="tab" data-v="ap">📚 Ir a Aprender</button>`};
}
function hoyHTML(){
  let run = null; try { run = JSON.parse(store.get('enp-run') || 'null'); } catch {}
  const ns = nextStep(), has = Object.keys(mem.get()).length > 0, weak = prioTopics()[0], d = domPct(), pl = planInfo();
  const stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  return `<h1>Hola, ${esc((me() || {}).name || '')} 👋</h1><p class="mut" style="margin:0 0 1rem">${(f => f[0].toUpperCase() + f.slice(1))(new Date().toLocaleDateString('es-PE', {weekday:'long', day:'numeric', month:'long'}))}</p>
  ${getGenJob() ? `<div class="card gen-home-card" style="margin-bottom:1rem"><b>🤖 ${GEN.running ? 'Generación de examen en curso' : 'Tienes una generación de examen pendiente'}</b><p class="mut">${getGenJob().math?.length || 0}/30 Matemática · ${(getGenJob().readings || []).filter(Boolean).length*5}/30 Lectura guardadas</p><div class="row"><button class="btn pri" data-a="${GEN.running ? 'genview' : 'genresume'}">${GEN.running ? 'Ver progreso' : 'Continuar generación'}</button><button class="btn" data-a="gendiscard">Descartar</button></div></div>` : ''}
  ${run && run.qs ? `<div class="card" style="margin-bottom:1rem"><b>Tienes un examen en curso</b><p class="mut" style="margin:.2rem 0 .6rem">${esc(run.name)} · ${run.mode === 'sim' ? 'Simulacro' : 'Entrenamiento'} · ${run.ans.filter(x => x !== null).length}/${run.qs.length} respondidas</p><div class="row"><button class="btn pri" data-a="resume">Continuar</button><button class="btn" data-a="discard">Descartar</button></div></div>` : ''}
  <div class="hero"><small>TU SIGUIENTE PASO</small><h2>${ns.t}</h2><p>${ns.d}</p><div class="row">${ns.b}</div></div>
  <div class="stats">${stat(streak() + ' 🔥', 'días seguidos')}${stat(d === null ? '—' : d + ' %', 'dominio')}${stat(dueList().length, 'por repasar')}${stat(pl.days === null ? '—' : Math.max(0, pl.days), 'días al examen')}</div>
  ${has ? `<div class="row" style="margin:1rem 0 0"><button class="btn" data-a="sprint" data-v="${esc(weak)}">⚡ Sprint de hoy: ${esc(weak)}</button></div>` : ''}
  ${planHTML()}`;
}
function aprenderHTML(){
  const rows = topicRows(), has = Object.keys(mem.get()).length > 0; let LRN = {}; try { LRN = JSON.parse(store.get('enp-learn') || '{}'); } catch {}
  const col = acc => acc === null ? 'var(--line)' : acc >= .75 ? 'var(--ok)' : acc >= .5 ? 'var(--warn)' : 'var(--bad)';
  const card = r => `<div class="card"><div class="row sp"><b>${esc(r.t)}${LRN[r.t] && LRN[r.t].ok / LRN[r.t].n >= .66 ? ' ✅' : ''}</b><span class="mut" style="font-size:.85rem">≈ ${r.f.toFixed(1)} preg./examen</span></div><div class="meter"><i style="width:${r.acc === null ? 0 : Math.round(r.acc * 100)}%;background:${col(r.acc)}"></i></div>
    <div class="row sp"><span class="mut" style="font-size:.85rem">${r.acc === null ? 'Sin datos todavía' : Math.round(r.acc * 100) + '% de acierto en ' + r.n + (r.n === 1 ? ' intento' : ' intentos')}</span>
    <span class="row" style="gap:.3rem"><button class="btn sm" data-a="learn" data-v="${esc(r.t)}">📚 Aprender</button><button class="btn sm" data-a="sprint" data-v="${esc(r.t)}">Practicar</button><button class="btn sm" data-a="refuerzo" data-v="${esc(r.t)}" title="Ejercicios nuevos generados con IA">🧪 IA</button></span></div></div>`;
  return `<h1>Aprender</h1>` + (has
    ? `<p class="mut">Empieza por aquí: los temas que más pesan en el examen y donde más fallas.</p><div class="grid cols">${rows.slice(0, 4).map(card).join('')}</div><details style="margin-top:.8rem"><summary>Ver todos los temas</summary><div class="grid cols" style="margin-top:.6rem">${rows.slice(4).map(card).join('')}</div></details><div class="row" style="margin-top:1rem"><button class="btn" data-a="diag">🎯 Repetir diagnóstico</button></div>`
    : `<p class="mut">Aún no hay datos. El diagnóstico (unos 45 min) te dice qué temas atacar primero. Mientras tanto, puedes explorar cualquier tema:</p><div class="grid cols">${rows.map(card).join('')}</div>`);
}
function progresoHTML(){
  const m = mem.get(), causes = {};
  Object.values(m).forEach(r => { if (r.cause) causes[r.cause] = (causes[r.cause] || 0) + 1; });
  let cal = null; try { cal = JSON.parse(store.get('enp-cal') || 'null'); } catch {}
  let hist = []; try { hist = JSON.parse(store.get('enp-hist') || '[]'); } catch {}
  const lines = [], rs = Object.values(m), split = f => { const a = rs.filter(f), n = a.reduce((x, r) => x + r.n, 0), o = a.reduce((x, r) => x + r.ok, 0); return n ? Math.round(o / n * 100) + ' % en ' + n + ' intentos' : null; };
  const po = split(r => !r.ia), pi = split(r => r.ia); if (po && pi) lines.push(`Preguntas oficiales: ${po} · preguntas de IA 🤖: ${pi}.`);
  if (cal && cal.s[0] >= 3) lines.push(`Cuando marcas «Seguro» aciertas ${Math.round(cal.s[1] / cal.s[0] * 100)} % (${cal.s[0]} respuestas)${cal.s[1] / cal.s[0] < .75 ? ': tu confianza está inflada, revisa primero esos errores.' : '.'}`);
  if (cal && cal.a[0] >= 3) lines.push(`Cuando marcas «Adiviné» aciertas ${Math.round(cal.a[1] / cal.a[0] * 100)} %: esos aciertos no cuentan como dominio.`);
  const top = Object.entries(causes).sort((x, y) => y[1] - x[1])[0];
  if (top) lines.push(`Tu causa de error más frecuente: <b>${CAUSAS[top[0]]}</b>. ${esc(CAUSA_TIP[top[0]])}`);
  const sims = hist.filter(x => x.mode === 'sim').slice(-10);
  return `<h1>Progreso</h1>
  ${sims.length ? `<div class="card"><b>Tus últimos simulacros</b><p class="mut" style="margin:.2rem 0 .6rem">Puntaje sobre 120 (el último a la derecha)</p><div class="spark">${sims.map(x => `<i style="height:${Math.max(5, +x.sc / 120 * 100)}%" title="${esc(x.sc)}"><em>${esc(x.sc)}</em></i>`).join('')}</div></div>` : '<p class="mut">Aún no hay simulacros: haz uno para ver tu evolución.</p>'}
  ${lines.length ? `<div class="card" style="margin-top:1rem">${lines.map(l => '<p style="margin:.3rem 0">' + l + '</p>').join('')}</div>` : ''}
  ${(() => { const at = attList().slice().reverse().slice(0, 25); return at.length ? `<h2>Historial de intentos</h2><p class="mut">Toca «Ver revisión» para abrir de nuevo lo que respondiste: tus respuestas, marcas, tiempos y las explicaciones.</p><div class="grid">${at.map(a => `<div class="card row sp"><span><b>${esc(a.name)}</b><br><span class="mut" style="font-size:.85rem">${a.mode === 'sim' ? 'Simulacro' : 'Entrenamiento'} · ${esc(new Date(a.t).toLocaleDateString('es-PE', {day:'numeric', month:'short'}))} · ${a.ok}/${a.n} correctas · ${a.ok * 2}/${a.n * 2} pts</span></span><span class="row" style="gap:.3rem"><button class="btn pri sm" data-a="attv" data-v="${esc(a.id)}">Ver revisión</button><button class="btn sm" data-a="attd" data-v="${esc(a.id)}" aria-label="Eliminar este intento">🗑</button></span></div>`).join('')}</div>` : ''; })()}`;
}
function homeExtras(){
  $('x-hoy').innerHTML = hoyHTML(); $('x-ap').innerHTML = aprenderHTML(); $('x-pr').innerHTML = progresoHTML(); $('x-follow').innerHTML = followHTML();
  setTab(S.tab || 'hoy');
}
