"use strict";
/* ============ 6. TUTOR IA ============
   - Gemini: llamada directa con tu clave gratuita de AI Studio.
   - ChatGPT gratis / Gemini web: no tienen API gratuita para navegador; copiamos el prompt y abrimos el chat. */
/* Instrucciones de sistema: estilo y reglas del tutor (Gemini las recibe aparte del mensaje) */
const SYS = `Eres un tutor experto de preparación para el examen ENP de Beca 18 (Perú). Explica al estudiante como un docente que desarrolla la solución en una pizarra, con pasos completos y ordenados. Español claro, nivel secundaria.
Reglas: prioriza la resolución oficial y la clave oficial; no las contradigas. No repitas literalmente la resolución: desarrolla el razonamiento con claridad. Para Matemática muestra todas las operaciones intermedias y explica por qué se hace cada una; si divides o multiplicas una inecuación por un número negativo, explica que se invierte el signo. Para Lectura cita la parte pertinente del texto y explica cómo sustenta la respuesta. No inventes datos ni el error del estudiante. Escribe como lo haría la app de Gemini, en Markdown limpio: una frase breve de apertura y luego una lista numerada de pasos (normalmente 3 a 6) con el título de cada paso en **negrita**; debajo de cada paso, la explicación y, si hay cálculo, la operación en su propia línea. Para todas las fórmulas y operaciones usa LaTeX: en línea con $...$ (por ejemplo $a_n = a_1 + (n-1)\\cdot r$) y en un bloque aparte con $$...$$ cuando sea un cálculo importante. No uses tablas salvo que ayuden de verdad.
Cierra con **Conclusión:** el resultado y por qué corresponde a la alternativa correcta. Añade **Tu error:** solo si falló o dejó en blanco (indícalo únicamente si puede deducirse; si no, aclara que no se conoce el error exacto) y **Truco para el examen:** con una recomendación concreta y breve.
Sin saludos, despedidas ni frases motivacionales. No incluyas otro ejercicio en esta explicación. Máximo 300 palabras.`;
function prompt(i, web){
  const q = S.qs[i], a = S.ans[i], opt = j => L[j] + ') ' + q.o[j];
  const txt = q.tx ? 'Texto de lectura:\n' + qText(q).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() + '\n\n' : '';
  const est = a === null ? 'no respondió' : a === q.a ? 'acertó con ' + opt(a) : 'marcó ' + opt(a) + ' (incorrecta)';
  return (web ? SYS + '\n\n' : '') + `${txt}${q.alt ? 'Figura: ' + q.alt + '\n\n' : ''}Pregunta: ${q.q}\n${q.o.map((_,j) => opt(j)).join('\n')}\n\nEstudiante: ${est}.\nClave oficial: ${q.a === null ? 'desconocida' : opt(q.a)}.\nResolución oficial: ${q.r || '(no disponible)'}\nTema: ${q.t}.`;
}
