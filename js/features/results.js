"use strict";
/* ============ 7. RESULTADOS Y PLAN DE ACCIÓN ============ */
/* Resultados: rendimiento por tema y chips de filtro de la revisión */
function topicChart(){
  const by = {}; S.qs.forEach((q, i) => { if (q.a === null) return; const a = (by[q.t] ||= [0, 0]); a[1]++; if (S.ans[i] === q.a) a[0]++; });
  const rows = Object.entries(by).sort((x, y) => x[1][0] / x[1][1] - y[1][0] / y[1][1]); if (rows.length < 2) return '';
  return `<h2>Resultado por tema</h2><div class="card tchart">${rows.map(([t, [o, n]]) => { const p = Math.round(o / n * 100); return `<div class="trow"><span class="tn">${esc(t)}</span><div class="meter" role="img" aria-label="${p}% de acierto"><i style="width:${p}%;background:${p >= 60 ? 'var(--ok)' : p >= 40 ? 'var(--warn)' : 'var(--bad)'}"></i></div><b class="tv">${o}/${n}</b></div>`; }).join('')}</div>`;
}
function rvChips(){
  const c = {all:S.qs.length, bad:0, ok:0, blank:0, flag:0};
  S.qs.forEach((q, i) => { if (S.flag[i]) c.flag++; if (S.ans[i] === null) c.blank++; else if (q.a !== null) (S.ans[i] === q.a ? c.ok++ : c.bad++); });
  return `<div class="row conf" role="group" aria-label="Filtrar la revisión">${[['all','Todas'],['bad','❌ Falladas'],['ok','✅ Acertadas'],['blank','⚪ En blanco'],['flag','🚩 Marcadas']].filter(([k]) => k === 'all' || c[k]).map(([k, t]) => `<button class="chip-b ${k === 'all' ? 'sel' : ''}" data-a="rvf" data-v="${k}" aria-pressed="${k === 'all'}">${t} · ${c[k]}</button>`).join('')}</div>`;
}

async function finish(force){
  const blank = S.ans.filter(x => x === null).length;
  if (!force && !await ask(blank ? `Te faltan ${blank} pregunta(s). No hay penalización por responder mal: marca una alternativa en cada una. ¿Entregar igual?` : '¿Entregar el examen?')) return;
  lap(); S.cur = null; clearInterval(S.timer); $('clock').hidden = true;
  const n = S.qs.filter(q => q.a !== null).length || 1, miss = {}, B = {m:[0,0], l:[0,0]}; let ok = 0;
  const bar = (t,[o,k]) => { const p = k ? Math.round(o/k*100) : 0; return `<b>${t}</b> · ${k ? o + '/' + k + ' (' + p + '%)' : 'sin preguntas'}<div class="meter"><i style="width:${p}%;background:${p >= 60 ? 'var(--ok)' : 'var(--bad)'}"></i></div>`; };
  S.qs.forEach((q,i) => { if (q.a === null) return; const b = q.b || 'm'; B[b][1]++; if (S.ans[i] === q.a){ ok++; B[b][0]++; } else (miss[q.t] ??= []).push(i+1); });
  if (!S.replay){ histAdd(ok, n, B); memUpdate(); attemptAdd(ok, n); } const pct = Math.round(ok/n*100), plan = Object.entries(miss).sort((a,b) => b[1].length - a[1].length);
  $('v-res').innerHTML = `<h1>Resultados${S.replay ? ' <small class="mut" style="font-size:.5em;font-weight:600">· intento del ' + esc(new Date(S.replayT).toLocaleString('es-PE', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})) + '</small>' : ''}</h1>
  <div class="grid cols"><div class="card"><div class="mut">Puntaje</div><div class="big">${ok * 2} <small class="mut">/ ${n * 2} pts</small></div><div class="mut" style="font-size:.8rem">Cada pregunta vale 2 puntos${n !== 60 ? ' · equivale a ' + (ok * 120 / n).toFixed(1) + ' / 120' : ''}</div></div>
   <div class="card"><div class="mut">Precisión</div><div class="big" style="color:inherit">${pct}%</div></div>
   <div class="card"><div class="mut">En blanco</div><div class="big">${blank}</div>${blank ? '<div class="mut" style="font-size:.8rem">Sin penalización: en el examen real marca siempre algo.</div>' : ''}</div></div>
  <div class="card" style="margin-top:1rem">${bar('Razonamiento matemático', B.m)}
   ${bar('Competencia lectora', B.l)}</div>
  ${(() => { const sure = S.qs.filter((q,i) => S.conf[i] === 's' && q.a !== null && S.ans[i] !== null && S.ans[i] !== q.a).length; return S.conf.some(c => c) ? `<div class="card" style="margin-top:1rem"><b>Confianza:</b> fallaste ${sure} pregunta(s) en las que marcaste «Seguro». Son las más importantes de repasar: tu cerebro las da por sabidas.</div>` : ''; })()}${heatHTML()}${topicChart()}<h2>Cómo mejorar en lo que fallaste</h2>
  <div class="grid cols">${plan.map(([t,qs]) => `<div class="card"><b>${esc(t)}</b> <span style="color:var(--bad)">· ${qs.length} fallo(s): P${qs.join(', P')}</span><p class="mut" style="margin:.4rem 0 0">${rich(TIPS[t] || TIPS.General)}</p></div>`).join('') || '<p style="color:var(--ok)"><b>Sin errores con clave. ¡Sigue con otro examen!</b></p>'}</div>
  <h2>Revisión</h2>${rvChips()}<div class="grid" id="rvlist">${S.qs.map((q,i) => { const g = q.a !== null && S.ans[i] === q.a, unknown = q.a === null; return `<details class="card rv" data-st="${S.ans[i] === null ? 'blank' : unknown ? 'none' : g ? 'ok' : 'bad'}" data-fl="${S.flag[i] ? 1 : 0}"><summary>${unknown ? '⚪' : g ? '✅' : '❌'} P${i+1}: tu respuesta ${S.ans[i] === null ? '—' : L[S.ans[i]]} · correcta ${unknown ? 'sin clave' : L[q.a]}</summary>
   ${txt(q,1)}<p class="stem">${rich(q.q)}</p>${fig(q)}${solHTML(q, 'Sin resolución escrita.')}${!unknown && S.ans[i] !== q.a ? causaUI(i) : ''}${tutor(i)}</details>`; }).join('')}</div>
  <p class="row" style="margin-top:1.2rem"><button class="btn pri" data-a="start" data-v="${S.mode}">Repetir</button>${plan.length ? '<button class="btn" data-a="retry">Repasar solo mis errores</button>' : ''}<button class="btn" data-a="home">Inicio</button></p>`;
  show('v-res');
}
