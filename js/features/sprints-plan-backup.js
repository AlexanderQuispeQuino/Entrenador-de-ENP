"use strict";
/* ============ 12. SPRINTS, PLAN, RESPALDO Y PISTA (fase 6) ============ */
function prioTopics(){
  const agg = {}; Object.values(mem.get()).forEach(r => { const a = (agg[r.t] ||= {n:0, ok:0}); a.n += r.n; a.ok += r.ok; });
  return Object.keys(FREQ).map(t => ({t, pr:FREQ[t] * (1 - (agg[t] ? agg[t].ok / agg[t].n : .5))})).sort((x, y) => y.pr - x.pr).map(x => x.t);
}
/* Sprint mixto: 8 del tema débil (primero errores pendientes, luego no vistas) + 2 de cada uno de los 2 siguientes temas débiles */
function sprintQs(topic){
  const m = mem.get(), pool = [];
  for (const [k, e] of Object.entries(BANK)) e.qs.forEach((q, i) => pool.push({...structuredClone(q), id:k + ':' + i}));
  const rank = q => { const r = m[q.id]; return r && r.box != null && r.box < 5 ? 0 : !r ? 1 : 2; };
  const own = pool.filter(q => q.t === topic).sort((a, b) => rank(a) - rank(b) || Math.random() - .5).slice(0, 8);
  const mix = prioTopics().filter(t => t !== topic).slice(0, 2).flatMap(t => pool.filter(q => q.t === t).sort(() => Math.random() - .5).slice(0, 2));
  return [...own, ...mix].sort(() => Math.random() - .5);
}
function markDay(){
  let d; try { d = JSON.parse(store.get('enp-day') || '{}'); } catch { d = {}; }
  if (d.d !== today()) d = {d:today()};
  if (/^Repaso/.test(S.name)) d.review = 1; if (/^(Sprint|Refuerzo|Lección)/.test(S.name)) d.sprint = 1; if (S.mode === 'sim') d.sim = 1;
  store.set('enp-day', JSON.stringify(d));
  let r = []; try { r = JSON.parse(store.get('enp-streak') || '[]'); } catch {} if (!r.includes(today())) r.push(today()); store.set('enp-streak', JSON.stringify(r.slice(-90)));
}
function planHTML(){
  let pl; try { pl = JSON.parse(store.get('enp-plan') || 'null'); } catch {}
  if (!pl) return `<h2>Tu meta</h2><div class="card ed"><p class="mut" style="margin:0">Con la fecha del examen y tu meta, la app arma el plan de cada día.</p><label>Fecha del examen<input type="date" id="pdate"></label><label>Puntaje meta (sobre 120)<input type="number" id="pgoal" min="1" max="120" value="90"></label><button class="btn pri" data-a="plan">Guardar plan</button></div>`;
  const days = Math.ceil((new Date(pl.date + 'T00:00:00') - new Date()) / DAY);
  let d = {}; try { d = JSON.parse(store.get('enp-day') || '{}'); } catch {} if (d.d !== today()) d = {};
  let hist = []; try { hist = JSON.parse(store.get('enp-hist') || '[]'); } catch {}
  hist = hist.filter(x => x.mode === 'sim').slice(-3);
  const avg = hist.length ? hist.reduce((a, x) => a + +x.sc, 0) / hist.length : null, due = dueList().length, weak = prioTopics()[0];
  let saved = ''; try { const v = JSON.parse(store.get('enp-ai-plan') || 'null'); if (v && v.d === today()) saved = v.text; } catch {}
  const li = (done, label) => `<li>${done ? '✅' : '⬜'} ${label}</li>`;
  const items = [li(!due || d.review, due ? `Repaso espaciado (${Math.min(due, 15)} preguntas)` : 'Repaso espaciado: nada pendiente hoy')];
  if (days > 3){ items.push(li(d.sprint, `Sprint del tema más débil: ${esc(weak)}`)); items.push(li(d.sim, days > 14 ? 'Simulacro: uno por semana (hoy opcional)' : 'Simulacro: uno cada 3 días (hoy opcional)')); }
  else items.push('<li>😴 Últimos días: solo repaso suave, sin contenido nuevo. Duerme 8 horas y llega descansado.</li>');
  return `<h2>Tu plan de hoy</h2><div class="card"><div class="row sp"><b>${days > 0 ? 'Faltan ' + days + ' día(s) para el examen' : days === 0 ? '¡El examen es hoy!' : 'La fecha del examen ya pasó'}</b><button class="btn" data-a="planx" style="padding:.2rem .7rem;font-size:.85rem">Cambiar</button></div>
  <p class="mut" style="margin:.3rem 0">Meta: ${pl.goal}/120 · ${avg === null ? 'aún sin simulacros' : 'promedio de tus últimos simulacros: ' + avg.toFixed(1) + (avg >= pl.goal ? ' (¡ya llegaste a tu meta!)' : ' (te faltan ' + (pl.goal - avg).toFixed(1) + ' puntos)')}</p>
  <ul style="margin:.4rem 0;padding-left:0;list-style:none">${items.join('')}</ul><p class="mut" style="margin:0;font-size:.85rem">Carga recomendada: 45–60 min al día. Mejor poco y todos los días que maratones.</p>
  <div class="row" style="margin-top:.6rem"><button class="btn" data-a="aiplan">🧠 Plan de 7 días</button></div><div class="ai"><pre id="aiplan" class="aiout" ${saved ? '' : 'hidden'}>${saved ? fmt(saved) : ''}</pre></div></div>`;
}
/* Respaldo del progreso (no incluye tu clave de Gemini) */
const KEYS = ['enp-attempts', 'enp-learn', 'enp-streak', 'enp-mem', 'enp-hist', 'enp-cal', 'enp-plan', 'enp-day', 'enp-ficha-empty'];
/* Pista sin spoiler (Gemini; sin clave muestra la estrategia general del tema) */
const SYS_PISTA = `Eres un tutor del examen ENP de Beca 18 (Perú). Da UNA sola pista para que el estudiante avance por sí mismo. Reglas: máximo 40 palabras, español claro, sin saludos. NO reveles la alternativa correcta, ni el resultado final, ni ningún cálculo que lo entregue. No uses LaTeX ni $. Termina con una pregunta guía que lo haga pensar el siguiente paso. Usa la resolución oficial solo para orientarte.`;
const hintBtn = () => S.mode === 'train' ? `<div class="row conf"><button class="chip-b" data-a="hint">💡 Pista sin spoiler</button></div><div class="ai"><pre id="hint" class="aiout" hidden></pre></div>` : '';
/* En una lección la ayuda se retira: pregunta 1 con pista visible, 2 con pista a pedido, 3 sin ayuda */
const hintUI = () => { if (S.mode !== 'train') return ''; if (/^Lección:/.test(S.name)){ if (S.i === 0) return `<div class="pace">💡 Pista: ${esc(TIPS[S.qs[0].t] || TIPS.General)}</div>`; if (S.i >= 2) return ''; } return hintBtn(); };
async function askHint(){
  const out = $('hint'), q = S.qs[S.i], key = store.get('gkey'); if (!out) return; out.hidden = false;
  const fallback = () => { out.textContent = 'Pista general del tema (' + q.t + '): ' + (TIPS[q.t] || TIPS.General); };
  if (!key){ fallback(); return; }
  const ck = 'hint:' + hash(prompt(S.i) + (store.get('gmodel') || '')), hit = store.get(ck);
  if (hit){ out.innerHTML = fmt(hit); return; }
  out.innerHTML = '<span class="think" role="status">Pensando</span>';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${store.get('gmodel') || 'gemini-3.5-flash-lite'}:generateContent`, {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({system_instruction:{parts:[{text:SYS_PISTA}]}, contents:[{role:'user', parts:[{text:prompt(S.i)}]}], generationConfig:{temperature:.3, maxOutputTokens:300}})});
    if (r.status === 429){ fallback(); return; }
    const j = await r.json(), t = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    const leak = q.a !== null && q.o[q.a].trim().length >= 4 && t.includes(q.o[q.a].trim());   // si la pista suelta la respuesta, se descarta
    if (t && !leak){ out.innerHTML = fmt(t); store.set(ck, t); } else fallback();
  } catch { fallback(); }
}
