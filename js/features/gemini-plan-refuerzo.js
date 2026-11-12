"use strict";
/* ============ 13. GEMINI: PLAN DE 7 DÍAS Y REFUERZO GENERADO (fase 7) ============ */
const modelId = () => store.get('gmodel') || 'gemini-3.5-flash-lite';
const geminiURL = () => `https://generativelanguage.googleapis.com/v1beta/models/${modelId()}:generateContent`;
const SYS_PLAN = `Eres un entrenador de estudio para el examen ENP de Beca 18 (Perú). Con los datos recibidos, arma un plan de 7 días. Formato: una línea por día con «**Día N:**» y 1 a 3 tareas separadas por « + », cada una con su duración entre paréntesis; la suma diaria no debe pasar de 60 minutos (el simulacro completo es la única excepción). Usa SOLO los temas y herramientas de la lista; no inventes temas. Incluye un día más ligero. Si faltan 7 días o más, incluye un simulacro completo; si faltan 3 o menos, solo repaso suave y descanso. Cierra con una línea «**Prioridad:**» de máximo 25 palabras que explique por qué. Máximo 170 palabras, sin saludos, sin LaTeX, sin frases motivacionales.`;
const SYS_GEN = `Eres autor de preguntas y docente del examen ENP de Beca 18 (Perú), nivel secundaria. Crea preguntas NUEVAS y originales de opción múltiple: exactamente 4 alternativas distintas y una sola correcta (a es su índice de 0 a 3). No escribas A), B), C) ni D) dentro de las alternativas: la aplicación añade esas letras. Cada pregunta debe incluir una resolución didáctica completa, paso a paso, normalmente de 4 a 7 pasos cuando el problema lo requiera. En cada paso explica la operación, muestra el cálculo intermedio en una línea separada y justifica por qué se hace. Termina con la respuesta y una comprobación breve. No reduzcas la resolución a una sola frase. Español claro. Los campos q y o van en texto plano, sin LaTeX ni $ (usa ×, ÷, ≤, ≥ y superíndices Unicode). El campo r (resolución) se escribe en Markdown: lista numerada con el título de cada paso en **negrita** y los cálculos en LaTeX ($...$ en línea o $$...$$ en bloque), terminando con **Respuesta:** y una comprobación breve. Para comprensión lectora, justifica con evidencia textual. Comprueba que la clave sea inequívoca. Calcula primero y verifica que el resultado esté entre las alternativas; solo entonces escribe la resolución final, limpia y sin dudas, correcciones ni frases como «espera» o «recalculando». Cada $ debe tener su pareja y no uses $$ dentro de una frase.`;
const SYS_SOLVE = `Resuelve cada pregunta de forma independiente. Devuelve SOLO un arreglo JSON con el índice (0 a 3) de la alternativa correcta de cada una, en el mismo orden. Si ninguna alternativa es correcta, o hay más de una correcta, o el enunciado es ambiguo, devuelve -1 en esa posición.`;
function planInfo(){
  let pl = null; try { pl = JSON.parse(store.get('enp-plan') || 'null'); } catch {}
  const days = pl ? Math.ceil((new Date(pl.date + 'T00:00:00') - new Date()) / DAY) : null, agg = {};
  Object.values(mem.get()).forEach(r => { const a = (agg[r.t] ||= {n:0, ok:0}); a.n += r.n; a.ok += r.ok; });
  let hist = []; try { hist = JSON.parse(store.get('enp-hist') || '[]'); } catch {} hist = hist.filter(x => x.mode === 'sim').slice(-3);
  return {pl, days, agg, weak:prioTopics().slice(0, 5), avg:hist.length ? hist.reduce((a, x) => a + +x.sc, 0) / hist.length : null};
}
/* Plan de respaldo sin IA: rota los 3 temas más débiles */
function planOffline(days, weak){
  if (days !== null && days <= 3) return Array.from({length:7}, (_, i) => `**Día ${i + 1}:** Repaso de hoy (15 min) + descanso, sin contenido nuevo`).join('\n') + '\n**Prioridad:** llegar descansado; duerme 8 horas.';
  const w = weak.length ? weak : ['tu tema más débil'], n = Math.min(3, w.length), out = [];
  for (let d = 1; d <= 7; d++){ const t = w[(d - 1) % n];
    out.push(d === 7 ? '**Día 7:** Simulacro completo (120 min) + revisar errores' : d === 4 ? `**Día 4:** Repaso de hoy (15 min) + Refuerzo IA: ${t} (30 min)` : `**Día ${d}:** Repaso de hoy (15 min) + Sprint: ${t} (30 min)`); }
  return out.join('\n') + `\n**Prioridad:** ${w.slice(0, 3).join(', ')}: pesan mucho en el examen y es donde más fallas.`;
}
async function askPlan(){
  const out = $('aiplan'), {pl, days, agg, weak, avg} = planInfo(), key = store.get('gkey'); out.hidden = false;
  const show = t => { out.innerHTML = fmt(t); store.set('enp-ai-plan', JSON.stringify({d:today(), text:t})); };
  const data = `Días para el examen: ${days === null ? 'sin fecha' : days}\nMeta: ${pl ? pl.goal : 'sin meta'}/120. Promedio de simulacros: ${avg === null ? 'sin simulacros' : avg.toFixed(1)}\nTemas más débiles:\n${weak.map(t => `- ${t}: ${agg[t] ? Math.round(agg[t].ok / agg[t].n * 100) + ' % de acierto' : 'sin datos'}, ≈ ${FREQ[t].toFixed(1)} preguntas por examen`).join('\n')}\nRepaso espaciado pendiente: ${dueList().length} preguntas\nTiempo disponible: 45 a 60 min al día\nHerramientas de la app: «Repaso de hoy», «Sprint: <tema>», «Refuerzo IA: <tema>», «Simulacro completo», «Diagnóstico».`;
  if (!key){ show(planOffline(days, weak)); return; }
  const ck = 'plan:' + hash(data + today() + modelId()), hit = store.get(ck); if (hit){ show(hit); return; }
  out.textContent = 'Armando tu plan…';
  try {
    const r = await fetch(geminiURL(), {method:'POST', headers:{'Content-Type':'application/json', 'x-goog-api-key':key},
      body:JSON.stringify({system_instruction:{parts:[{text:SYS_PLAN}]}, contents:[{role:'user', parts:[{text:data}]}], generationConfig:{temperature:.3, maxOutputTokens:700}})});
    const j = r.status === 429 ? {} : await r.json(), t = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (t){ store.set(ck, t); show(t); } else show(planOffline(days, weak));
  } catch { show(planOffline(days, weak)); }
}
async function geminiJSON(sys, user, schema, temp){
  let r;
  try {
    r = await fetch(geminiURL(), {method:'POST', headers:{'Content-Type':'application/json', 'x-goog-api-key':store.get('gkey')},
      body:JSON.stringify({system_instruction:{parts:[{text:sys}]}, contents:[{role:'user', parts:[{text:user}]}], generationConfig:{temperature:temp, maxOutputTokens:6000, responseMimeType:'application/json', responseSchema:schema}})});
  } catch (e) { const err = new Error('GEMINI_NETWORK: No se pudo conectar con Gemini. Revisa tu conexión.'); err.transient = true; throw err; }
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) {
    const detail = j.error?.message || `Gemini HTTP ${r.status}`;
    const err = new Error(`GEMINI_HTTP_${r.status}: ${detail}`);
    err.status = r.status;
    err.transient = [408, 500, 502, 503, 504].includes(r.status) || (r.status === 429 && /overload|high demand|temporar|busy|unavailable/i.test(detail));
    const retryAfter = Number(r.headers?.get?.('Retry-After'));
    if (retryAfter > 0) err.retryAfterMs = Math.min(retryAfter * 1000, 120000);
    throw err;
  }
  const t = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  if (!t) throw new Error(j.candidates?.[0]?.finishReason ? `Gemini no completó la respuesta (${j.candidates[0].finishReason})` : 'Gemini devolvió una respuesta vacía');
  try { return JSON.parse(t.replace(/^```json\s*|\s*```$/g, '').trim()); }
  catch { throw new Error('Gemini devolvió JSON incompleto o no válido'); }
}
/* Refuerzo: Gemini crea 3 preguntas nuevas del tema y luego las resuelve por separado; solo quedan las que coinciden con su clave */
const bankRefs = () => Object.values(BANK).filter(e => !e.ia).flatMap(e => e.qs.map(q => q.q));
const SYS_READ_FILL = `Eres autor de textos y preguntas de Competencia Lectora del examen ENP de Beca 18 (Perú), nivel secundaria. Escribe un texto ORIGINAL de 110 a 160 palabras con párrafos numerados y crea exactamente la cantidad de preguntas pedida, todas del tipo indicado (campo t igual al tipo). Cada pregunta: enunciado claro basado en el texto, EXACTAMENTE 4 alternativas distintas y no vacías, un único índice correcto a (0 a 3) y resolución r de 2 a 3 líneas con evidencia del texto. Sin «todas las anteriores». Español claro, sin LaTeX ni $.`;
/* Crea n preguntas nuevas de un tema, 100 % de IA (sin ejemplos del banco) y solo conserva las que una segunda resolución confirma */
async function aiFill(topic, n){
  const lect = BLK[topic] === 'l', guia = (THEORY[topic] && THEORY[topic].regla) || '', out = [];
  for (let round = 0; round < 3 && out.length < n; round++){
    const need = n - out.length;
    if (lect){
      const g = await geminiJSON(SYS_READ_FILL, `Tipo de pregunta: ${topic}. Guía: ${guia}\nCrea ${need} pregunta(s) de ese tipo (campo t = "${topic}") sobre un texto original nuevo, de un género a tu elección.`, L_SCHEMA, .7);
      const qs = (Array.isArray(g && g.preguntas) ? g.preguntas : []).filter(x => validExamQ(x, [topic]));
      if (!g || typeof g.texto !== 'string' || g.texto.length < 200 || !qs.length) continue;
      const sol = await geminiJSON(SYS_SOLVE, `Usa el texto para resolver. Devuelve un índice por pregunta, en orden.\nTexto:\n${g.texto}\n\n${qs.map((x, i) => `Pregunta ${i + 1}: ${fmtQx(x)}`).join('\n\n')}`, INT_SCHEMA, 0);
      const key = 'iaf' + Math.abs(hash(g.texto)), html = textHTML(g.texto, 'Texto generado por IA'); TEXTS[key] = html;
      qs.forEach((x, i) => { if (Array.isArray(sol) && sol[i] === x.a && out.length < n) out.push({...shuffleQ(x), t:topic, b:'l', tx:key, txh:html, ia:true}); });
    } else {
      const gen = (await geminiJSON(SYS_GEN, `Tema: ${topic}.\nGuía conceptual: ${guia}\nCrea ${need + 1} preguntas nuevas de nivel ENP, 100 % originales (no reproduzcas preguntas de exámenes oficiales). Sin figuras: todos los datos van en el enunciado.`, GEN_SCHEMA, .8)).filter(validQ);
      const refs = bankRefs().concat(out.map(x => x.q)), cand = gen.filter(x => !tooClose(x, refs)); if (!cand.length) continue;
      const sol = await geminiJSON(SYS_SOLVE, cand.map((x, i) => `Pregunta ${i + 1}: ${fmtQx(x)}`).join('\n\n'), INT_SCHEMA, 0);
      cand.forEach((x, i) => { if (Array.isArray(sol) && sol[i] === x.a && out.length < n) out.push({...shuffleQ(x), t:topic, b:'m', ia:true}); });
    }
  }
  if (out.length < n) throw new Error('POCAS');
  return out;
}
async function refuerzo(topic){
  if (!store.get('gkey')){ toast('Para generar ejercicios con IA, guarda tu clave gratuita de Gemini en ⚙ IA.'); return; }
  toast('Generando ejercicios de «' + topic + '»…');
  try { const qs = await aiFill(topic, 3); toast(''); S.qs = qs; S.name = 'Refuerzo IA: ' + topic; start('train'); }
  catch (e) { toast(e.status === 429 ? 'Llegaste al límite gratuito de Gemini. Espera un momento y toca 🧪 IA otra vez.' : 'La IA no logró crear ejercicios confiables esta vez. Toca 🧪 IA para generar de nuevo.'); }
}
