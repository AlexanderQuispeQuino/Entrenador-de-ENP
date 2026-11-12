"use strict";
/* ============ 17. LECCIONES POR TEMA (fase 10): teoría mínima → ejemplo resuelto → práctica con ayuda que se retira ============ */
const SYS_TEORIA = `Eres un tutor del examen ENP de Beca 18 (Perú). Explica el tema con otras palabras a un estudiante de secundaria que falló preguntas de ese tema. Formato exacto: **Con otras palabras:** 2 o 3 frases. **Ejemplo distinto:** un ejemplo corto y original, resuelto en 2 o 3 pasos, con su respuesta. **Cómo no equivocarte:** 1 línea que ataque su causa de error principal si se indica. Máximo 130 palabras. Español claro, sin saludos ni frases motivacionales, sin LaTeX ni $; usa superíndices Unicode. Verifica dos veces el cálculo del ejemplo.`;
const bankTopic = (topic, skipId) => { const m = mem.get(), out = [];
  for (const [k, e] of Object.entries(BANK)) e.qs.forEach((q, i) => { if (q.t === topic && k + ':' + i !== skipId) out.push({...structuredClone(q), id:k + ':' + i}); });
  const rank = q => { const r = m[q.id]; return r && r.box != null && r.box < 5 ? 0 : !r ? 1 : 2; };   // falladas primero, luego no vistas, luego dominadas
  return out.sort((a, b) => rank(a) - rank(b) || Math.random() - .5); };
