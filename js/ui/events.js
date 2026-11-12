"use strict";
/* ============ 8. EVENTOS (delegación) ============ */
const A = {
  theme: () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
  cfg: () => { $('gkey').value = store.get('gkey') || ''; $('gmodel').value = store.get('gmodel') || ''; $('cfg').showModal(); },
  saveCfg: () => { store.set('gkey', $('gkey').value.trim()); store.set('gmodel', $('gmodel').value.trim()); },
  tab: v => setTab(v), home: () => { homeExtras(); show('v-home'); }, resume: () => resume(), discard: () => { store.set('enp-run', ''); homeExtras(); },
  conf: v => { S.conf[S.i] = S.conf[S.i] === v ? null : v; exam(); },
  cause: v => { const [i, c] = v.split('|'), q = S.qs[+i]; S.cause[+i] = S.cause[+i] === c ? null : c;
    document.querySelectorAll(`[data-a=cause][data-v^="${i}|"]`).forEach(b => b.classList.toggle('sel', b.dataset.v === i + '|' + S.cause[+i]));
    if (q.id){ const m = mem.get(); if (m[q.id]){ m[q.id].cause = S.cause[+i] || undefined; mem.set(m); } } },
  diag: () => { const pool = {};
    for (const [k,e] of Object.entries(BANK)) if (!e.ia) e.qs.forEach((q,i) => (pool[q.t] ||= []).push({...structuredClone(q), id: k + ':' + i}));
    const pick = Object.values(pool).map(a => a[Math.floor(Math.random()*a.length)]), rest = Object.values(pool).flat().filter(q => !pick.includes(q));
    while (pick.length < 24 && rest.length) pick.push(rest.splice(Math.floor(Math.random()*rest.length), 1)[0]);
    S.name = 'Diagnóstico'; S.qs = pick.sort((a,b) => (a.b === 'l') - (b.b === 'l')); start('sim'); },
  review: () => { S.qs = dueList().slice(0, 15).map(([id]) => getQ(id)).filter(Boolean); if (!S.qs.length) return; S.name = 'Repaso espaciado'; start('train'); },
  sprint: async v => { let qs = sprintQs(v); if (!qs.length) return;
    const m = mem.get(), seen = q => m[q.id] && !(m[q.id].box != null && m[q.id].box < 5), own = qs.filter(q => q.t === v), stale = own.filter(seen), need = Math.min(5, Math.max(0, 8 - (own.length - stale.length)));
    if (need && store.get('gkey')){ toast('Creando ' + need + ' pregunta(s) nueva(s) con IA 🤖…'); try { const ai = await aiFill(v, need); qs = qs.filter(q => !stale.includes(q)).concat(ai).sort(() => Math.random() - .5); toast(''); } catch { toast('No pude crear preguntas nuevas con IA; uso preguntas del banco.'); } }
    S.qs = qs; S.name = 'Sprint: ' + v; start('train'); },
  plan: () => { const d = $('pdate').value, g = +$('pgoal').value; if (!d || !g) return; store.set('enp-plan', JSON.stringify({date:d, goal:Math.min(120, g)})); homeExtras(); },
  planx: () => { store.set('enp-plan', ''); homeExtras(); },
  gohome: async () => { if (!ACTIVE) return; const enExamen = (!$('v-exam').hidden || !$('v-ficha').hidden) && S.qs.length;
    if (enExamen && !await ask(S.mode === 'sim' ? 'El reloj del simulacro NO se detiene mientras estás fuera. ¿Ir al inicio? Podrás continuar desde ahí.' : 'Tu avance se guarda: podrás continuar desde el inicio. ¿Ir al inicio?')) return;
    if (enExamen){ lap(); S.cur = null; save(); }
    /* La generación está desacoplada de la vista: navegar no la cancela. */
    stopSpeech(); clearInterval(S.timer); $('clock').hidden = true; S.tab = 'hoy'; homeExtras(); show('v-home'); },
  say: v => { const q = S.qs[S.i] || {}, [k, x] = v.split('|'); let t = '';
    if (k === 'q') t = q.q; else if (k === 'all') t = q.q + '. ' + q.o.map((o, j) => 'Alternativa ' + L[j] + ': ' + o).join('. ');
    else if (k === 'text') t = qText(q) || ''; else if (k === 'o') t = 'Alternativa ' + L[+x] + ': ' + q.o[+x]; else if (k === 'r') t = q.r || '';
    else if (k === 'ai') t = $('ai' + x)?.textContent || ''; speak(t); },
  attv: v => openAttempt(v), attd: async v => { if (!await ask('¿Eliminar este intento del historial? No afecta a tu progreso por tema.')) return; attSave(attList().filter(x => x.id !== v)); homeExtras(); },
  stopsay: () => stopSpeech(), zoom: v => { $('zoomimg').src = v; $('zoom').showModal(); },
  rate: () => { const R = [.8, 1, 1.25]; tts.rate = R[(R.indexOf(tts.rate) + 1) % R.length]; store.set('enp-rate', String(tts.rate)); document.querySelectorAll('[data-a=rate]').forEach(b => b.textContent = '⏩ ' + tts.rate + '×'); },
  genex: () => genConfig(), gensol: () => genSol(), stopsol: () => { SOL.stop = true; }, solall: async () => { if (!await ask('¿Volver a generar las 120 soluciones? Reemplaza las actuales y tarda unos 20 a 25 minutos.')) return; solTargets().forEach(q => store.set('sol2:' + q.id, '')); genSol(); }, gen: v => generarExamen(v), genview: () => { renderGenProgress(); show('v-gen'); }, genresume: () => reanudarGeneracion(), gendiscard: () => descartarGeneracion(), gencancel: () => { GEN.stop = true; },
  delia: async v => { if (!await ask('¿Eliminar este examen generado? Tu progreso en sus preguntas se conserva.')) return; store.set(IA_KEY, JSON.stringify(iaList().filter(e => e.id !== v))); delete BANK[v]; renderBank(); },
  toex: () => { S.tab = 'ex'; homeExtras(); show('v-home'); },
  learn: v => startLesson(v), toap: () => { S.tab = 'ap'; homeExtras(); show('v-home'); },
  lnext: () => { if (S.lesson.step === 0){ S.lesson.step = 1; S.lesson.k = 0; renderLesson(); scrollTo({top:0}); } else lessonPractice(); },
  lstep: () => { S.lesson.k++; renderLesson(); }, lall: () => { S.lesson.k = 999; renderLesson(); }, lai: () => lessonAI(),
  lsay: () => { const t = THEORY[S.lesson.topic]; speak(`${S.lesson.topic}. Idea clave: ${t.idea} Regla: ${t.regla} Error típico: ${t.error}`); },
  prac: v => pracGen(+v), pracnext: v => pracGen(+v), pracclose: v => { $('pr' + v).innerHTML = ''; },
  pracpick: v => { const [i, j] = v.split('|').map(Number), P = S.prac[i]; if (!P?.cur || P.cur.picked != null) return;
    P.cur.picked = j; P.n++; if (j === P.cur.a){ P.ok++; P.lvl = Math.min(1, P.lvl + 1); } else P.lvl = Math.max(-1, P.lvl - 1); renderPrac(i); },
  export: () => exportar(), share: () => compartir(),
  who: async () => { if (S.mode === 'sim' && !$('v-exam').hidden && !await ask('El reloj del simulacro NO se detiene mientras cambias de persona. ¿Continuar?')) return; if (!$('v-exam').hidden && S.qs.length){ lap(); S.cur = null; save(); } whoView('manage'); },
  wnew: () => { const id = createProfile($('wname').value); if (id) enterProfile(id); }, wpick: v => enterProfile(v), wback: () => { homeExtras(); show('v-home'); },
  wdel: async v => { const pr = profiles().find(x => x.id === v); if (!pr || !await ask(`¿Eliminar el perfil de «${pr.name}» y todo su avance? No se puede deshacer.`)) return;
    Object.keys(localStorage).filter(k => k.startsWith('u:' + v + ':')).forEach(k => localStorage.removeItem(k)); store.set('enp-profiles', JSON.stringify(profiles().filter(x => x.id !== v)));
    if (v === ACTIVE){ store.set('enp-active', ''); try { sessionStorage.removeItem('enp-sess'); } catch {} location.reload(); } else whoView('manage'); },
  fview: v => viewFollow(v), toprog: () => { S.tab = 'pr'; homeExtras(); show('v-home'); },
  fdel: async v => { if (!await ask('¿Quitar este seguimiento de tu lista?')) return; store.set('enp-follow', JSON.stringify(followList().filter(x => x.id !== v))); homeExtras(); show('v-home'); }, hint: () => askHint(), aiplan: () => askPlan(), refuerzo: v => refuerzo(v),
  retry: () => { S.qs = S.qs.filter((q,i) => q.a !== null && S.ans[i] !== q.a); S.name += ' · errores'; start('train'); }, bank: v => { S.name = BANK[v].name; modePick(structuredClone(BANK[v].qs).map((q,i) => ({...q, id: v + ':' + i}))); }, 'go-modes': () => modePick(S.qs),
  start: v => start(v), pick: v => { if (S.mode === 'train' && S.ans[S.i] !== null) return; S.ans[S.i] = +v; exam(); },
  go: v => { S.i = Math.max(0, Math.min(S.qs.length-1, +v)); exam(); scrollTo({top:0}); }, flag: () => { S.flag[S.i] = !S.flag[S.i]; exam(); },
  finish: () => S.mode === 'sim' ? ficha() : finish(),
  marked: () => { const f = S.flag.map((x, i) => x ? i : -1).filter(i => i >= 0); if (f.length) A.go(String(f.find(i => i > S.i) ?? f[0])); },
  bub: v => { const [i, j] = v.split('|').map(Number); S.fichaMarks[i] = S.fichaMarks[i] === j ? null : j; renderFicha(); },
  fvac: () => { S.fichaEmpty = !S.fichaEmpty; store.set('enp-ficha-empty', S.fichaEmpty ? '1' : '0'); S.fichaMarks = S.fichaEmpty ? S.qs.map(() => null) : S.ans.slice(); S.fichaT0 = Date.now(); renderFicha(); },
  back: () => { exam(); show('v-exam'); },
  deliver: () => { S.fichaSec = Math.round((Date.now() - S.fichaT0) / 1000); S.ansExam = S.ans.slice(); S.ans = S.fichaMarks.slice(); finish(true); }, ai: v => askGemini(+v), web: v => openWeb(v),
  add: () => { S.qs.push({t:'General', q:'', o:['','','',''], a:null, r:''}); S.edI = S.qs.length - 1; editor(); }, del: v => { S.qs.splice(+v, 1); editor(); }, edgo: v => { S.edI = +v; editor(); },
  rvf: v => { document.querySelectorAll('.rv').forEach(d => d.hidden = !(v === 'all' || (v === 'flag' ? d.dataset.fl === '1' : d.dataset.st === v))); document.querySelectorAll('[data-a=rvf]').forEach(b => { b.classList.toggle('sel', b.dataset.v === v); b.setAttribute('aria-pressed', String(b.dataset.v === v)); }); }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && A[b.dataset.a]) A[b.dataset.a](b.dataset.v); });
