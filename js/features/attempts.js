"use strict";
/* ============ HISTORIAL DE INTENTOS: cada examen entregado queda guardado y se puede volver a revisar ============ */
const ATT_KEY = 'enp-attempts';
const attList = () => { try { return JSON.parse(store.get(ATT_KEY) || '[]'); } catch { return []; } };
const attSave = l => { l = l.slice(-40); for (;;){ const raw = JSON.stringify(l); try { store.set(ATT_KEY, raw); if (store.get(ATT_KEY) === raw) return; } catch {} if (l.length <= 1) return; l = l.slice(1); } };
const qHash = q => hash((q.q || '') + '|' + (q.o || []).join('|') + '|' + q.a);
function attemptAdd(ok, n){
  const qs = S.qs.map(q => (q.id && getQ(q.id)) ? q.id : {...q, txh:q.txh || (q.tx && !q.id ? TEXTS[q.tx] : undefined)});
  attSave(attList().concat({id:'a' + Date.now().toString(36), t:Date.now(), name:S.name || 'Examen', mode:S.mode, ok, n, blank:S.ans.filter(x => x === null).length, qs, qh:S.qs.map(qHash), ans:S.ans.slice(), flag:S.flag.slice(), conf:(S.conf || []).slice(), cause:(S.cause || []).slice(), times:(S.times || []).map(x => Math.round(x || 0)), dur:S.dur || null, ansExam:S.ansExam || null, fichaSec:S.fichaSec ?? null, fichaEmpty:!!S.fichaEmpty}));
}
function openAttempt(id){
  const a = attList().find(x => x.id === id); if (!a) return;
  const qs = a.qs.map(x => typeof x === 'string' ? getQ(x) : x);
  if (qs.some(q => !q)){ toast('Este intento usa preguntas que ya no existen (por ejemplo, un examen de IA eliminado).'); return; }
  qs.forEach(q => { if (q.tx && q.txh) TEXTS[q.tx] = q.txh; });
  const changed = qs.filter((q, i) => qHash(q) !== a.qh[i]).length, nul = () => qs.map(() => null);
  Object.assign(S, {qs, ans:a.ans, flag:a.flag, conf:a.conf && a.conf.length ? a.conf : nul(), cause:a.cause && a.cause.length ? a.cause : nul(), times:a.times && a.times.length ? a.times : qs.map(() => 0), mode:a.mode, name:a.name, dur:a.dur, ansExam:a.ansExam, fichaSec:a.fichaSec, fichaEmpty:a.fichaEmpty, replay:true, replayT:a.t, i:0, cur:null});
  clearInterval(S.timer); $('clock').hidden = true; stopSpeech();
  finish(true); if (changed) toast(changed + ' pregunta(s) fueron corregidas después de este intento: la revisión muestra la versión actual.');
}
