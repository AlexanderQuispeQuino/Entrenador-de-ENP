"use strict";
/* ============ 5. MOTOR DEL EXAMEN ============ */
function start(mode){
  S.mode = mode; S.replay = false; S.i = 0; S.ans = S.qs.map(() => null); S.flag = S.qs.map(() => false); S.conf = S.qs.map(() => null); S.cause = S.qs.map(() => null); S.times = S.qs.map(() => 0); S.cur = null; S.fichaT0 = null; S.fichaSec = null; S.ansExam = null; S.prac = {}; clearInterval(S.timer);
  $('clock').hidden = mode !== 'sim';
  if (mode === 'sim'){ S.dur = Math.max(5, 2*S.qs.length)*60000; S.end = Date.now() + S.dur; tick(); S.timer = setInterval(tick, 1000); }
  exam(); show('v-exam');
}
function tick(){
  const left = Math.max(0, S.end - Date.now()), c = $('clock');
  c.textContent = String(Math.floor(left/60000)).padStart(2,'0') + ':' + String(Math.floor(left%60000/1000)).padStart(2,'0');
  c.classList.toggle('low', left < 600000); paceUpdate();                // alerta: menos de 10 min
  if (!left){ clearInterval(S.timer); ask('Se acabó el tiempo: se entrega tu examen.', {only:true, title:'Tiempo terminado', ok:'Ver resultados'}).then(() => finish(true)); }
}

/* Figuras: tablas y gráficas de línea (q.f) */
function fig(q){
  if (q.img) return `<figure class="figimg"><img src="${esc(q.img)}" alt="${esc(q.alt || 'Figura de la pregunta')}" loading="lazy" data-a="zoom" data-v="${esc(q.img)}"><figcaption class="mut">Toca para ampliar</figcaption></figure>`;
  const f = q.f; if (!f) return '';
  if (f.rows) return `<div class="fig"><table>${f.rows.map((r,i) => `<tr>${r.map(c => i ? `<td>${rich(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table></div>`;
  const X = v => 40 + v*10, Y = v => 200 - v*5.2;
  let g = '';
  for (let y = 0; y <= 35; y += 5) g += `<line x1="40" x2="340" y1="${Y(y)}" y2="${Y(y)}" stroke="var(--line)"/><text x="30" y="${Y(y)+3}" text-anchor="end">${y}</text>`;
  for (let x = 0; x <= 30; x += 5) g += `<line y1="18" y2="200" x1="${X(x)}" x2="${X(x)}" stroke="var(--line)"/><text x="${X(x)}" y="213" text-anchor="middle">${x}</text>`;
  return `<div class="fig"><svg viewBox="0 0 360 220" role="img" aria-label="Gráfica">${g}<text x="8" y="12">°C</text><text x="345" y="213">días</text><polyline fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" points="${f.line.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}"/></svg></div>`;
}
function exam(){
  lap(); stopSpeech();
  const {i, qs} = S, q = qs[i], a = S.ans[i], rev = S.mode === 'train' && a !== null && q.a !== null, done = S.ans.filter(x => x !== null).length;
  const opts = q.o.map((o,j) => !o.trim() ? '' : `<div class="optw"><button class="opt ${rev ? (j === q.a ? 'ok' : j === a ? 'no' : '') : j === a ? 'sel' : ''}" data-a="pick" data-v="${j}" aria-pressed="${j === a}"><b>${L[j]}</b><span>${rich(q.ia ? cleanOption(o) : o)}</span></button><button class="spk" data-a="say" data-v="o|${j}" aria-label="Escuchar alternativa ${L[j]}">🔊</button></div>`).join('');
  const fb = !rev ? '' : `<div class="fb"><b>${a === q.a ? '✅ ¡Correcto!' : '❌ Incorrecto'}${q.a !== null ? ' · Respuesta: ' + L[q.a] + ') ' + rich(q.ia ? cleanOption(q.o[q.a]) : q.o[q.a]) : ''}</b>
    ${solHTML(q, 'Esta pregunta aún no tiene resolución escrita: pídesela al tutor IA.')}<button class="chip-b" data-a="say" data-v="r">🔊 Escuchar resolución</button>
    <p class="mut"><b>Tema:</b> ${esc(q.t)} — ${rich(TIPS[q.t] || TIPS.General)}</p>${a !== q.a ? causaUI(i) + `<button class="chip-b" data-a="learn" data-v="${esc(q.t)}">📚 Aprender este tema</button>` : ''}${tutor(i)}</div>`;
  $('v-exam').innerHTML = `<div class="exam"><div><div class="strip">${pillsHTML()}</div><div id="pace" class="pace" hidden></div><div id="slow" class="pace warn" hidden></div>
    <div class="row sp mut"><span>Pregunta ${i+1} de ${qs.length} · ${esc(q.t)}${q.ia ? ' · 🤖 generada por IA' : ''}</span><span>${done}/${qs.length} respondidas</span></div>
    <div class="bar"><i style="width:${done/qs.length*100}%"></i></div>
    <div class="card" style="margin-top:1rem">${txt(q)}${sayUI(q)}<p class="stem">${rich(q.q)}</p>${fig(q)}${rev ? '' : confUI() + hintUI()}${opts}${fb}</div>
    <div class="row sp nav"><button class="btn" data-a="go" data-v="${i-1}" ${i ? '' : 'disabled'}>← Anterior</button>
      <button class="btn" data-a="flag">${S.flag[i] ? '🚩 Quitar<span class="hide-s"> marca</span>' : '🏳 Marcar<span class="hide-s"> para revisar</span>'}</button>
      <button class="btn pri" data-a="go" data-v="${i+1}" ${i < qs.length-1 ? '' : 'disabled'}>Siguiente →</button></div><p class="kbd-hint"><span class="kh-k">Atajos: A–E elegir · ← → navegar · M marcar · 1-3 seguridad</span><span class="kh-t">Desliza ← → para cambiar de pregunta</span></p></div>
    <aside class="card side"><div class="pills">${pillsHTML()}</div>
    <div class="lg"><span><i style="background:var(--line)"></i>Sin responder</span><span><i style="background:var(--ok)"></i>Respondida</span><span><i style="background:var(--warn)"></i>Revisar</span></div>
    ${S.flag.some(Boolean) ? `<button class="btn" style="width:100%;margin-top:1rem" data-a="marked">🚩 Ir a las marcadas (${S.flag.filter(Boolean).length})</button>` : ''}<button class="btn pri" style="width:100%;margin-top:1rem" data-a="finish">Entregar examen</button></aside></div>`;
  save(); paceUpdate(); document.querySelector('.strip .cur')?.scrollIntoView({inline:'center', block:'nearest'});
}
