"use strict";
/* ============ 19. PERFILES Y SEGUIMIENTO (fase 12) ============ */
const profiles = () => { try { return JSON.parse(store.get('enp-profiles') || '[]'); } catch { return []; } };
const me = () => profiles().find(p => p.id === ACTIVE);
const slug = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'perfil';
const LEGACY = ['enp-mem', 'enp-hist', 'enp-cal', 'enp-plan', 'enp-day', 'enp-streak', 'enp-learn', 'enp-run', 'enp-ficha-empty', 'enp-ai-plan', 'enp-iaex', 'enp-tab'];
function createProfile(raw){
  const name = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 24), ps = profiles();
  if (!name){ toast('Escribe tu nombre.'); return null; }
  if (ps.some(p => p.name.toLowerCase() === name.toLowerCase())){ toast('Ya hay alguien con ese nombre en este equipo.'); return null; }
  const id = 'p' + Date.now().toString(36); ps.push({id, name}); store.set('enp-profiles', JSON.stringify(ps));
  if (ps.length === 1) LEGACY.forEach(k => { try { const v = localStorage.getItem(k); if (v != null){ localStorage.setItem('u:' + id + ':' + k, v); localStorage.removeItem(k); } } catch {} });   // el avance anterior pasa al primer perfil
  return id;
}
function enterProfile(id){ store.set('enp-active', id); try { sessionStorage.setItem('enp-sess', '1'); } catch {} location.reload(); }
function whoView(mode){
  const ps = profiles(), add = `<div class="card ed" style="margin-top:1rem"><b>${mode === 'new' ? 'Tu nombre' : '➕ Agregar persona'}</b><label>Nombre<input id="wname" maxlength="24" autocomplete="off" placeholder="Ej: Ana"></label><button class="btn ${mode === 'new' ? 'pri' : ''}" data-a="wnew">${mode === 'new' ? 'Empezar' : 'Agregar y entrar'}</button></div>`;
  $('v-who').innerHTML = mode === 'new'
    ? `<h1>¡Bienvenido/a!</h1><p class="mut">Escribe tu nombre para guardar tu avance. Si varias personas usan este equipo, cada una tendrá su propio perfil y su propio progreso.</p>${add}`
    : `<h1>¿Quién eres?</h1><div class="grid">${ps.map(pr => `<div class="card row sp"><b>👤 ${esc(pr.name)}${pr.id === ACTIVE ? ' <span class="mut">(actual)</span>' : ''}</b><span class="row"><button class="btn pri" data-a="wpick" data-v="${pr.id}">Entrar</button><button class="btn sm" data-a="wdel" data-v="${pr.id}">Eliminar</button></span></div>`).join('')}</div>${add}${mode === 'manage' ? '<div class="row" style="margin-top:1rem"><button class="btn" data-a="wback">← Volver</button></div>' : ''}`;
  show('v-who');
}
function bootWho(){
  const ps = profiles();
  if (!ps.length){ whoView('new'); return true; }
  let sess = null; try { sess = sessionStorage.getItem('enp-sess'); } catch {}
  if (ps.length > 1 && !sess){ whoView('pick'); return true; }
  if (!ps.find(p => p.id === ACTIVE)){ ACTIVE = ps[0].id; store.set('enp-active', ACTIVE); }
  try { sessionStorage.setItem('enp-sess', '1'); } catch {}
  $('whoBtn').innerHTML = '👤<span class="hide-s"> ' + esc(me().name) + '</span>'; $('shareBtn').hidden = !navigator.canShare;
  return false;
}
/* ----- Exportar: el archivo lleva el nombre de la persona ----- */
function exportBlob(){ const o = {v:2, app:'enp', profile:(me() || {}).name || 'Sin nombre', exportedAt:new Date().toISOString()}; KEYS.forEach(k => { const x = store.get(k); if (x) o[k] = x; }); return new Blob([JSON.stringify(o)], {type:'application/json'}); }
const exportName = () => `progreso-enp-${slug((me() || {}).name || 'perfil')}-${new Date().toISOString().slice(0, 10)}.json`;
function exportar(){ const a = document.createElement('a'); a.href = URL.createObjectURL(exportBlob()); a.download = exportName(); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
async function compartir(){
  const f = new File([exportBlob()], exportName(), {type:'application/json'});
  if (navigator.canShare && navigator.canShare({files:[f]})){ try { await navigator.share({files:[f], title:'Mi progreso ENP'}); } catch {} } else exportar();
}
async function importar(f){
  try { const o = JSON.parse(await f.text()); if (!(o.v >= 1)) throw 0;
    if (o.profile && me() && o.profile.toLowerCase() !== me().name.toLowerCase() && !await ask(`Este archivo es de «${o.profile}» y tú eres «${me().name}». Restaurarlo REEMPLAZA tu avance actual. ¿Continuar? (Para solo verlo, usa «Cargar progreso de otra persona».)`)) return;
    KEYS.forEach(k => { if (typeof o[k] === 'string') store.set(k, o[k]); }); homeExtras(); toast('Progreso restaurado.'); }
  catch { toast('Ese archivo no parece un progreso válido.'); }
}
/* ----- Seguimiento: ver el progreso de otra persona sin tocar el propio ----- */
const followList = () => { try { return JSON.parse(store.get('enp-follow') || '[]'); } catch { return []; } };
async function followLoad(files){
  const list = followList(); let added = 0, bad = 0, last = '';
  for (const f of files){
    try { const o = JSON.parse(await f.text()); if (!(o.v >= 1)) throw 0;
      const name = String(o.profile || f.name.replace(/\.json$/i, '')).trim().slice(0, 40), id = slug(name), data = {};
      KEYS.forEach(k => { if (typeof o[k] === 'string') data[k] = o[k]; });
      const snap = {id, name, exportedAt:o.exportedAt || new Date().toISOString(), data}, i = list.findIndex(x => x.id === id);
      if (i < 0) list.push(snap); else if ((list[i].exportedAt || '') <= snap.exportedAt) list[i] = snap; added++; last = id;
    } catch { bad++; }
  }
  store.set('enp-follow', JSON.stringify(list)); homeExtras();
  toast(added ? `Cargado${added > 1 ? 's' : ''} ${added} progreso${added > 1 ? 's' : ''}.${bad ? ' ' + bad + ' archivo(s) no válido(s).' : ''}` : 'Ese archivo no parece un progreso válido.');
  if (added === 1 && !bad) viewFollow(last);
}
const J = (d, k, def) => { try { const v = JSON.parse(d[k] ?? 'null'); return v ?? def; } catch { return def; } };
const streakOf = (a, base) => { const set = new Set(a || []); let t = base; if (!set.has(t)) t--; let n = 0; while (set.has(t)){ n++; t--; } return n; };
/* Calcula todo lo que se muestra de una persona a partir de su archivo */
function analyze(d, exportedAt){
  const hist = J(d, 'enp-hist', []), mem = J(d, 'enp-mem', {}), recs = Object.values(mem), base = Math.floor(new Date(exportedAt) / DAY);
  const pcs = hist.map(x => x.pc ?? Math.round(+x.sc / 120 * 100)), avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const n = recs.reduce((a, r) => a + r.n, 0), ok = recs.reduce((a, r) => a + r.ok, 0), agg = {}, causes = {};
  recs.forEach(r => { const a = (agg[r.t] ||= {n:0, ok:0}); a.n += r.n; a.ok += r.ok; if (r.cause) causes[r.cause] = (causes[r.cause] || 0) + 1; });
  const wt = hist.filter(x => x.tp), half = Math.ceil(wt.length / 2), early = {}, late = {};
  wt.forEach((x, i) => Object.entries(x.tp).forEach(([t, [o, c]]) => { const T = i < half ? early : late, a = (T[t] ||= [0, 0]); a[0] += o; a[1] += c; }));
  const delta = t => early[t] && late[t] && early[t][1] >= 3 && late[t][1] >= 3 ? Math.round(late[t][0] / late[t][1] * 100 - early[t][0] / early[t][1] * 100) : null;
  const topics = Object.keys(FREQ).map(t => ({t, acc:agg[t] ? agg[t].ok / agg[t].n : null, n:agg[t] ? agg[t].n : 0, f:FREQ[t], d:delta(t)})).sort((a, b) => b.f * (1 - (b.acc ?? .5)) - a.f * (1 - (a.acc ?? .5)));
  return {hist, sims:hist.filter(x => x.mode === 'sim'), pcs, trend:pcs.length >= 4 ? Math.round(avg(pcs.slice(-3)) - avg(pcs.slice(0, -3).slice(-3))) : null,
    dom:n ? Math.round(ok / n * 100) : null, streak:streakOf(J(d, 'enp-streak', []), base), lessons:Object.values(J(d, 'enp-learn', {})).filter(l => l.ok / l.n >= .66).length,
    topics, plan:J(d, 'enp-plan', null), cal:J(d, 'enp-cal', null), causes};
}
const trendText = t => t === null ? 'Aún hay pocos intentos para ver una tendencia.' : t >= 5 ? `▲ Mejorando: +${t} puntos de acierto en sus últimos intentos.` : t <= -5 ? `▼ Bajó ${t} puntos de acierto en sus últimos intentos.` : '▬ Estable en sus últimos intentos.';
function lineSVG(vals){
  if (vals.length < 2) return '<p class="mut">Se necesitan al menos 2 intentos para ver la evolución.</p>';
  const w = 330, h = 120, X = i => 28 + i * (w - 40) / (vals.length - 1), Y = v => h - 20 - v / 100 * (h - 34);
  const grid = [0, 50, 100].map(v => `<line x1="28" x2="${w - 12}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="22" y="${Y(v) + 3}" text-anchor="end">${v}%</text>`).join('');
  return `<div class="fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolución del porcentaje de acierto">${grid}<polyline fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" points="${vals.map((v, i) => X(i) + ',' + Y(v)).join(' ')}"/>${vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="var(--brand)"><title>Intento ${i + 1}: ${v}%</title></circle>`).join('')}<text x="${w / 2}" y="${h - 4}" text-anchor="middle">intentos (de más antiguo a más reciente)</text></svg></div>`;
}
const ago = iso => { const d = Math.max(0, Math.round((Date.now() - new Date(iso)) / DAY)); return d === 0 ? 'hoy' : d === 1 ? 'ayer' : 'hace ' + d + ' días'; };
function followHTML(){
  const list = followList();
  if (!list.length) return '<p class="mut">Aún no has cargado el progreso de nadie.</p>';
  return `<div class="grid cols">${list.map(f => { const a = analyze(f.data, f.exportedAt), last = a.sims.length ? a.sims.at(-1).sc : null;
    return `<div class="card"><div class="row sp"><b>👤 ${esc(f.name)}</b><span class="mut" style="font-size:.85rem">compartido ${ago(f.exportedAt)}</span></div>
    <p class="mut" style="margin:.4rem 0">Dominio ${a.dom === null ? '—' : a.dom + ' %'} · racha ${a.streak} 🔥 · último simulacro ${last === null ? '—' : last + '/120'}</p>
    <p style="margin:0 0 .6rem;font-size:.9rem">${trendText(a.trend)}</p><div class="row"><button class="btn pri sm" data-a="fview" data-v="${esc(f.id)}">Ver detalle</button><button class="btn sm" data-a="fdel" data-v="${esc(f.id)}">Quitar</button></div></div>`; }).join('')}</div>`;
}
function viewFollow(id){
  const f = followList().find(x => x.id === id); if (!f) return;
  const a = analyze(f.data, f.exportedAt), best = a.sims.length ? Math.max(...a.sims.map(x => +x.sc)) : null, last = a.sims.length ? a.sims.at(-1).sc : null, days = Math.round((Date.now() - new Date(f.exportedAt)) / DAY);
  const col = acc => acc === null ? 'var(--line)' : acc >= .75 ? 'var(--ok)' : acc >= .5 ? 'var(--warn)' : 'var(--bad)', stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  const weak = a.topics.filter(t => t.n).slice(0, 3), topCause = Object.entries(a.causes).sort((x, y) => y[1] - x[1])[0];
  const planDays = a.plan && a.plan.date ? Math.ceil((new Date(a.plan.date + 'T00:00:00') - new Date()) / DAY) : null;
  const tips = [trendText(a.trend)];
  if (weak.length) tips.push(`Temas más débiles: ${weak.map(t => esc(t.t) + ' (' + Math.round(t.acc * 100) + ' %)').join(', ')}. Pídele que haga «Aprender» y un sprint de ${esc(weak[0].t)}.`);
  if (topCause) tips.push(`Su causa de error más frecuente es <b>${CAUSAS[topCause[0]]}</b>: ${esc(CAUSA_TIP[topCause[0]])}`);
  if (days > 7) tips.push(`Este archivo tiene ${days} días: pídele uno nuevo para ver su avance actual.`);
  $('v-view').innerHTML = `<div class="row sp"><button class="btn sm" data-a="toprog">← Progreso</button><span class="mut" style="font-size:.85rem">Compartido ${ago(f.exportedAt)} · solo lectura</span></div>
  <h1 style="margin-top:.6rem">👤 ${esc(f.name)}</h1>
  <div class="stats">${stat(a.streak + ' 🔥', 'días seguidos')}${stat(a.dom === null ? '—' : a.dom + ' %', 'dominio')}${stat(last === null ? '—' : last, 'último simulacro')}${stat(best === null ? '—' : best, 'mejor simulacro')}</div>
  <h2>Evolución</h2><div class="card"><b>Porcentaje de acierto por intento</b>${lineSVG(a.pcs.slice(-20))}<p style="margin:.4rem 0 0">${trendText(a.trend)}</p></div>
  ${a.sims.length ? `<div class="card" style="margin-top:1rem"><b>Simulacros (sobre 120)</b><div class="spark" style="margin-top:.6rem">${a.sims.slice(-10).map(x => `<i style="height:${Math.max(5, +x.sc / 120 * 100)}%" title="${esc(x.sc)}"><em>${esc(x.sc)}</em></i>`).join('')}</div></div>` : ''}
  <h2>Para acompañar</h2><div class="card">${tips.map(x => '<p style="margin:.3rem 0">' + x + '</p>').join('')}</div>
  ${a.plan ? `<div class="card" style="margin-top:1rem"><b>Su meta:</b> ${esc(a.plan.goal)}/120${planDays !== null ? ' · ' + (planDays > 0 ? 'faltan ' + planDays + ' día(s) para el examen' : planDays === 0 ? 'el examen es hoy' : 'la fecha del examen ya pasó') : ''} · lecciones completadas: ${a.lessons}</div>` : `<div class="card" style="margin-top:1rem">Lecciones completadas: <b>${a.lessons}</b> de 22</div>`}
  <h2>Por tema</h2><div class="grid cols">${a.topics.map(t => `<div class="card"><div class="row sp"><b>${esc(t.t)}</b><span class="mut" style="font-size:.85rem">${t.d === null ? '' : t.d > 0 ? '▲ +' + t.d : t.d < 0 ? '▼ ' + t.d : '▬'}</span></div><div class="meter"><i style="width:${t.acc === null ? 0 : Math.round(t.acc * 100)}%;background:${col(t.acc)}"></i></div><span class="mut" style="font-size:.85rem">${t.acc === null ? 'Sin datos' : Math.round(t.acc * 100) + ' % en ' + t.n + (t.n === 1 ? ' intento' : ' intentos')}</span></div>`).join('')}</div>
  ${a.hist.length ? `<h2>Últimos intentos</h2><div class="grid">${a.hist.slice(-8).reverse().map(x => `<div class="card row sp"><span><b>${esc(x.name)}</b> <span class="mut">· ${x.mode === 'sim' ? 'Simulacro' : 'Entrenamiento'} · ${esc(x.d)}</span></span><span><b>${esc(x.sc)}</b>/120</span></div>`).join('')}</div>` : ''}
  <div class="row" style="margin:1.2rem 0"><button class="btn" data-a="fdel" data-v="${esc(f.id)}">Quitar este seguimiento</button></div>`;
  show('v-view');
}
