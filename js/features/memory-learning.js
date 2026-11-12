"use strict";
/* ============ 10. APRENDIZAJE ESTRATÉGICO (fase 4) ============
   Memoria por pregunta (localStorage 'enp-mem'): intentos, aciertos, caja de repaso espaciado y causa del error.
   Repaso espaciado (Leitner): fallar → vuelve mañana; acertar sube de caja → +3, +7, +14, +30 días; 5.ª vez = dominada. */
const DAY = 864e5, today = () => Math.floor(Date.now()/DAY), INT = [1, 3, 7, 14, 30];
const mem = {get: () => { try { return JSON.parse(store.get('enp-mem') || '{}'); } catch { return {}; } }, set: m => store.set('enp-mem', JSON.stringify(m))};
const CAUSAS = {c:'Concepto', k:'Cálculo', l:'Lectura', t:'Tiempo', a:'Adiviné'};
const CAUSA_TIP = {c:'Repasa la teoría del tema y haz 3 ejercicios simples antes del próximo simulacro.', k:'Escribe cada paso y comprueba sustituyendo; practica cálculo rápido.', l:'Subraya palabras clave y reformula la pregunta con tus palabras antes de responder.', t:'Usa dos pasadas: responde lo fácil primero y marca lo demás para volver.', a:'Adivinar sin descartar no suma: elimina al menos 2 alternativas antes de marcar.'};
/* Peso de cada tema = preguntas por examen en los exámenes cargados */
const FREQ = (() => { const f = {}, ex = Object.keys(BANK).length; Object.values(BANK).forEach(e => e.qs.forEach(q => f[q.t] = (f[q.t] || 0) + 1)); for (const k in f) f[k] /= ex; return f; })();
const dueList = () => Object.entries(mem.get()).filter(([, r]) => r.due != null && r.due <= today()).sort((a, b) => a[1].due - b[1].due);
const getQ = id => { const [k, i] = id.split(':'), q = BANK[k]?.qs[+i]; return q ? {...structuredClone(q), id} : null; };
const confUI = () => `<div class="row conf"><span class="mut">¿Qué tan seguro estás? (1·2·3)</span>${[['s','Seguro'],['d','Dudo'],['a','Adiviné']].map(([c,t]) => `<button class="chip-b ${S.conf[S.i] === c ? 'sel' : ''}" data-a="conf" data-v="${c}">${t}</button>`).join('')}</div>`;
const causaUI = i => `<div class="row conf"><span class="mut">¿Por qué fallaste?</span>${Object.entries(CAUSAS).map(([c,t]) => `<button class="chip-b ${S.cause[i] === c ? 'sel' : ''}" data-a="cause" data-v="${i}|${c}">${t}</button>`).join('')}</div>`;
function memUpdate(){
  const m = mem.get(), t0 = today(); let cal; try { cal = JSON.parse(store.get('enp-cal') || 'null'); } catch {} cal ||= {s:[0,0], d:[0,0], a:[0,0]};
  S.qs.forEach((q, i) => {
    if (!q.id || q.a === null) return;
    if (S.ans[i] === null && m[q.id]?.box != null) return;   // en un repaso, lo que no se intentó conserva su fecha
    const ok = S.ans[i] === q.a, r = (m[q.id] ||= {t:q.t, b:q.b || 'm', n:0, ok:0}); if (q.ia) r.ia = 1;
    r.n++; if (ok) r.ok++;
    if (!ok){ r.box = 0; r.due = t0 + INT[0]; }
    else if (r.box != null){ r.box++; r.due = r.box >= INT.length ? null : t0 + INT[r.box]; }
    if (S.cause[i]) r.cause = S.cause[i];
    const c = S.conf[i]; if (c && S.ans[i] !== null){ cal[c][0]++; if (ok) cal[c][1]++; }
  });
  mem.set(m); store.set('enp-cal', JSON.stringify(cal));
}
