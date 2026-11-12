"use strict";
/* ============ 9. AUTOGUARDADO, HISTORIAL Y ATAJOS (fase 1) ============ */
const hash = t => { let x = 0; for (const c of t) x = (x*31 + c.charCodeAt(0)) | 0; return x; };
const pillsHTML = () => S.qs.map((_,k) => `<button class="pill ${S.flag[k] ? 'f' : S.ans[k] !== null ? 'a' : ''} ${k === S.i ? 'cur' : ''}" data-a="go" data-v="${k}" aria-label="Pregunta ${k+1}">${k+1}</button>`).join('');
const save = () => store.set('enp-run', JSON.stringify({qs:S.qs, i:S.i, ans:S.ans, flag:S.flag, conf:S.conf, cause:S.cause, times:S.times, dur:S.dur, mode:S.mode, end:S.end, name:S.name}));
function resume(){
  try { Object.assign(S, JSON.parse(store.get('enp-run'))); } catch { return; }
  S.replay = false;
  S.conf ||= S.qs.map(() => null); S.cause ||= S.qs.map(() => null); S.times ||= S.qs.map(() => 0); S.cur = null; S.fichaT0 = null;
  clearInterval(S.timer); $('clock').hidden = S.mode !== 'sim';
  if (S.mode === 'sim'){ tick(); S.timer = setInterval(tick, 1000); }
  exam(); show('v-exam');
}
function histAdd(ok, n, B){
  store.set('enp-run', ''); markDay();
  if (/^Lección:/.test(S.name)){ let l = {}; try { l = JSON.parse(store.get('enp-learn') || '{}'); } catch {} l[S.name.slice(8).trim()] = {d:today(), ok, n}; store.set('enp-learn', JSON.stringify(l)); }
  const pc = ([o,k]) => k ? Math.round(o/k*100) : '—';
  try { const h = JSON.parse(store.get('enp-hist') || '[]');
    const tp = {}; S.qs.forEach((q, i) => { if (q.a === null) return; const a = (tp[q.t] ||= [0, 0]); a[1]++; if (S.ans[i] === q.a) a[0]++; });
    h.push({name:S.name || 'Examen', mode:S.mode, sc:(ok*120/n).toFixed(1), m:pc(B.m), l:pc(B.l), pc:Math.round(ok / n * 100), t:Date.now(), tp, d:new Date().toLocaleDateString('es-PE', {day:'numeric', month:'short'})});
    store.set('enp-hist', JSON.stringify(h.slice(-60))); } catch {}
}