function startLesson(topic){
  if (!THEORY[topic]) return;
  if (!$('v-exam').hidden && S.qs.length && S.mode === 'train'){ lap(); S.cur = null; save(); }
  stopSpeech(); S.lesson = {topic, step:0, k:0, ex:bankTopic(topic)[0] || null};
  renderLesson(); show('v-learn');
}
function renderLesson(){
  const Ls = S.lesson, th = THEORY[Ls.topic], ex = Ls.ex;
  const head = `<div class="row sp"><button class="btn sm" data-a="toap">← Aprender</button><span class="mut">Paso ${Ls.step + 1} de 3 · ${Ls.step === 0 ? 'Lo esencial' : 'Ejemplo resuelto'}</span></div><h1 style="margin-top:.6rem">${esc(Ls.topic)}</h1>`;
  let body = '';
  if (Ls.step === 0){
    const causes = {}; Object.values(mem.get()).filter(r => r.t === Ls.topic && r.cause).forEach(r => causes[r.cause] = (causes[r.cause] || 0) + 1);
    const top = Object.entries(causes).sort((a, b) => b[1] - a[1])[0];
    body = `<div class="card"><p style="margin-top:0"><b>Idea clave.</b> ${rich(th.idea)}</p><p><b>Regla o estrategia.</b> ${rich(th.regla)}</p><p><b>Error típico.</b> ${rich(th.error)}</p>${top ? `<p class="mut" style="margin-bottom:0">Tu causa de error más frecuente en este tema: <b>${CAUSAS[top[0]]}</b>. ${esc(CAUSA_TIP[top[0]])}</p>` : ''}</div>
      <div class="row" style="margin-top:1rem"><button class="btn pri" data-a="lnext">Siguiente: ver un ejemplo resuelto →</button><button class="btn" data-a="lai">🤖 Explícamelo de otra forma</button>${tts.ok ? '<button class="btn" data-a="lsay" aria-label="Escuchar la teoría">🔊</button>' : ''}</div><div class="ai"><pre id="lai" class="aiout" hidden></pre></div>`;
  } else if (!ex){
    body = `<div class="card"><p>No hay un ejemplo de este tema en los exámenes cargados.</p></div><div class="row" style="margin-top:1rem"><button class="btn pri" data-a="lnext">Ir a practicar →</button></div>`;
  } else {
    const steps = (ex.r || '').split(/(?<=[.?!])\s+/).filter(Boolean), shown = steps.slice(0, Ls.k), done = Ls.k >= steps.length;
    body = `<div class="card">${txt(ex)}<p class="stem" style="margin-top:0">${rich(ex.q)}</p>${fig(ex)}${ex.o.map((o, j) => `<div class="opt ${done && j === ex.a ? 'ok' : ''}"><b>${L[j]}</b><span>${rich(o)}</span></div>`).join('')}
      <div class="fb"><b>Resolución paso a paso</b>${shown.length ? '<ol>' + shown.map(x => `<li>${rich(x)}</li>`).join('') + '</ol>' : '<p class="mut" style="margin:.4rem 0 0">Antes de ver el primer paso, intenta plantear tú cómo empezarías.</p>'}${done ? `<p style="margin-bottom:0"><b>Respuesta correcta: ${L[ex.a]}) ${rich(ex.o[ex.a])}</b></p>` : ''}</div></div>
      <div class="row" style="margin-top:1rem">${done ? '<button class="btn pri" data-a="lnext">Siguiente: practicar 3 preguntas →</button>' : '<button class="btn pri" data-a="lstep">Mostrar el siguiente paso</button><button class="btn" data-a="lall">Mostrar todo</button>'}</div>`;
  }
  $('v-learn').innerHTML = head + body;
}
/* Paso 3: práctica en modo entrenamiento con ayuda decreciente (ver hintUI) */
async function lessonPractice(){
  const Ls = S.lesson, all = bankTopic(Ls.topic, Ls.ex && Ls.ex.id), m = mem.get(), fresh = all.filter(q => !m[q.id] || (m[q.id].box != null && m[q.id].box < 5)).slice(0, 3);
  let qs = fresh;
  if (fresh.length < 3){
    if (store.get('gkey')){ toast('Creando ' + (3 - fresh.length) + ' pregunta(s) nueva(s) con IA 🤖…'); try { qs = fresh.concat(await aiFill(Ls.topic, 3 - fresh.length)); toast(''); } catch { toast('No pude crear preguntas nuevas con IA; uso preguntas del banco.'); qs = all.slice(0, 3); } }
    else qs = all.slice(0, 3);
  }
  if (!qs.length){ toast('No hay preguntas de este tema. Guarda tu clave de Gemini en ⚙ IA para generar nuevas.'); return; }
  if (store.get('enp-run') && !await ask('Tienes un examen en curso. La práctica de la lección lo reemplazará. ¿Continuar?')) return;
  S.qs = qs; S.name = 'Lección: ' + Ls.topic; start('train');
}
function lessonReport(){
  if (!/^Lección:/.test(S.name)) return '';
  const t = S.name.slice(8).trim(), scored = S.qs.map((q,i) => ({q,i})).filter(x => x.q.a !== null), n = scored.length, ok = scored.filter(x => S.ans[x.i] === x.q.a).length, pass = n > 0 && ok / n >= .66;
  return `<div class="card" style="margin-top:1rem;border-color:${pass ? 'var(--ok)' : 'var(--warn)'}"><b>${n === 0 ? 'ℹ️ Sin clave para evaluar' : pass ? '✅ Lección completada' : '🔁 Todavía no'}: ${ok} de ${n}</b><p style="margin:.3rem 0 .6rem">${n === 0 ? 'Estas preguntas no tienen clave de respuesta, así que no es posible calcular tu resultado.' : pass ? 'El tema queda marcado como trabajado. Si fallaste alguna, volverá en tu repaso espaciado.' : 'Vuelve a la teoría y mira otro ejemplo: leer la regla justo antes de practicar ayuda más que repetir sin ella.'}</p><div class="row"><button class="btn ${pass ? '' : 'pri'}" data-a="learn" data-v="${esc(t)}">${pass ? 'Repasar la lección' : 'Repetir la lección'}</button><button class="btn" data-a="toap">Volver a Aprender</button></div></div>`;
}
async function lessonAI(){
  const out = $('lai'), key = store.get('gkey'), Ls = S.lesson, th = THEORY[Ls.topic]; out.hidden = false;
  if (!key){ out.textContent = 'Guarda tu clave gratuita de Gemini en ⚙ IA para usar esta función.'; return; }
  const recs = Object.values(mem.get()).filter(r => r.t === Ls.topic), causes = {};
  recs.forEach(r => { if (r.cause) causes[r.cause] = (causes[r.cause] || 0) + 1; });
  const top = Object.entries(causes).sort((a, b) => b[1] - a[1])[0], n = recs.reduce((a, r) => a + r.n, 0), ok = recs.reduce((a, r) => a + r.ok, 0);
  const data = `Tema: ${Ls.topic}.\nIdea clave: ${th.idea}\nRegla: ${th.regla}\nError típico: ${th.error}\nRendimiento del estudiante: ${n ? ok + ' aciertos de ' + n : 'sin datos'}.\nCausa de error principal: ${top ? CAUSAS[top[0]] : 'no indicada'}.`;
  const ck = 'teo:' + hash(data + modelId()), hit = store.get(ck); if (hit){ out.innerHTML = fmt(hit); return; }
  out.innerHTML = '<span class="think" role="status">Preparando otra explicación</span>';
  try {
    const r = await fetch(geminiURL(), {method:'POST', headers:{'Content-Type':'application/json', 'x-goog-api-key':key},
      body:JSON.stringify({system_instruction:{parts:[{text:SYS_TEORIA}]}, contents:[{role:'user', parts:[{text:data}]}], generationConfig:{temperature:.4, maxOutputTokens:600}})});
    if (r.status === 429){ out.textContent = 'Llegaste al límite gratuito de Gemini. Espera un momento e inténtalo otra vez.'; return; }
    const j = await r.json(), t = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (t){ out.innerHTML = fmt(t); store.set(ck, t); } else out.textContent = j.error?.message || 'Sin respuesta.';
  } catch { out.textContent = 'No se pudo conectar. Revisa tu internet.'; }
}
