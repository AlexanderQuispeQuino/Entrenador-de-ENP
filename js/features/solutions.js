"use strict";
/* ============ 20. SOLUCIONES PASO A PASO PRECALCULADAS (banco 2024 y 2025) ============
   Gemini redacta una vez la solución de cada pregunta con LaTeX y se guarda; después se muestra sin gastar cuota. Reanudable. */
const SOL = {run:false, stop:false};
const solTargets = () => Object.entries(BANK).filter(([, e]) => !e.ia).flatMap(([k, e]) => e.qs.map((q, i) => ({...q, id:k + ':' + i})));
const solStatus = () => { const t = solTargets(); return t.filter(q => store.get('sol2:' + q.id)).length + ' de ' + t.length + ' soluciones listas' + (store.get('gkey') ? '' : ' · necesitas tu clave de Gemini en ⚙ IA'); };
const solHTML = (q, fallback) => { const t = q.id && store.get('sol2:' + q.id); return t ? `<div class="aiout" style="margin:.6rem 0"><b>Resolución paso a paso</b>${fmt(t)}</div>` : `<p><b>Resolución:</b> ${rich(q.r || fallback)}</p>`; };
const SYS_SOL = `Eres un tutor de élite del examen ENP de Beca 18 (Perú). Escribe la solución como una mini clase para un estudiante que quiere APRENDER, no solo ver la respuesta. Español claro y cercano, nivel secundaria. Respeta la clave oficial; verifica dos veces cada cálculo. Usa Markdown y LaTeX ($...$ en línea y $$...$$ en bloque para los cálculos). Estructura exacta, con estos títulos:
### 🎯 Qué te piden
Reformula la pregunta con tus palabras y señala los datos útiles y los que sobran.
### 🧠 La idea clave
El concepto o propiedad que resuelve el problema, en 2 o 3 frases, con una imagen mental o analogía de la vida diaria.
### 🪜 Paso a paso
Lista numerada. Cada paso: título en **negrita**, qué haces y POR QUÉ lo haces, y el cálculo en su propia línea. Nada de saltos: muestra las operaciones intermedias. En lectura: cita la evidencia del texto y explica cómo sustenta la respuesta.
### ✅ Comprobación
Verifica el resultado de otra forma o reemplazando, y concluye con la alternativa correcta.
### ⚡ Atajo para el examen
Un método más rápido o una estimación para ahorrar tiempo, y cuándo conviene.
### 🪤 Por qué las otras alternativas engañan
Una línea por cada alternativa incorrecta: qué error de razonamiento o cálculo lleva a elegirla.
### 🎁 Truco para recordarlo
Una regla mnemotécnica o un patrón fácil de recordar.
### 🧪 Ponte a prueba
Un mini ejercicio parecido con otros datos (solo el enunciado); después escribe la línea @@RESPUESTA@@ y debajo su resolución breve.
Sin saludos ni frases motivacionales. Entre 450 y 650 palabras.`;
async function solOne(q){
  const txt = q.tx ? 'Texto de lectura:\n' + qText(q).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() + '\n\n' : '';
  const fg = q.f ? 'Datos de la figura:\n' + (q.f.rows ? q.f.rows.map(r => r.join(' | ')).join('\n') : 'Puntos de la gráfica (día, °C): ' + q.f.line.map(p => p.join(', ')).join('; ')) + '\n\n' : '';
  const user = `${txt}${fg}${q.alt ? 'Figura: ' + q.alt + '\n\n' : ''}Pregunta: ${q.q}\n${q.o.map((o, j) => L[j] + ') ' + o).join('\n')}\n\nClave oficial: ${L[q.a]}) ${q.o[q.a]}\nResolución oficial: ${q.r || '(no disponible)'}\nTema: ${q.t}.\nEscribe la clase completa con la estructura indicada; la respuesta correcta es la alternativa ${L[q.a]}.`;
  for (let k = 0; k < 4 && !SOL.stop; k++){
    try {
      const r = await fetch(geminiURL(), {method:'POST', headers:{'Content-Type':'application/json', 'x-goog-api-key':store.get('gkey')}, body:JSON.stringify({system_instruction:{parts:[{text:SYS_SOL}]}, contents:[{role:'user', parts:[{text:user}]}], generationConfig:{temperature:.3, maxOutputTokens:5000}})});
      if (r.status === 429 || r.status >= 500){ await sleep(10000 * (k + 1)); continue; }
      const t = (await r.json()).candidates?.[0]?.content?.parts?.map(x => x.text).join('') || ''; if (t.trim()) return t;
    } catch { await sleep(8000); }
  }
  return null;
}
const solFormatOK = t => !!t && t.length > 700 && /paso a paso/i.test(t) && /comprobaci/i.test(t) && /ponte a prueba/i.test(t);
const solGood = id => solFormatOK(store.get('sol2:' + id));
function solCardHTML(){
  const t = solTargets(), n = t.length, have = t.filter(q => store.get('sol2:' + q.id)).length, good = t.filter(q => solGood(q.id)).length, bad = have - good, miss = n - have, head = '<h3 style="margin:0">🧠 Soluciones paso a paso con IA</h3>';
  if (SOL.run) return head + `<p class="mut" id="solst">Generando… ${good} de ${n} listas</p><div class="bar"><i style="width:${Math.round(good / n * 100)}%"></i></div><div class="row" style="margin-top:.6rem"><button class="btn" data-a="stopsol">Pausar</button></div>`;
  if (!miss && !bad) return head + `<p style="color:var(--ok);margin:.4rem 0"><b>✅ Las ${n} soluciones están listas.</b></p><p class="mut" style="font-size:.85rem">Ya aparecen en la «Resolución» de cada pregunta, en el examen y en la revisión. No hace falta volver a generarlas.</p><div class="row"><button class="btn sm" data-a="solall">Volver a generar todas</button></div>`;
  return head + `<p class="mut" id="solst">${good} de ${n} listas${miss ? ' · faltan ' + miss : ''}${bad ? ' · ' + bad + ' con formato incompleto' : ''}${store.get('gkey') ? '' : ' · necesitas tu clave de Gemini en ⚙ IA'}</p><div class="row"><button class="btn pri" data-a="gensol">${good ? 'Continuar' : 'Generar'}${bad && !miss ? ' (' + bad + ' incompletas)' : ''}</button></div>`;
}
const refreshSol = () => { const c = $('solcard'); if (c) c.innerHTML = solCardHTML(); };
async function genSol(){
  if (SOL.run) return; if (!store.get('gkey')){ toast('Guarda tu clave gratuita de Gemini en ⚙ IA.'); return; }
  SOL.run = true; SOL.stop = false; refreshSol();
  for (const q of solTargets()){
    if (SOL.stop) break; if (solGood(q.id)) continue;
    const t = await solOne(q); if (t){ store.set('sol2:' + q.id, t); refreshSol(); await sleep(genDelay()); }
  }
  const paused = SOL.stop; SOL.run = false; refreshSol();
  toast(paused ? 'Generación en pausa.' : (solTargets().every(q => solGood(q.id)) ? '✅ Las soluciones están listas.' : 'Terminó, pero algunas no se pudieron completar: toca «Continuar».'));
}
registerIA(); renderBank();
