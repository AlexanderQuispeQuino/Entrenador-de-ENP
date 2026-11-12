"use strict";
/* ============ 11. RENDIMIENTO EN EL EXAMEN (fase 5) ============ */
/* Cronometra cuánto tiempo pasas en cada pregunta (tope de 10 min por tramo para no contar pestañas dormidas) */
function lap(){
  if (S.cur != null && S.times) S.times[S.cur] = (S.times[S.cur] || 0) + Math.min((Date.now() - S.t0) / 1000, 600);
  S.t0 = Date.now(); S.cur = S.i;
}
/* Franja de ritmo y aviso de pregunta lenta (solo simulacro) */
function paceUpdate(){
  const pace = $('pace'), slow = $('slow'); if (!pace || S.mode !== 'sim') return;
  const dur = S.dur || 7200000, left = Math.max(0, S.end - Date.now()), frac = 1 - left / dur, N = S.qs.length;
  const done = S.ans.filter(x => x !== null).length, blank = N - done, flags = S.flag.filter(Boolean).length;
  let msg = '', cls = 'ok';
  if (left <= Math.min(600000, dur * .12)){ msg = `⏱ Quedan ${Math.ceil(left / 60000)} min y tienes ${blank} sin marcar. No hay penalización: marca TODAS antes de entregar.`; cls = 'bad'; }
  else if (frac >= .7){ msg = `Segunda pasada: vuelve a las marcadas (${flags}) y resuelve lo pendiente (${blank} sin responder).`; cls = 'warn'; }
  else if (frac >= .1){ const target = Math.round(frac * N), r = done / Math.max(1, target); msg = `Ritmo: a esta altura deberías ir por la ${target}; llevas ${done} respondidas (${r > 1.1 ? 'adelantado' : r >= .9 ? 'en ritmo' : 'atrasado'}).`; cls = r < .9 ? 'warn' : 'ok'; }
  pace.hidden = !msg; pace.textContent = msg; pace.className = 'pace ' + cls;
  const cur = (S.times[S.i] || 0) + (S.cur === S.i ? Math.min((Date.now() - S.t0) / 1000, 600) : 0);
  slow.hidden = !(cur > 180 && S.ans[S.i] === null);
  slow.textContent = 'Llevas más de 3 min en esta pregunta: márcala (M) y sigue; vuelve en la segunda pasada.';
}
/* Ficha de respuestas: viene pre-marcada con tus respuestas; verifica y corrige antes de entregar */
function ficha(){
  lap(); S.cur = null; S.fichaT0 = Date.now(); S.fichaEmpty = store.get('enp-ficha-empty') === '1';
  S.fichaMarks = S.fichaEmpty ? S.qs.map(() => null) : S.ans.slice(); renderFicha(); show('v-ficha');
}
function renderFicha(){
  const N = S.qs.length, blank = S.fichaMarks.filter(x => x === null).length;
  $('v-ficha').innerHTML = `<h1>Ficha de respuestas</h1>
  <p class="mut">Solo cuenta lo que quede marcado aquí. ${S.fichaEmpty ? 'Marca desde lo que recuerdas haber respondido en el cuadernillo.' : 'Viene con tus respuestas: revisa fila por fila antes de entregar que cada círculo esté en la fila de su número.'}</p>
  <label class="row" style="margin-bottom:.8rem"><input type="checkbox" data-a="fvac" ${S.fichaEmpty ? 'checked' : ''}> <span>Ficha vacía <span class="mut">(práctica de traspaso: te dirá cuántos círculos no coinciden con tus respuestas)</span></span></label>
  ${blank && (!S.fichaEmpty || blank < N) ? `<div class="card" style="border-color:var(--bad);margin-bottom:1rem"><b>${blank} sin marcar.</b> No hay penalización por responder mal: marca una alternativa en cada una. Si descartas 2, tu probabilidad de acertar sube de 25 % a 50 %.</div>` : ''}
  <div class="ficha">${S.qs.map((q, i) => `<div class="frow ${S.fichaMarks[i] === null ? 'blank' : ''}"><b>${i + 1}</b>${q.o.map((_, j) => `<button class="bub ${S.fichaMarks[i] === j ? 'on' : ''}" data-a="bub" data-v="${i}|${j}" aria-label="Pregunta ${i + 1}, alternativa ${L[j]}">${L[j]}</button>`).join('')}</div>`).join('')}</div>
  <div class="row" style="margin-top:1rem"><button class="btn" data-a="back">← Volver al examen</button><button class="btn pri" data-a="deliver">Entregar</button></div>`;
}
/* Informe de traspaso: compara lo respondido en cada pregunta con lo marcado en la ficha */
function fichaReport(){
  if (!S.ansExam) return '';
  let bad = 0, lost = 0, extra = 0;
  S.qs.forEach((q, i) => { const a = S.ansExam[i], f = S.ans[i]; if (a !== null && f !== null && a !== f) bad++; else if (a !== null && f === null) lost++; else if (a === null && f !== null) extra++; });
  if (!bad && !lost && !extra && !S.fichaEmpty) return '';
  const l = [];
  if (S.fichaEmpty){
    l.push(bad || lost ? `<b>Traspaso:</b> ${bad} círculo(s) distinto(s) a lo que respondiste y ${lost} respuesta(s) que no pasaste a la ficha (puntos que se pierden).` : '<b>Traspaso perfecto:</b> todos tus círculos coinciden con tus respuestas.');
    if (extra) l.push(`${extra} pregunta(s) las marcaste solo en la ficha, sin responderlas antes.`);
  } else l.push(`Al revisar la ficha cambiaste ${bad + lost + extra} respuesta(s).`);
  return `<div class="card" style="margin-top:1rem">${l.map(x => '<p style="margin:.3rem 0">' + x + '</p>').join('')}</div>`;
}
/* Mapa de calor de tiempos y temas donde más tardas (solo simulacro) */
function heatHTML(){ return lessonReport() + fichaReport() + heatCore(); }
function heatCore(){
  if (S.mode !== 'sim' || !S.times || !S.times.some(t => t > 0)) return '';
  const target = (S.dur || 7200000) / S.qs.length / 1000, tot = S.times.reduce((a, b) => a + b, 0), byT = {};
  S.qs.forEach((q, i) => { const a = (byT[q.t] ||= [0, 0]); a[0] += S.times[i] || 0; a[1]++; });
  const slow = Object.entries(byT).map(([t, [sum, n]]) => [t, sum / n]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const cells = S.qs.map((q, i) => { const t = Math.round(S.times[i] || 0), c = t <= target * .75 ? 'var(--ok)' : t <= target * 1.25 ? 'var(--warn)' : 'var(--bad)'; return `<span class="hc" style="background:${c}" title="P${i + 1}: ${t} s">${i + 1}</span>`; }).join('');
  return `<h2>Tu ritmo</h2><div class="card"><div class="heat">${cells}</div>
  <p class="mut" style="margin:.6rem 0 0">Verde: rápida · amarillo: en tu tiempo (≈ ${Math.round(target)} s por pregunta) · rojo: te frenó. Tiempo total en preguntas: ${Math.round(tot / 60)} min.${S.fichaSec != null ? ' Pasar a la ficha te tomó ' + S.fichaSec + ' s.' : ''}</p>
  <p style="margin:.4rem 0 0"><b>Temas donde más tardas:</b> ${slow.map(([t, v]) => esc(t) + ' (' + Math.round(v) + ' s)').join(', ')}.</p></div>`;
}
