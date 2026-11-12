"use strict";
/* ============ 14. EJERCICIO PARECIDO INTERACTIVO (fase 8) ============
   Gemini crea 2 preguntas nuevas del mismo tema y las resuelve por separado: se muestra la primera cuya clave coincide.
   La dificultad se adapta: acertar → un poco más difícil; fallar → un poco más sencillo. */
const GEN_SCHEMA = {type:'ARRAY', items:{type:'OBJECT', properties:{q:{type:'STRING'}, o:{type:'ARRAY', items:{type:'STRING'}}, a:{type:'INTEGER'}, r:{type:'STRING'}}, required:['q', 'o', 'a', 'r']}};
const cleanOption = o => String(o ?? '').trim().replace(/^\s*(?:alternativa\s*)?[A-D]\s*[).:\-–—]\s*/i, '').trim();
const BADRES = /(espera[,.:]|recalcul|revisemos|vamos a ajustar|cambiemos el|ajustemos|no est[aá] en (?:la|las|ninguna)|hmm|me equivoqu|corrijo|corrigiendo|en realidad|mejor dicho|probemos con|intentemos|no coincide con (?:ninguna|las))/i;
const validQ = x => {
  if (!x || typeof x.q !== 'string' || !Array.isArray(x.o) || x.o.length !== 4 || !Number.isInteger(x.a) || x.a < 0 || x.a > 3 || typeof x.r !== 'string') return false;
  // Gemini puede incluir A), B), C) o D) dentro del texto; la interfaz ya añade esas letras.
  x.o = x.o.map(cleanOption);
  if (BADRES.test(x.r) || BADRES.test(x.q)) return false;
  return x.o.every(o => o.length > 0) && new Set(x.o.map(o => o.toLocaleLowerCase('es'))).size === 4;
};
const CONTEXTOS = ['una tienda o mercado','un colegio','un deporte o competencia','transporte y viajes','cocina y recetas','ahorro y préstamos','campo y agricultura','tecnología y celulares','salud y alimentación','construcción y medidas','naturaleza y medio ambiente','una feria o evento','juegos y concursos','una ciudad o mapa'];
const _nums = s => new Set(String(s).match(/\d+(?:[.,]\d+)?/g) || []);
const _toks = s => new Set(String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{4,}/g) || []);
const _simil = (a, b) => { const A = _toks(a), B = _toks(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => B.has(w) && n++); return n / Math.min(A.size, B.size); };
const _sameNums = (a, b) => { const A = _nums(a), B = _nums(b); if (A.size < 2) return false; let n = 0; A.forEach(x => B.has(x) && n++); return n / A.size >= .6; };
const tooClose = (x, refs) => refs.some(r => _simil(x.q, r) > .55 || _sameNums(x.q, r));
async function pracGen(i){
  const q0 = S.qs[i], box = $('pr' + i); if (!q0 || !box) return;
  if (!store.get('gkey')){ box.innerHTML = '<p class="mut">Para generar ejercicios, guarda tu clave gratuita de Gemini en ⚙ IA.</p>'; return; }
  const P = (S.prac[i] ||= {n:0, ok:0, lvl:0}); P.seen ||= [q0.q];
  box.innerHTML = '<p class="mut">Creando un ejercicio parecido…</p>';
  const nivel = P.lvl > 0 ? 'un poco más difícil' : P.lvl < 0 ? 'un poco más sencillo' : 'del mismo nivel';
  const ejemplo = (q0.tx ? 'Texto: ' + qText(q0).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 700) + '\n' : '') + q0.q + '\n' + q0.o.map((o, j) => L[j] + ') ' + o).join('\n');
  try {
    const ctx = CONTEXTOS[Math.floor(Math.random() * CONTEXTOS.length)], vistos = P.seen.slice(1);
    const cand = (await geminiJSON(SYS_GEN, `Tema: ${q0.t}.\nCrea 3 preguntas nuevas, ${nivel} que el ejemplo, que practiquen la MISMA habilidad o concepto pero con OTROS DATOS: otro contexto (por ejemplo: ${ctx}), otros personajes, OTRAS CIFRAS y otra redacción; si puedes, cambia también lo que se pide hallar. No repitas el escenario, las cifras ni la estructura del enunciado. Las tres preguntas deben ser distintas entre sí.\n\nEjemplo (NO lo copies):\n${ejemplo}${vistos.length ? '\n\nEnunciados ya usados (evítalos):\n' + vistos.map(s => '- ' + s).join('\n') : ''}`, GEN_SCHEMA, .9)).filter(validQ).filter(x => !tooClose(x, P.seen));
    if (!cand.length) throw new Error('pocas');
    const sol = await geminiJSON(SYS_SOLVE, cand.map((x, k) => `Pregunta ${k + 1}: ${x.q}\n` + x.o.map((o, j) => L[j] + ') ' + o).join('\n')).join('\n\n'), {type:'ARRAY', items:{type:'INTEGER'}}, 0);
    const good = cand.find((x, k) => sol[k] === x.a); if (!good) throw new Error('no verificada');
    P.seen.push(good.q); P.cur = {...good, picked:null}; renderPrac(i);
  } catch (e) {
    const lim = e.status === 429 || /429/.test(e.message || '');
    box.innerHTML = `<p class="mut">${lim ? 'Llegaste al límite gratuito de Gemini. Espera un momento y vuelve a generar.' : 'La IA no logró crear un ejercicio confiable esta vez.'}</p><div class="row"><button class="btn pri" data-a="pracnext" data-v="${i}">🔄 Generar de nuevo</button><button class="btn" data-a="pracclose" data-v="${i}">Cerrar</button></div>`; }
}
function renderPrac(i){
  const P = S.prac[i], box = $('pr' + i); if (!P?.cur || !box) return;
  const c = P.cur, done = c.picked != null;
  box.innerHTML = `<div class="card" style="margin-top:.6rem"><div class="row sp"><b>🧪 Ejercicio parecido</b><span class="mut" style="font-size:.85rem">${c.bank ? '📚 del banco de preguntas' : '🤖 generado por IA'} · aciertos ${P.ok}/${P.n}</span></div><p class="stem">${rich(c.q)}</p>
  ${c.o.map((o, j) => `<button class="opt ${done ? (j === c.a ? 'ok' : j === c.picked ? 'no' : '') : ''}" data-a="pracpick" data-v="${i}|${j}" ${done ? 'disabled' : ''}><b>${L[j]}</b><span>${rich(o)}</span></button>`).join('')}
  ${done ? `<div class="fb"><b>${c.picked === c.a ? '✅ ¡Bien!' : '❌ Esta vez no'}</b><div class="aiout">${fmt(c.r)}</div><div class="row"><button class="btn pri" data-a="pracnext" data-v="${i}">Otro más${c.picked === c.a ? ' (un poco más difícil)' : ' (para reforzar)'}</button><button class="btn" data-a="pracclose" data-v="${i}">Cerrar</button></div></div>` : ''}</div>`;
}
