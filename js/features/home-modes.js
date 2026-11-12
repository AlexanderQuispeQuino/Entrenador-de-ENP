"use strict";
/* ============ 3. INICIO ============ */


function modePick(qs){
  S.qs = qs;
  $('v-prev').innerHTML = `<h1>${qs.length} preguntas</h1><p class="mut">Elige cómo practicar.</p>
  <div class="grid cols"><button class="card mode" data-a="start" data-v="train"><h3 style="margin:0;color:var(--ok)">💡 Entrenamiento</h3><p class="mut">Feedback inmediato con resolución paso a paso. Sin tiempo.</p></button>
  <button class="card mode" data-a="start" data-v="sim"><h3 style="margin:0;color:var(--brand)">⏱ Simulacro real · ${Math.max(5, 2*qs.length)} min</h3><p class="mut">Cronómetro estricto. Resultados solo al entregar.</p></button></div>
  <p><button class="btn" data-a="home">Volver</button></p>`;
  show('v-prev');
}
